import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SmtpTransportError } from './smtp-transport.types';

const mocks = vi.hoisted(() => ({
  createTransport: vi.fn(),
  sendMail: vi.fn(),
  verify: vi.fn(),
  close: vi.fn(),
}));

vi.mock('nodemailer', () => ({
  default: {
    createTransport: mocks.createTransport,
  },
}));

import { NodemailerSmtpTransport } from './nodemailer-smtp-transport';

describe('NodemailerSmtpTransport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createTransport.mockReturnValue({
      sendMail: mocks.sendMail,
      verify: mocks.verify,
      close: mocks.close,
    });
  });

  it('uses the fixed secure SMTP configuration without pooling or logging', () => {
    createTransport();

    expect(mocks.createTransport).toHaveBeenCalledExactlyOnceWith({
      host: 'smtp.zoho.eu',
      port: 465,
      secure: true,
      pool: false,
      auth: {
        user: 'studio@example.com',
        pass: ' exact password ',
      },
      tls: {
        rejectUnauthorized: true,
      },
      logger: false,
      debug: false,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 30_000,
    });
  });

  it('maps package addresses and strips provider response data', async () => {
    mocks.sendMail.mockResolvedValue({
      messageId: '<new@example.com>',
      accepted: [
        'one@example.com',
        { name: 'Two', address: 'two@example.com' },
      ],
      rejected: [{ name: 'Three', address: 'three@example.com' }],
      response: 'sensitive provider response',
    });
    const transport = createTransport();

    await expect(
      transport.send({
        from: 'studio@example.com',
        envelope: { from: 'studio@example.com', to: ['one@example.com'] },
        to: [{ name: null, address: 'one@example.com' }],
        replyTo: [{ name: 'Studio', address: 'reply@example.com' }],
        text: 'Hello',
        inReplyTo: '<parent@example.com>',
        references: ['<root@example.com>', '<parent@example.com>'],
      }),
    ).resolves.toEqual({
      messageId: '<new@example.com>',
      acceptedRecipients: ['one@example.com', 'two@example.com'],
      rejectedRecipients: ['three@example.com'],
    });
    expect(mocks.sendMail).toHaveBeenCalledExactlyOnceWith({
      from: 'studio@example.com',
      envelope: { from: 'studio@example.com', to: ['one@example.com'] },
      to: [{ name: undefined, address: 'one@example.com' }],
      replyTo: [{ name: 'Studio', address: 'reply@example.com' }],
      text: 'Hello',
      inReplyTo: '<parent@example.com>',
      references: ['<root@example.com>', '<parent@example.com>'],
      cc: undefined,
      bcc: undefined,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
  });

  it('passes only mapped message fields to Nodemailer', async () => {
    mocks.sendMail.mockResolvedValue({
      messageId: '<new@example.com>',
      accepted: ['one@example.com'],
      rejected: [],
    });
    const message = {
      from: 'studio@example.com',
      envelope: { from: 'studio@example.com', to: ['one@example.com'] },
      to: [{ name: null, address: 'one@example.com' }],
      text: 'Hello',
      raw: 'From: spoof@example.com\r\n\r\nSpoofed',
    };

    await createTransport().send(message);

    const [options] = mocks.sendMail.mock.calls[0];
    expect(options).not.toHaveProperty('raw');
    expect(options).toMatchObject({
      from: 'studio@example.com',
      disableFileAccess: true,
      disableUrlAccess: true,
    });
  });

  it.each([
    ['EAUTH', 'authentication'],
    ['ECONNECTION', 'connection'],
    ['ECONNREFUSED', 'connection'],
    ['ECONNRESET', 'connection'],
    ['EHOSTUNREACH', 'connection'],
    ['ENETUNREACH', 'connection'],
    ['ENOTFOUND', 'connection'],
    ['ESOCKET', 'connection'],
    ['ETIMEDOUT', 'connection'],
    ['EAI_AGAIN', 'connection'],
    ['EENVELOPE', 'envelope'],
    ['EMESSAGE', 'unknown'],
  ] as const)(
    'classifies %s without exposing its message',
    async (code, kind) => {
      mocks.sendMail.mockRejectedValue(
        Object.assign(new Error('sensitive provider response'), { code }),
      );
      const transport = createTransport();

      await expect(
        transport.send({
          from: 'studio@example.com',
          envelope: { from: 'studio@example.com', to: ['one@example.com'] },
          to: [{ name: null, address: 'one@example.com' }],
          text: 'Hello',
        }),
      ).rejects.toEqual(new SmtpTransportError(kind));
    },
  );

  it('verifies the SMTP login without sending a message', async () => {
    mocks.verify.mockResolvedValue(true);

    await expect(createTransport().verify()).resolves.toBeUndefined();

    expect(mocks.verify).toHaveBeenCalledOnce();
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });

  it.each([
    ['EAUTH', 'authentication'],
    ['ETIMEDOUT', 'connection'],
    ['EPROTOCOL', 'unknown'],
  ] as const)(
    'classifies a %s verify failure without exposing its message',
    async (code, kind) => {
      mocks.verify.mockRejectedValue(
        Object.assign(new Error('sensitive provider response'), { code }),
      );

      await expect(createTransport().verify()).rejects.toEqual(
        new SmtpTransportError(kind),
      );
    },
  );

  it('closes Nodemailer', () => {
    const transport = createTransport();

    transport.close();

    expect(mocks.close).toHaveBeenCalledOnce();
  });
});

function createTransport(): NodemailerSmtpTransport {
  return new NodemailerSmtpTransport({
    host: 'smtp.zoho.eu',
    port: 465,
    secure: true,
    username: 'studio@example.com',
    password: ' exact password ',
  });
}
