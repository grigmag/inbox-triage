import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BRIEF_REVIEW_MAX_BODY_LENGTH } from '../brief-review/brief-review-v1.config';
import {
  BriefReviewBodyTooLongError,
  BriefReviewMailboxError,
  BriefReviewMissingTextError,
  BriefReviewProviderError,
} from '../brief-review/brief-review.errors';
import { reviewEmailUseCase } from './review-email.use-case';

const mocks = vi.hoisted(() => ({
  findForUser: vi.fn(),
  decrypt: vi.fn(),
  createMailboxReader: vi.fn(),
  getMessage: vi.fn(),
  close: vi.fn(),
  evaluateBrief: vi.fn(),
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
vi.mock('../brief-review/evaluate-brief', () => ({
  evaluateBrief: mocks.evaluateBrief,
}));

const input = { userId: 'local-user-id', messageRef: 'opaque-message-ref' };
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
  text: '  We need ten product photographs next Friday.\n\n> quoted history\n',
  html: '<p>private HTML</p>',
};
const evaluation = { outcome: 'irrelevant' };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.findForUser.mockResolvedValue({
    userId: 'local-user-id',
    provider: 'zoho',
    imapHost: 'imap.zoho.eu',
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
  mocks.evaluateBrief.mockResolvedValue({
    data: evaluation,
    metadata: {
      configuredModelId: 'test-model',
      responseModelId: null,
      attempts: [],
    },
  });
});

describe('reviewEmailUseCase', () => {
  it('reads the referenced message for the user and closes the client before evaluating', async () => {
    await expect(reviewEmailUseCase(input)).resolves.toEqual({
      status: 'success',
      data: evaluation,
    });

    expect(mocks.findForUser).toHaveBeenCalledExactlyOnceWith('local-user-id');
    expect(mocks.getMessage).toHaveBeenCalledExactlyOnceWith(
      'opaque-message-ref',
    );
    expect(mocks.close.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.evaluateBrief.mock.invocationCallOrder[0],
    );
  });

  it('passes only the subject, received date, and unchanged body to the evaluator', async () => {
    await reviewEmailUseCase(input);

    expect(mocks.evaluateBrief).toHaveBeenCalledExactlyOnceWith({
      subject: 'Product launch',
      receivedAt: message.receivedAt,
      body: message.text,
    });
  });

  it('returns noConnection without evaluating', async () => {
    mocks.findForUser.mockResolvedValue(null);

    await expect(reviewEmailUseCase(input)).resolves.toEqual({
      status: 'noConnection',
    });
    expect(mocks.evaluateBrief).not.toHaveBeenCalled();
  });

  it.each([
    ['message read', () => mocks.getMessage.mockRejectedValue(new Error('x'))],
    ['cleanup', () => mocks.close.mockRejectedValue(new Error('x'))],
    ['connection', () => mocks.findForUser.mockRejectedValue(new Error('x'))],
  ])(
    'translates a %s failure into a mailbox error without evaluating',
    async (_stage, fail) => {
      fail();

      await expect(reviewEmailUseCase(input)).rejects.toBeInstanceOf(
        BriefReviewMailboxError,
      );
      expect(mocks.evaluateBrief).not.toHaveBeenCalled();
    },
  );

  it.each([null, '', ' \n\t '])(
    'rejects absent plain text %j before evaluating',
    async (text) => {
      mocks.getMessage.mockResolvedValue({ ...message, text });

      await expect(reviewEmailUseCase(input)).rejects.toBeInstanceOf(
        BriefReviewMissingTextError,
      );
      expect(mocks.evaluateBrief).not.toHaveBeenCalled();
    },
  );

  it('rejects an oversized body before evaluating', async () => {
    mocks.getMessage.mockResolvedValue({
      ...message,
      text: 'a'.repeat(BRIEF_REVIEW_MAX_BODY_LENGTH + 1),
    });

    await expect(reviewEmailUseCase(input)).rejects.toBeInstanceOf(
      BriefReviewBodyTooLongError,
    );
    expect(mocks.evaluateBrief).not.toHaveBeenCalled();
  });

  it('accepts a body at the length limit', async () => {
    const text = 'a'.repeat(BRIEF_REVIEW_MAX_BODY_LENGTH);
    mocks.getMessage.mockResolvedValue({ ...message, text });

    await expect(reviewEmailUseCase(input)).resolves.toMatchObject({
      status: 'success',
    });
    expect(mocks.evaluateBrief).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ body: text }),
    );
  });

  it('propagates evaluator errors', async () => {
    const error = new BriefReviewProviderError();
    mocks.evaluateBrief.mockRejectedValue(error);

    await expect(reviewEmailUseCase(input)).rejects.toBe(error);
  });
});
