import { EmailSenderError } from '@inbox-triage/email';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sendEmailReply } from './send-email-reply';

const mocks = vi.hoisted(() => ({
  findForUser: vi.fn(),
  decrypt: vi.fn(),
  createEmailSender: vi.fn(),
  reply: vi.fn(),
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
  createEmailSender: mocks.createEmailSender,
}));

type Parent = Parameters<typeof sendEmailReply>[1];

const parent = { messageId: '<parent@example.com>' } as Parent;
const sendResult = {
  messageId: '<reply@example.com>',
  acceptedRecipients: ['client@example.com'],
  rejectedRecipients: [],
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.findForUser.mockResolvedValue({
    provider: 'zoho',
    imapHost: 'imap.zoho.eu',
    smtpHost: 'smtp.zoho.eu',
    username: 'mailbox@example.com',
    encryptedPassword: 'encrypted-password',
  });
  mocks.decrypt.mockReturnValue('plaintext password');
  mocks.createEmailSender.mockReturnValue({
    reply: mocks.reply,
    close: mocks.close,
  });
  mocks.reply.mockResolvedValue(sendResult);
  mocks.close.mockResolvedValue(undefined);
});

describe('sendEmailReply', () => {
  it('sends one reply with the stored SMTP host and decrypted password, then closes', async () => {
    await expect(
      sendEmailReply('local-user-id', parent, { text: 'Hello' }),
    ).resolves.toEqual({ status: 'success', data: sendResult });

    expect(mocks.findForUser).toHaveBeenCalledExactlyOnceWith('local-user-id');
    expect(mocks.decrypt).toHaveBeenCalledExactlyOnceWith('encrypted-password');
    expect(mocks.createEmailSender).toHaveBeenCalledExactlyOnceWith({
      provider: 'zoho',
      smtpHost: 'smtp.zoho.eu',
      credentials: {
        username: 'mailbox@example.com',
        password: 'plaintext password',
      },
      timezone: 'Europe/Athens',
    });
    expect(mocks.reply).toHaveBeenCalledExactlyOnceWith(parent, {
      text: 'Hello',
    });
    expect(mocks.close).toHaveBeenCalledTimes(1);
    expect(mocks.close.mock.invocationCallOrder[0]).toBeGreaterThan(
      mocks.reply.mock.invocationCallOrder[0],
    );
  });

  it('returns noConnection without creating a sender', async () => {
    mocks.findForUser.mockResolvedValue(null);

    await expect(
      sendEmailReply('local-user-id', parent, { text: 'Hello' }),
    ).resolves.toEqual({ status: 'noConnection' });
    expect(mocks.createEmailSender).not.toHaveBeenCalled();
  });

  it.each([
    'CONNECTION_FAILED',
    'SEND_FAILED',
    'AUTHENTICATION_FAILED',
  ] as const)(
    'does not retry %s, closes the sender, and logs only the code',
    async (code) => {
      const error = new EmailSenderError(code);
      mocks.reply.mockRejectedValue(error);

      await expect(
        sendEmailReply('local-user-id', parent, { text: 'Hello' }),
      ).rejects.toBe(error);

      expect(mocks.createEmailSender).toHaveBeenCalledTimes(1);
      expect(mocks.reply).toHaveBeenCalledTimes(1);
      expect(mocks.close).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledExactlyOnceWith(
        expect.any(String),
        {
          code,
        },
      );
    },
  );

  it('rethrows connection loading failures without creating a sender', async () => {
    const error = new Error('database unavailable');
    mocks.findForUser.mockRejectedValue(error);

    await expect(
      sendEmailReply('local-user-id', parent, { text: 'Hello' }),
    ).rejects.toBe(error);
    expect(mocks.createEmailSender).not.toHaveBeenCalled();
  });
});
