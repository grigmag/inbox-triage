import { MailboxReaderError } from '@inbox-triage/email';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MailboxCredentialsRejectedError } from './mailbox-credentials-rejected-error';
import { readMailbox } from './read-mailbox';

const mocks = vi.hoisted(() => ({
  findForUser: vi.fn(),
  decrypt: vi.fn(),
  createMailboxReader: vi.fn(),
  close: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock(
  '@/features/settings/email-integration/repositories/email-connection.repository',
  () => ({
    emailConnectionRepository: { findForUser: mocks.findForUser },
  }),
);
vi.mock('@/lib/crypto/crypto.service', () => ({
  cryptoService: { decryptSignedString: mocks.decrypt },
}));
vi.mock('@inbox-triage/email', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@inbox-triage/email')>()),
  createMailboxReader: mocks.createMailboxReader,
}));

const connectionFailure = new MailboxReaderError('CONNECTION_FAILED', {
  providerErrorCode: 'ETIMEOUT',
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.findForUser.mockResolvedValue({
    provider: 'zoho',
    imapHost: 'imap.zoho.eu',
    smtpHost: 'smtp.zoho.eu',
    username: 'mailbox@example.com',
    encryptedPassword: 'encrypted-password',
  });
  mocks.decrypt.mockReturnValue('plaintext password');
  mocks.createMailboxReader.mockImplementation(() => ({ close: mocks.close }));
  mocks.close.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('readMailbox', () => {
  it('retries a connection failure once with a new reader after a delay', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(connectionFailure)
      .mockResolvedValueOnce('message');

    const result = readMailbox('local-user-id', operation);
    await vi.advanceTimersByTimeAsync(499);
    expect(operation).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);

    await expect(result).resolves.toEqual({
      status: 'success',
      data: 'message',
    });
    expect(mocks.findForUser).toHaveBeenCalledTimes(1);
    expect(mocks.createMailboxReader).toHaveBeenCalledTimes(2);
    expect(operation.mock.calls[0][0]).not.toBe(operation.mock.calls[1][0]);
    expect(mocks.close).toHaveBeenCalledTimes(2);
    expect(console.warn).toHaveBeenCalledWith(expect.any(String), {
      code: 'CONNECTION_FAILED',
      providerErrorCode: 'ETIMEOUT',
    });
    expect(console.error).not.toHaveBeenCalled();
  });

  it('logs and rethrows when the retry also fails', async () => {
    const operation = vi.fn().mockRejectedValue(connectionFailure);

    const result = readMailbox('local-user-id', operation);
    const rejection = expect(result).rejects.toBe(connectionFailure);
    await vi.runAllTimersAsync();
    await rejection;

    expect(operation).toHaveBeenCalledTimes(2);
    expect(mocks.close).toHaveBeenCalledTimes(2);
    expect(console.error).toHaveBeenCalledWith(expect.any(String), {
      code: 'CONNECTION_FAILED',
      providerErrorCode: 'ETIMEOUT',
    });
  });

  it.each([
    { provider: 'zoho', imapHost: 'imap.zoho.eu', smtpHost: 'smtp.zoho.eu' },
    { provider: 'gmail' },
  ] as const)(
    'rethrows rejected $provider credentials without retrying',
    async (row) => {
      mocks.findForUser.mockResolvedValue({
        ...row,
        username: 'mailbox@example.com',
        encryptedPassword: 'encrypted-password',
      });
      const error = new MailboxReaderError('AUTHENTICATION_FAILED');
      const operation = vi.fn().mockRejectedValue(error);

      const rejection = await readMailbox('local-user-id', operation).catch(
        (thrown: unknown) => thrown,
      );

      expect(rejection).toBeInstanceOf(MailboxCredentialsRejectedError);
      expect(rejection).toMatchObject({ provider: row.provider, cause: error });
      expect(operation).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledWith(expect.any(String), {
        code: 'AUTHENTICATION_FAILED',
      });
    },
  );

  it.each(['MESSAGE_NOT_FOUND', 'UNKNOWN'] as const)(
    'does not retry %s failures',
    async (code) => {
      const error = new MailboxReaderError(code);
      const operation = vi.fn().mockRejectedValue(error);

      await expect(readMailbox('local-user-id', operation)).rejects.toBe(error);

      expect(operation).toHaveBeenCalledTimes(1);
      expect(mocks.close).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledWith(expect.any(String), { code });
    },
  );

  it('does not retry application errors', async () => {
    const error = new RangeError('Invalid time value');
    const operation = vi.fn().mockRejectedValue(error);

    await expect(readMailbox('local-user-id', operation)).rejects.toBe(error);

    expect(operation).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(expect.any(String), error);
  });
});
