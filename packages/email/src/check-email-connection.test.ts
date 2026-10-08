import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ImapTransportError } from './imap/imap-transport.types';
import { SmtpTransportError } from './smtp/smtp-transport.types';

const mocks = vi.hoisted(() => ({
  imapConfig: vi.fn(),
  smtpConfig: vi.fn(),
  connect: vi.fn(),
  logout: vi.fn(),
  forceClose: vi.fn(),
  verify: vi.fn(),
  close: vi.fn(),
}));

vi.mock('./imap/imapflow-transport', () => ({
  ImapFlowTransport: class {
    connect = mocks.connect;
    logout = mocks.logout;
    forceClose = mocks.forceClose;
    constructor(config: unknown) {
      mocks.imapConfig(config);
    }
  },
}));
vi.mock('./smtp/nodemailer-smtp-transport', () => ({
  NodemailerSmtpTransport: class {
    verify = mocks.verify;
    close = mocks.close;
    constructor(config: unknown) {
      mocks.smtpConfig(config);
    }
  },
}));

import { checkEmailConnection } from './check-email-connection';

const credentials = {
  username: 'studio@example.com',
  password: 'abcdefghijklmnop',
};
const gmail = { provider: 'gmail' as const, credentials };
const zoho = {
  provider: 'zoho' as const,
  imapHost: 'imap.zoho.eu',
  smtpHost: 'smtp.zoho.eu',
  credentials,
};

describe('checkEmailConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.connect.mockResolvedValue(undefined);
    mocks.logout.mockResolvedValue(undefined);
    mocks.verify.mockResolvedValue(undefined);
  });

  it('logs in over IMAP, logs out, then verifies SMTP on the Gmail hosts', async () => {
    await expect(checkEmailConnection(gmail)).resolves.toEqual({
      status: 'verified',
    });

    expect(mocks.imapConfig).toHaveBeenCalledExactlyOnceWith({
      host: 'imap.gmail.com',
      port: 993,
      secure: true,
      ...credentials,
    });
    expect(mocks.smtpConfig).toHaveBeenCalledExactlyOnceWith({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      ...credentials,
    });
    expect(mocks.logout.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.verify.mock.invocationCallOrder[0],
    );
    expect(mocks.close).toHaveBeenCalledOnce();
  });

  it('uses the configured Zoho hosts', async () => {
    await expect(checkEmailConnection(zoho)).resolves.toEqual({
      status: 'verified',
    });

    expect(mocks.imapConfig).toHaveBeenCalledWith(
      expect.objectContaining({ host: 'imap.zoho.eu', port: 993 }),
    );
    expect(mocks.smtpConfig).toHaveBeenCalledWith(
      expect.objectContaining({ host: 'smtp.zoho.eu', port: 465 }),
    );
  });

  it.each(['authentication', 'connection', 'unknown'] as const)(
    'reports an IMAP %s failure without checking SMTP',
    async (kind) => {
      mocks.connect.mockRejectedValue(new ImapTransportError(kind));

      const result = await checkEmailConnection(gmail);

      expect(result).toEqual({ status: 'failed', reason: kind });
      expect(mocks.forceClose).toHaveBeenCalledOnce();
      expect(mocks.verify).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['authentication', 'authentication'],
    ['connection', 'connection'],
    ['envelope', 'unknown'],
    ['unknown', 'unknown'],
  ] as const)(
    'reports an SMTP %s failure after closing both connections',
    async (kind, reason) => {
      mocks.verify.mockRejectedValue(new SmtpTransportError(kind));

      await expect(checkEmailConnection(zoho)).resolves.toEqual({
        status: 'failed',
        reason,
      });
      expect(mocks.logout).toHaveBeenCalledOnce();
      expect(mocks.close).toHaveBeenCalledOnce();
    },
  );

  it('treats an unexpected error as unknown without exposing it', async () => {
    mocks.connect.mockRejectedValue(
      new Error('sensitive provider response abcdefghijklmnop'),
    );

    await expect(checkEmailConnection(gmail)).resolves.toEqual({
      status: 'failed',
      reason: 'unknown',
    });
  });

  it('still verifies SMTP when the IMAP logout fails after a login', async () => {
    mocks.logout.mockRejectedValue(new ImapTransportError('connection'));

    await expect(checkEmailConnection(gmail)).resolves.toEqual({
      status: 'verified',
    });
    expect(mocks.forceClose).toHaveBeenCalledOnce();
    expect(mocks.verify).toHaveBeenCalledOnce();
  });

  it('preserves the authentication result when IMAP cleanup throws', async () => {
    mocks.connect.mockRejectedValue(new ImapTransportError('authentication'));
    mocks.forceClose.mockImplementationOnce(() => {
      throw new Error('Connection already closed');
    });

    await expect(checkEmailConnection(gmail)).resolves.toEqual({
      status: 'failed',
      reason: 'authentication',
    });
    expect(mocks.forceClose).toHaveBeenCalledOnce();
    expect(mocks.verify).not.toHaveBeenCalled();
  });

  it('preserves the authentication result when SMTP cleanup throws', async () => {
    mocks.verify.mockRejectedValue(new SmtpTransportError('authentication'));
    mocks.close.mockImplementationOnce(() => {
      throw new Error('Connection already closed');
    });

    await expect(checkEmailConnection(gmail)).resolves.toEqual({
      status: 'failed',
      reason: 'authentication',
    });
    expect(mocks.logout).toHaveBeenCalledOnce();
    expect(mocks.close).toHaveBeenCalledOnce();
  });
});
