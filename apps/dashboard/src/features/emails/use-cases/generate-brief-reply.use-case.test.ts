import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BRIEF_REPLY_MAX_BODY_LENGTH } from '../brief-reply/brief-reply.config';
import {
  BriefReplyBodyTooLongError,
  BriefReplyInvalidOutputError,
  BriefReplyMailboxError,
  BriefReplyMissingTextError,
  BriefReplyProviderError,
} from '../brief-reply/brief-reply.errors';
import type { BriefReplyQuestion } from '../brief-reply/generate-brief-reply';
import { BRIEF_REVIEW_MAX_BODY_LENGTH } from '../brief-review/brief-review-v1.config';
import { generateBriefReplyUseCase } from './generate-brief-reply.use-case';

const mocks = vi.hoisted(() => ({
  findForUser: vi.fn(),
  decrypt: vi.fn(),
  createMailboxReader: vi.fn(),
  getMessage: vi.fn(),
  close: vi.fn(),
  generateBriefReply: vi.fn(),
  getCompanyProfile: vi.fn(),
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
vi.mock('@inbox-triage/email', () => ({
  createMailboxReader: mocks.createMailboxReader,
}));
vi.mock('../brief-reply/generate-brief-reply', () => ({
  generateBriefReply: mocks.generateBriefReply,
}));
vi.mock(
  '@/features/settings/company-profile/repositories/company-profile.repository',
  () => ({
    companyProfileRepository: { get: mocks.getCompanyProfile },
  }),
);

const questions: BriefReplyQuestion[] = [
  { fieldKey: 'timeline', question: 'When should the shoot take place?' },
];
const input = {
  userId: 'local-user-id',
  messageRef: 'opaque-message-ref',
  language: 'en',
  questions,
} as const;
const message = {
  ref: 'opaque-message-ref',
  messageId: 'private-message-id',
  inReplyTo: [],
  references: [],
  from: [{ name: 'Sender', address: 'sender@example.com' }],
  to: [{ name: null, address: 'studio@example.com' }],
  cc: [],
  replyTo: [],
  subject: 'Product launch',
  receivedAt: new Date('2026-09-22T08:30:00.000Z'),
  sentAt: new Date('2026-09-22T08:29:00.000Z'),
  isRead: false,
  sizeBytes: 100,
  text: '  We need ten product photographs.\n\n> quoted history\n',
  html: '<p>private HTML</p>',
};
const emptyProfile = {
  name: null,
  address: null,
  postalCode: null,
  city: null,
  phone: null,
  email: null,
  updatedAt: null,
};
const metadata = {
  configuredModelId: 'configured-model',
  responseModelId: 'response-model',
  usage: null,
  finishReason: 'stop',
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.findForUser.mockResolvedValue({
    userId: 'local-user-id',
    provider: 'zoho',
    imapHost: 'imap.zoho.eu',
    smtpHost: 'smtp.zoho.eu',
    username: 'mailbox@example.com',
    encryptedPassword: 'encrypted-password',
  });
  mocks.decrypt.mockReturnValue('plaintext password');
  mocks.createMailboxReader.mockReturnValue({
    getMessage: mocks.getMessage,
    close: mocks.close,
  });
  mocks.getMessage.mockResolvedValue(message);
  mocks.close.mockResolvedValue(undefined);
  mocks.generateBriefReply.mockResolvedValue({
    body: 'Hello,\n\nThanks.',
    metadata,
  });
  mocks.getCompanyProfile.mockResolvedValue(emptyProfile);
});

describe('generateBriefReplyUseCase', () => {
  it('reads the referenced message for the user and closes the client before generating', async () => {
    await expect(generateBriefReplyUseCase(input)).resolves.toStrictEqual({
      status: 'success',
      data: { body: 'Hello,\n\nThanks.' },
    });

    expect(mocks.findForUser).toHaveBeenCalledExactlyOnceWith('local-user-id');
    expect(mocks.getMessage).toHaveBeenCalledExactlyOnceWith(
      'opaque-message-ref',
    );
    expect(mocks.close.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.generateBriefReply.mock.invocationCallOrder[0],
    );
  });

  it('passes the mailbox subject and unchanged body with the supplied language and questions', async () => {
    await generateBriefReplyUseCase(input);

    expect(mocks.generateBriefReply).toHaveBeenCalledExactlyOnceWith({
      subject: 'Product launch',
      body: message.text,
      language: 'en',
      questions,
    });
  });

  it('returns noConnection without generating', async () => {
    mocks.findForUser.mockResolvedValue(null);

    await expect(generateBriefReplyUseCase(input)).resolves.toEqual({
      status: 'noConnection',
    });
    expect(mocks.generateBriefReply).not.toHaveBeenCalled();
  });

  it.each([
    ['message read', () => mocks.getMessage.mockRejectedValue(new Error('x'))],
    ['cleanup', () => mocks.close.mockRejectedValue(new Error('x'))],
    ['connection', () => mocks.findForUser.mockRejectedValue(new Error('x'))],
  ])(
    'translates a %s failure into a mailbox error without generating',
    async (_stage, fail) => {
      fail();

      await expect(generateBriefReplyUseCase(input)).rejects.toBeInstanceOf(
        BriefReplyMailboxError,
      );
      expect(mocks.generateBriefReply).not.toHaveBeenCalled();
    },
  );

  it.each([null, '', ' \n\t '])(
    'rejects absent plain text %j before generating',
    async (text) => {
      mocks.getMessage.mockResolvedValue({ ...message, text });

      await expect(generateBriefReplyUseCase(input)).rejects.toBeInstanceOf(
        BriefReplyMissingTextError,
      );
      expect(mocks.generateBriefReply).not.toHaveBeenCalled();
    },
  );

  it('rejects an oversized body before generating', async () => {
    mocks.getMessage.mockResolvedValue({
      ...message,
      text: 'a'.repeat(BRIEF_REVIEW_MAX_BODY_LENGTH + 1),
    });

    await expect(generateBriefReplyUseCase(input)).rejects.toBeInstanceOf(
      BriefReplyBodyTooLongError,
    );
    expect(mocks.generateBriefReply).not.toHaveBeenCalled();
  });

  it('accepts a body at the length limit', async () => {
    const text = 'a'.repeat(BRIEF_REVIEW_MAX_BODY_LENGTH);
    mocks.getMessage.mockResolvedValue({ ...message, text });

    await expect(generateBriefReplyUseCase(input)).resolves.toMatchObject({
      status: 'success',
    });
    expect(mocks.generateBriefReply).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ body: text }),
    );
  });

  it('appends the company footer below the generated body', async () => {
    mocks.getCompanyProfile.mockResolvedValue({
      ...emptyProfile,
      name: 'Northlight Studio',
      email: 'hello@northlight.example',
    });

    await expect(generateBriefReplyUseCase(input)).resolves.toStrictEqual({
      status: 'success',
      data: {
        body: 'Hello,\n\nThanks.\n\nNorthlight Studio\nhello@northlight.example',
      },
    });
  });

  it('accepts a body and footer at the length limit', async () => {
    const footer = 'Northlight Studio';
    const body = 'a'.repeat(BRIEF_REPLY_MAX_BODY_LENGTH - footer.length - 2);
    mocks.generateBriefReply.mockResolvedValue({ body, metadata });
    mocks.getCompanyProfile.mockResolvedValue({
      ...emptyProfile,
      name: footer,
    });

    await expect(generateBriefReplyUseCase(input)).resolves.toStrictEqual({
      status: 'success',
      data: { body: `${body}\n\n${footer}` },
    });
  });

  it('rejects a body and footer over the length limit with the run metadata', async () => {
    const footer = 'Northlight Studio';
    mocks.generateBriefReply.mockResolvedValue({
      body: 'a'.repeat(BRIEF_REPLY_MAX_BODY_LENGTH - footer.length - 1),
      metadata,
    });
    mocks.getCompanyProfile.mockResolvedValue({
      ...emptyProfile,
      name: footer,
    });

    const error = await generateBriefReplyUseCase(input).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(BriefReplyInvalidOutputError);
    expect((error as BriefReplyInvalidOutputError).metadata).toBe(metadata);
  });

  it('propagates generator errors', async () => {
    const error = new BriefReplyProviderError();
    mocks.generateBriefReply.mockRejectedValue(error);

    await expect(generateBriefReplyUseCase(input)).rejects.toBe(error);
  });
});
