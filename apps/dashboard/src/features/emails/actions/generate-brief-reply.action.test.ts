import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BriefReplyBodyTooLongError,
  BriefReplyInvalidOutputError,
  BriefReplyMailboxError,
  BriefReplyMissingTextError,
  BriefReplyProviderError,
  BriefReplyTimeoutError,
} from '../brief-reply/brief-reply.errors';
import { generateBriefReplyAction } from './generate-brief-reply.action';

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  generateBriefReplyUseCase: vi.fn(),
}));

vi.mock('@/server/auth', () => ({ requireUser: mocks.requireUser }));
vi.mock('../use-cases/generate-brief-reply.use-case', () => ({
  generateBriefReplyUseCase: mocks.generateBriefReplyUseCase,
}));

type ActionInput = Parameters<typeof generateBriefReplyAction>[1];

const question = {
  fieldKey: 'timeline',
  question: 'When should the shoot take place?',
} as const;
const input: ActionInput = { language: 'el', questions: [question] };

const genericFailure = {
  status: 'failure',
  message: 'Unable to draft a reply. Please try again.',
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireUser.mockResolvedValue({ id: 'local-user-id' });
});

describe('generateBriefReplyAction', () => {
  it('drafts a reply for the authenticated user and returns a serializable result', async () => {
    mocks.generateBriefReplyUseCase.mockResolvedValue({
      status: 'success',
      data: { body: 'Hello,\n\nThanks.' },
    });

    const result = await generateBriefReplyAction('opaque-message-ref', input);

    expect(result).toEqual({
      status: 'success',
      data: { body: 'Hello,\n\nThanks.' },
    });
    expect(structuredClone(result)).toEqual(result);
    expect(mocks.generateBriefReplyUseCase).toHaveBeenCalledExactlyOnceWith({
      userId: 'local-user-id',
      messageRef: 'opaque-message-ref',
      language: 'el',
      questions: [question],
    });
  });

  it('passes only the language and questions from browser input', async () => {
    mocks.generateBriefReplyUseCase.mockResolvedValue({
      status: 'noConnection',
    });

    await generateBriefReplyAction('opaque-message-ref', {
      ...input,
      questions: [{ ...question, blocksCompletion: true, text: 'Injected' }],
      subject: 'Injected subject',
      body: 'Injected body',
      userId: 'other-user-id',
    } as unknown as ActionInput);

    expect(mocks.generateBriefReplyUseCase).toHaveBeenCalledExactlyOnceWith({
      userId: 'local-user-id',
      messageRef: 'opaque-message-ref',
      language: 'el',
      questions: [question],
    });
  });

  it('passes through noConnection', async () => {
    mocks.generateBriefReplyUseCase.mockResolvedValue({
      status: 'noConnection',
    });

    await expect(
      generateBriefReplyAction('opaque-message-ref', input),
    ).resolves.toEqual({ status: 'noConnection' });
  });

  it('propagates authentication rejection before drafting', async () => {
    const rejection = new Error('authentication required');
    mocks.requireUser.mockRejectedValue(rejection);

    await expect(
      generateBriefReplyAction('opaque-message-ref', input),
    ).rejects.toBe(rejection);
    expect(mocks.generateBriefReplyUseCase).not.toHaveBeenCalled();
  });

  it.each([
    ['an empty reference', '', input],
    ['a non-string reference', { ref: 'opaque-message-ref' }, input],
    ['an invalid language', 'opaque-message-ref', { ...input, language: 'fr' }],
    ['no questions', 'opaque-message-ref', { ...input, questions: [] }],
    [
      'an invalid question',
      'opaque-message-ref',
      { ...input, questions: [{ fieldKey: 'price', question: 'Budget?' }] },
    ],
    ['absent input', 'opaque-message-ref', undefined],
  ])(
    'rejects %s after authentication without drafting',
    async (_, messageRef, invalidInput) => {
      await expect(
        generateBriefReplyAction(
          messageRef as string,
          invalidInput as ActionInput,
        ),
      ).resolves.toEqual(genericFailure);
      expect(mocks.requireUser).toHaveBeenCalledTimes(1);
      expect(mocks.generateBriefReplyUseCase).not.toHaveBeenCalled();
    },
  );

  it.each([
    new BriefReplyMailboxError(),
    new BriefReplyMissingTextError(),
    new BriefReplyBodyTooLongError(),
    new BriefReplyInvalidOutputError({
      configuredModelId: 'configured-model',
      responseModelId: null,
      usage: null,
      finishReason: 'length',
    }),
    new BriefReplyProviderError(),
    new BriefReplyTimeoutError(),
  ])('returns the safe message for $name', async (error) => {
    mocks.generateBriefReplyUseCase.mockRejectedValue(error);

    await expect(
      generateBriefReplyAction('opaque-message-ref', input),
    ).resolves.toEqual({ status: 'failure', message: error.message });
  });

  it('hides unknown failures behind a generic message', async () => {
    mocks.generateBriefReplyUseCase.mockRejectedValue(
      new Error('sender@example.com raw provider response'),
    );

    await expect(
      generateBriefReplyAction('opaque-message-ref', input),
    ).resolves.toEqual(genericFailure);
  });
});
