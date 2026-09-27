import { generateText, type FinishReason } from 'ai';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BRIEF_REPLY_MAX_BODY_LENGTH } from './brief-reply.config';
import {
  BriefReplyInvalidOutputError,
  BriefReplyProviderError,
  BriefReplyTimeoutError,
} from './brief-reply.errors';
import {
  generateBriefReply,
  type BriefReplyInput,
} from './generate-brief-reply';

vi.mock('server-only', () => ({}));
vi.mock('@/server/ai', () => ({ aiModel: { modelId: 'configured-model' } }));
vi.mock('ai', async (importOriginal) => ({
  ...(await importOriginal<typeof import('ai')>()),
  generateText: vi.fn(),
}));

const generate = vi.mocked(generateText);

const usage = { inputTokens: 120, outputTokens: 40, totalTokens: 160 };

// The generator only reads these properties from the generateText result.
function result(text: string, finishReason: FinishReason = 'stop') {
  return {
    text,
    finishReason,
    usage,
    response: { modelId: 'response-model' },
  } as unknown as Awaited<ReturnType<typeof generateText>>;
}

function metadata(finishReason: FinishReason) {
  return {
    configuredModelId: 'configured-model',
    responseModelId: 'response-model',
    usage,
    finishReason,
  };
}

const input: BriefReplyInput = {
  subject: 'Product launch',
  body: 'We need product photographs for a launch.',
  language: 'en',
  questions: [
    { fieldKey: 'timeline', question: 'When should the shoot take place?' },
  ],
};

describe('generateBriefReply', () => {
  beforeEach(() => {
    generate.mockReset();
  });

  it('returns the trimmed body and run metadata after one generation call', async () => {
    generate.mockResolvedValue(
      result(
        '\n  Hello,\n\nWhen should the shoot take place?\n\nBest regards  \n',
      ),
    );

    await expect(generateBriefReply(input)).resolves.toEqual({
      body: 'Hello,\n\nWhen should the shoot take place?\n\nBest regards',
      metadata: metadata('stop'),
    });
    expect(generate).toHaveBeenCalledTimes(1);
    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: { modelId: 'configured-model' },
        maxOutputTokens: expect.any(Number),
        maxRetries: 0,
        timeout: 60_000,
        providerOptions: {
          openrouter: {
            provider: { zdr: true, data_collection: 'deny' },
          },
        },
        telemetry: { isEnabled: false },
      }),
    );
    expect(generate.mock.calls[0][0]).not.toHaveProperty('output');
    expect(generate.mock.calls[0][0].prompt).toContain(input.body);
  });

  it('accepts a body at the length limit', async () => {
    const body = 'a'.repeat(BRIEF_REPLY_MAX_BODY_LENGTH);
    generate.mockResolvedValue(result(`  ${body}  `));

    await expect(generateBriefReply(input)).resolves.toMatchObject({ body });
  });

  it.each([
    ['empty', result('')],
    ['whitespace-only', result(' \n\t ')],
    ['oversized', result('a'.repeat(BRIEF_REPLY_MAX_BODY_LENGTH + 1))],
    ['truncated', result('Hello, when should the', 'length')],
    ['filtered', result('', 'content-filter')],
  ])('rejects %s output without a corrective call', async (_, response) => {
    generate.mockResolvedValue(response);

    const error = await generateBriefReply(input).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(BriefReplyInvalidOutputError);
    expect((error as BriefReplyInvalidOutputError).metadata).toEqual(
      metadata(response.finishReason),
    );
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('does not retry a provider failure or expose its message', async () => {
    generate.mockRejectedValue(new Error('API key and provider internals'));

    const error = await generateBriefReply(input).catch(
      (caught: unknown) => caught,
    );

    expect(error).toEqual(new BriefReplyProviderError());
    expect((error as Error).message).not.toContain('provider internals');
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it.each(['TimeoutError', 'AbortError'])(
    'does not retry a %s',
    async (name) => {
      const timeout = new Error('private timeout details');
      timeout.name = name;
      generate.mockRejectedValue(new Error('wrapped', { cause: timeout }));

      await expect(generateBriefReply(input)).rejects.toEqual(
        new BriefReplyTimeoutError(),
      );
      expect(generate).toHaveBeenCalledTimes(1);
    },
  );
});
