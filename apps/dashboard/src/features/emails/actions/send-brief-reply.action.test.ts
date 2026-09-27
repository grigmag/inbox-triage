import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BRIEF_REPLY_MAX_BODY_LENGTH } from '../brief-reply/brief-reply.config';
import {
  BriefReplyMailboxError,
  BriefReplySendFailedError,
  BriefReplySendUnconfirmedError,
} from '../brief-reply/brief-reply.errors';
import { sendBriefReplyAction } from './send-brief-reply.action';

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  sendBriefReplyUseCase: vi.fn(),
}));

vi.mock('@/server/auth', () => ({ requireUser: mocks.requireUser }));
vi.mock('../use-cases/send-brief-reply.use-case', () => ({
  sendBriefReplyUseCase: mocks.sendBriefReplyUseCase,
}));

type ActionInput = Parameters<typeof sendBriefReplyAction>[0];

const body = '  Hello,\n\nWhen should the shoot take place?\n';
const input: ActionInput = { messageRef: 'opaque-message-ref', body };

const genericFailure = {
  status: 'failure',
  message: 'Unable to send the reply. Please try again.',
};
const invalidBody = {
  status: 'failure',
  message:
    'Enter a reply with visible text and no more than 20,000 characters.',
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireUser.mockResolvedValue({ id: 'local-user-id' });
});

describe('sendBriefReplyAction', () => {
  it('sends the unchanged body for the authenticated user and returns a serializable result', async () => {
    const data = {
      acceptedRecipients: ['client@example.com'],
      rejectedRecipients: [],
      quotedOriginal: true,
    };
    mocks.sendBriefReplyUseCase.mockResolvedValue({ status: 'success', data });

    const result = await sendBriefReplyAction(input);

    expect(result).toEqual({ status: 'success', data });
    expect(structuredClone(result)).toEqual(result);
    expect(mocks.sendBriefReplyUseCase).toHaveBeenCalledExactlyOnceWith({
      userId: 'local-user-id',
      messageRef: 'opaque-message-ref',
      body,
    });
  });

  it('ignores browser-supplied fields other than the reference and body', async () => {
    mocks.sendBriefReplyUseCase.mockResolvedValue({ status: 'noConnection' });

    await sendBriefReplyAction({
      ...input,
      userId: 'other-user-id',
      to: 'attacker@example.com',
    } as ActionInput);

    expect(mocks.sendBriefReplyUseCase).toHaveBeenCalledExactlyOnceWith({
      userId: 'local-user-id',
      messageRef: 'opaque-message-ref',
      body,
    });
  });

  it('passes through noConnection', async () => {
    mocks.sendBriefReplyUseCase.mockResolvedValue({ status: 'noConnection' });

    await expect(sendBriefReplyAction(input)).resolves.toEqual({
      status: 'noConnection',
    });
  });

  it('propagates authentication rejection before sending', async () => {
    const rejection = new Error('authentication required');
    mocks.requireUser.mockRejectedValue(rejection);

    await expect(sendBriefReplyAction(input)).rejects.toBe(rejection);
    expect(mocks.sendBriefReplyUseCase).not.toHaveBeenCalled();
  });

  it.each([
    ['an empty reference', { ...input, messageRef: '' }, genericFailure],
    ['a non-string reference', { ...input, messageRef: 1 }, genericFailure],
    ['absent input', undefined, genericFailure],
    ['an empty body', { ...input, body: '' }, invalidBody],
    ['a whitespace-only body', { ...input, body: ' \n\t ' }, invalidBody],
    [
      'an oversized body',
      { ...input, body: 'a'.repeat(BRIEF_REPLY_MAX_BODY_LENGTH + 1) },
      invalidBody,
    ],
    ['a non-string body', { ...input, body: ['Hello'] }, invalidBody],
  ])(
    'rejects %s after authentication without reading or sending',
    async (_, invalidInput, expected) => {
      await expect(
        sendBriefReplyAction(invalidInput as ActionInput),
      ).resolves.toEqual(expected);
      expect(mocks.requireUser).toHaveBeenCalledTimes(1);
      expect(mocks.sendBriefReplyUseCase).not.toHaveBeenCalled();
    },
  );

  it('returns unconfirmed when the reply may have been sent', async () => {
    const error = new BriefReplySendUnconfirmedError();
    mocks.sendBriefReplyUseCase.mockRejectedValue(error);

    await expect(sendBriefReplyAction(input)).resolves.toEqual({
      status: 'unconfirmed',
      message: error.message,
    });
  });

  it.each([
    new BriefReplyMailboxError(),
    new BriefReplySendFailedError('This email has no address to reply to.'),
  ])('returns the safe message for $name as a failure', async (error) => {
    mocks.sendBriefReplyUseCase.mockRejectedValue(error);

    await expect(sendBriefReplyAction(input)).resolves.toEqual({
      status: 'failure',
      message: error.message,
    });
  });

  it('hides unknown failures behind a generic message', async () => {
    mocks.sendBriefReplyUseCase.mockRejectedValue(
      new Error('client@example.com raw SMTP response'),
    );

    await expect(sendBriefReplyAction(input)).resolves.toEqual(genericFailure);
  });
});
