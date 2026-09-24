import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  transportConfig: vi.fn(),
  send: vi.fn(),
  close: vi.fn(),
}));

vi.mock('./smtp/nodemailer-smtp-transport', () => ({
  NodemailerSmtpTransport: class {
    readonly send = mocks.send;
    readonly close = mocks.close;

    constructor(config: unknown) {
      mocks.transportConfig(config);
    }
  },
}));

import { createEmailSender } from './create-email-sender';

describe('createEmailSender', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.send.mockResolvedValue({
      messageId: '<new@example.com>',
      acceptedRecipients: ['person@example.com'],
      rejectedRecipients: [],
    });
  });

  it('creates the Zoho transport lazily with fixed TLS and port', async () => {
    const sender = createEmailSender({
      provider: 'zoho',
      smtpHost: 'SMTP.arbitrary.example',
      credentials: {
        username: 'studio@example.com',
        password: ' exact password ',
      },
    });
    expect(mocks.transportConfig).not.toHaveBeenCalled();

    await sender.send({
      to: [{ name: null, address: 'person@example.com' }],
      text: 'Hello',
    });

    expect(mocks.transportConfig).toHaveBeenCalledExactlyOnceWith({
      host: 'SMTP.arbitrary.example',
      port: 465,
      secure: true,
      username: 'studio@example.com',
      password: ' exact password ',
    });
  });

  it('does not construct the transport for invalid input', async () => {
    const sender = createEmailSender({
      provider: 'zoho',
      smtpHost: 'smtp.zoho.com',
      credentials: {
        username: 'studio@example.com',
        password: 'password',
      },
    });

    await expect(sender.send({ text: 'Hello' })).rejects.toMatchObject({
      code: 'INVALID_MESSAGE',
    });
    expect(mocks.transportConfig).not.toHaveBeenCalled();
  });

  it('submits replies through the lazily created Zoho transport', async () => {
    const sender = createEmailSender({
      provider: 'zoho',
      smtpHost: 'smtp.zoho.com',
      credentials: {
        username: 'studio@example.com',
        password: 'password',
      },
    });

    await sender.reply(
      {
        ref: 'opaque-reference',
        from: [{ name: null, address: 'author@example.com' }],
        subject: 'Original subject',
        receivedAt: new Date('2026-01-01T12:00:00Z'),
        isRead: true,
        sizeBytes: 100,
        messageId: '<parent@example.com>',
        inReplyTo: [],
        references: [],
        to: [{ name: null, address: 'studio@example.com' }],
        cc: [],
        replyTo: [],
        sentAt: new Date('2026-01-01T11:59:00Z'),
        text: 'Original body',
        html: null,
      },
      { text: 'Reply body' },
    );

    expect(mocks.transportConfig).toHaveBeenCalledOnce();
    expect(mocks.send).toHaveBeenCalledExactlyOnceWith({
      from: 'studio@example.com',
      envelope: {
        from: 'studio@example.com',
        to: ['author@example.com'],
      },
      to: [{ name: null, address: 'author@example.com' }],
      cc: undefined,
      bcc: undefined,
      subject: 'Re: Original subject',
      text: 'Reply body',
      html: undefined,
      inReplyTo: '<parent@example.com>',
      references: ['<parent@example.com>'],
    });
  });
});
