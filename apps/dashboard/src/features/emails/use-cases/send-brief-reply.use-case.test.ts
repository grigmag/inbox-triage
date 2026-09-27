import { EmailSenderError } from '@inbox-triage/email';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BriefReplyMailboxError,
  BriefReplySendFailedError,
  BriefReplySendUnconfirmedError,
} from '../brief-reply/brief-reply.errors';
import { sendBriefReplyUseCase } from './send-brief-reply.use-case';

const mocks = vi.hoisted(() => ({
  findForUser: vi.fn(),
  decrypt: vi.fn(),
  createMailboxReader: vi.fn(),
  getMessage: vi.fn(),
  closeReader: vi.fn(),
  createEmailSender: vi.fn(),
  reply: vi.fn(),
  closeSender: vi.fn(),
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
  createEmailSender: mocks.createEmailSender,
}));

const body =
  '\nHello Maria,\n\nWhen should the shoot take place?\n\nKind regards,\n';
const input = {
  userId: 'local-user-id',
  messageRef: 'opaque-message-ref',
  body,
};
const connection = {
  userId: 'local-user-id',
  provider: 'zoho',
  imapHost: 'imap.zoho.eu',
  smtpHost: 'smtp.zoho.eu',
  username: 'mailbox@example.com',
  encryptedPassword: 'encrypted-password',
};
const message = {
  ref: 'opaque-message-ref',
  messageId: '<parent@example.com>',
  inReplyTo: [],
  references: [],
  from: [{ name: 'Maria', address: 'client@example.com' }],
  to: [{ name: null, address: 'studio@example.com' }],
  cc: [],
  replyTo: [],
  subject: 'Product launch',
  receivedAt: new Date('2026-09-22T08:30:00.000Z'),
  sentAt: new Date('2026-09-22T08:29:00.000Z'),
  isRead: false,
  sizeBytes: 100,
  text: 'We need ten product photographs.',
  html: null,
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.findForUser.mockResolvedValue(connection);
  mocks.decrypt.mockReturnValue('plaintext password');
  mocks.createMailboxReader.mockReturnValue({
    getMessage: mocks.getMessage,
    close: mocks.closeReader,
  });
  mocks.getMessage.mockResolvedValue(message);
  mocks.closeReader.mockResolvedValue(undefined);
  mocks.createEmailSender.mockReturnValue({
    reply: mocks.reply,
    close: mocks.closeSender,
  });
  mocks.reply.mockResolvedValue({
    messageId: '<reply@example.com>',
    acceptedRecipients: ['client@example.com'],
    rejectedRecipients: ['other@example.com'],
    quotedParent: true,
  });
  mocks.closeSender.mockResolvedValue(undefined);
});

describe('sendBriefReplyUseCase', () => {
  it('sends exactly one reply that quotes the original', async () => {
    await expect(sendBriefReplyUseCase(input)).resolves.toEqual({
      status: 'success',
      data: {
        acceptedRecipients: ['client@example.com'],
        rejectedRecipients: ['other@example.com'],
        quotedOriginal: true,
      },
    });

    expect(mocks.getMessage).toHaveBeenCalledExactlyOnceWith(
      'opaque-message-ref',
    );
    expect(mocks.reply).toHaveBeenCalledExactlyOnceWith(message, {
      text: body,
      quoteParent: true,
    });
    expect(mocks.closeSender).toHaveBeenCalledTimes(1);
  });

  it('reports an original the sender left out', async () => {
    mocks.reply.mockResolvedValue({
      messageId: '<reply@example.com>',
      acceptedRecipients: ['client@example.com'],
      rejectedRecipients: [],
      quotedParent: false,
    });

    await expect(sendBriefReplyUseCase(input)).resolves.toMatchObject({
      status: 'success',
      data: { quotedOriginal: false },
    });
  });

  it('closes the mailbox before submitting the reply', async () => {
    await sendBriefReplyUseCase(input);

    expect(mocks.closeReader.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.reply.mock.invocationCallOrder[0],
    );
  });

  it('returns noConnection without sending', async () => {
    mocks.findForUser.mockResolvedValue(null);

    await expect(sendBriefReplyUseCase(input)).resolves.toEqual({
      status: 'noConnection',
    });
    expect(mocks.createEmailSender).not.toHaveBeenCalled();
  });

  it('returns noConnection when the connection is removed before sending', async () => {
    mocks.findForUser
      .mockResolvedValueOnce(connection)
      .mockResolvedValueOnce(null);

    await expect(sendBriefReplyUseCase(input)).resolves.toEqual({
      status: 'noConnection',
    });
    expect(mocks.createEmailSender).not.toHaveBeenCalled();
  });

  it('translates a mailbox failure into a mailbox error without sending', async () => {
    mocks.getMessage.mockRejectedValue(new Error('message not found'));

    await expect(sendBriefReplyUseCase(input)).rejects.toBeInstanceOf(
      BriefReplyMailboxError,
    );
    expect(mocks.createEmailSender).not.toHaveBeenCalled();
  });

  it.each([
    'AUTHENTICATION_FAILED',
    'ENVELOPE_REJECTED',
    'INVALID_MESSAGE',
    'REPLY_MESSAGE_ID_MISSING',
    'REPLY_RECIPIENT_MISSING',
  ] as const)('reports %s as not sent', async (code) => {
    mocks.reply.mockRejectedValue(new EmailSenderError(code));

    const rejection = await sendBriefReplyUseCase(input).catch(
      (error: unknown) => error,
    );

    expect(rejection).toBeInstanceOf(BriefReplySendFailedError);
    expect(rejection).not.toBeInstanceOf(BriefReplySendUnconfirmedError);
    expect(mocks.reply).toHaveBeenCalledTimes(1);
    expect(mocks.closeSender).toHaveBeenCalledTimes(1);
  });

  it.each(['CONNECTION_FAILED', 'SEND_FAILED'] as const)(
    'reports %s as unconfirmed without retrying',
    async (code) => {
      mocks.reply.mockRejectedValue(new EmailSenderError(code));

      await expect(sendBriefReplyUseCase(input)).rejects.toBeInstanceOf(
        BriefReplySendUnconfirmedError,
      );
      expect(mocks.reply).toHaveBeenCalledTimes(1);
      expect(mocks.closeSender).toHaveBeenCalledTimes(1);
    },
  );

  it('reports a failure before submission as not sent', async () => {
    mocks.decrypt
      .mockReturnValueOnce('plaintext password')
      .mockImplementationOnce(() => {
        throw new Error('invalid signature');
      });

    await expect(sendBriefReplyUseCase(input)).rejects.toBeInstanceOf(
      BriefReplySendFailedError,
    );
    expect(mocks.createEmailSender).not.toHaveBeenCalled();
  });
});
