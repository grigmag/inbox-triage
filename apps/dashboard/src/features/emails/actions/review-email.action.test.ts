import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BriefReviewBodyTooLongError,
  BriefReviewInvalidOutputError,
  BriefReviewMailboxError,
  BriefReviewMissingTextError,
  BriefReviewProviderError,
  BriefReviewTimeoutError,
} from '../brief-review/brief-review.errors';
import { reviewEmailAction } from './review-email.action';

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  reviewEmailUseCase: vi.fn(),
}));

vi.mock('@/server/auth', () => ({ requireUser: mocks.requireUser }));
vi.mock('../use-cases/review-email.use-case', () => ({
  reviewEmailUseCase: mocks.reviewEmailUseCase,
}));

const genericFailure = {
  status: 'failure',
  message: 'Unable to review this email. Please try again.',
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireUser.mockResolvedValue({ id: 'local-user-id' });
});

describe('reviewEmailAction', () => {
  it('reviews the reference for the authenticated user and returns the result', async () => {
    const result = { status: 'success', data: { outcome: 'irrelevant' } };
    mocks.reviewEmailUseCase.mockResolvedValue(result);

    await expect(reviewEmailAction('opaque-message-ref')).resolves.toBe(result);
    expect(mocks.reviewEmailUseCase).toHaveBeenCalledExactlyOnceWith({
      userId: 'local-user-id',
      messageRef: 'opaque-message-ref',
    });
  });

  it('passes through noConnection', async () => {
    mocks.reviewEmailUseCase.mockResolvedValue({ status: 'noConnection' });

    await expect(reviewEmailAction('opaque-message-ref')).resolves.toEqual({
      status: 'noConnection',
    });
  });

  it('propagates authentication rejection before reviewing', async () => {
    const rejection = new Error('authentication required');
    mocks.requireUser.mockRejectedValue(rejection);

    await expect(reviewEmailAction('opaque-message-ref')).rejects.toBe(
      rejection,
    );
    expect(mocks.reviewEmailUseCase).not.toHaveBeenCalled();
  });

  it.each([
    '',
    null,
    undefined,
    { ref: 'opaque-message-ref', text: 'Browser-supplied body' },
  ])(
    'rejects invalid input %j after authentication without reviewing',
    async (messageRef) => {
      await expect(reviewEmailAction(messageRef as string)).resolves.toEqual(
        genericFailure,
      );
      expect(mocks.requireUser).toHaveBeenCalledTimes(1);
      expect(mocks.reviewEmailUseCase).not.toHaveBeenCalled();
    },
  );

  it.each([
    new BriefReviewMailboxError(),
    new BriefReviewMissingTextError(),
    new BriefReviewBodyTooLongError(),
    new BriefReviewInvalidOutputError({
      configuredModelId: 'test-model',
      responseModelId: null,
      attempts: [],
    }),
    new BriefReviewProviderError(),
    new BriefReviewTimeoutError(),
  ])('returns the safe message for $name', async (error) => {
    mocks.reviewEmailUseCase.mockRejectedValue(error);

    await expect(reviewEmailAction('opaque-message-ref')).resolves.toEqual({
      status: 'failure',
      message: error.message,
    });
  });

  it('hides unknown failures behind a generic message', async () => {
    mocks.reviewEmailUseCase.mockRejectedValue(
      new Error('sender@example.com raw provider response'),
    );

    await expect(reviewEmailAction('opaque-message-ref')).resolves.toEqual(
      genericFailure,
    );
  });
});
