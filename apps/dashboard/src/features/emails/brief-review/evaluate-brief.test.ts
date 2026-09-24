import {
  generateText,
  NoObjectGeneratedError,
  TypeValidationError,
  type LanguageModelUsage,
} from 'ai';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BriefReviewInvalidOutputError,
  BriefReviewProviderError,
  BriefReviewTimeoutError,
} from './brief-review.errors';
import { evaluateBrief, type BriefReviewInput } from './evaluate-brief';
import type { BriefEvaluationOutput } from './brief-review-v1.schema';

vi.mock('server-only', () => ({}));
vi.mock('@/server/ai', () => ({ aiModel: { modelId: 'configured-model' } }));
vi.mock('ai', async (importOriginal) => ({
  ...(await importOriginal<typeof import('ai')>()),
  generateText: vi.fn(),
}));

const generate = vi.mocked(generateText);

function usage(inputTokens: number, outputTokens: number): LanguageModelUsage {
  return {
    inputTokens,
    inputTokenDetails: {
      noCacheTokens: inputTokens,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    },
    outputTokens,
    outputTokenDetails: { textTokens: outputTokens, reasoningTokens: 0 },
    totalTokens: inputTokens + outputTokens,
  };
}

// The evaluator only reads these properties from the generateText result.
function result(
  output: unknown,
  tokens = usage(100, 50),
  modelId = 'response-model',
) {
  return {
    text: JSON.stringify(output),
    usage: tokens,
    response: { modelId },
    finishReason: 'stop',
  } as unknown as Awaited<ReturnType<typeof generateText>>;
}

const input: BriefReviewInput = {
  subject: 'Product launch',
  receivedAt: new Date('2026-09-22T08:30:00.000Z'),
  body: 'We need ten product photographs next Friday.',
};

function validEvaluation(): BriefEvaluationOutput {
  return {
    outcome: 'complete',
    language: 'en',
    summary: 'A product photography request.',
    fields: {
      projectType: {
        status: 'provided',
        value: { category: 'photography', details: 'Product photography' },
        reason: null,
      },
      objective: {
        status: 'missing',
        value: null,
        reason: 'No objective is stated.',
      },
      deliverables: {
        status: 'provided',
        value: 'Ten product photographs',
        reason: null,
      },
      timeline: {
        status: 'provided',
        value: 'Next Friday',
        reason: null,
      },
      location: {
        status: 'missing',
        value: null,
        reason: 'No location is stated.',
      },
      budget: {
        status: 'missing',
        value: null,
        reason: 'No budget is stated.',
      },
      intendedUse: {
        status: 'missing',
        value: null,
        reason: 'No intended use is stated.',
      },
      creativeDirection: {
        status: 'missing',
        value: null,
        reason: 'No creative direction is stated.',
      },
      talent: {
        status: 'missing',
        value: null,
        reason: 'Talent is not discussed.',
      },
    },
    missingInformation: [],
    outcomeReason: 'The required scope is clear.',
  };
}

describe('evaluateBrief', () => {
  beforeEach(() => {
    generate.mockReset();
  });

  it('returns a valid evaluation after one generation call', async () => {
    generate.mockResolvedValue(result(validEvaluation()));

    await expect(evaluateBrief(input)).resolves.toEqual({
      data: validEvaluation(),
      metadata: {
        configuredModelId: 'configured-model',
        responseModelId: 'response-model',
        attempts: [
          {
            durationMs: expect.any(Number),
            usage: usage(100, 50),
            finishReason: 'stop',
            issues: [],
          },
        ],
      },
    });
    expect(generate).toHaveBeenCalledTimes(1);
    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({
        maxRetries: 0,
        timeout: 60_000,
        providerOptions: {
          openrouter: {
            structuredOutputs: { strict: true },
            provider: {
              require_parameters: true,
              zdr: true,
              data_collection: 'deny',
            },
          },
        },
      }),
    );
  });

  it('makes one corrective call after invalid application output', async () => {
    generate
      .mockResolvedValueOnce(
        result({ ...validEvaluation(), outcome: 'needs_information' }),
      )
      .mockResolvedValueOnce(
        result(validEvaluation(), usage(120, 60), 'second-model'),
      );

    const { data, metadata } = await evaluateBrief(input);

    expect(data).toEqual(validEvaluation());
    expect(metadata).toEqual({
      configuredModelId: 'configured-model',
      responseModelId: 'second-model',
      attempts: [
        {
          durationMs: expect.any(Number),
          usage: usage(100, 50),
          finishReason: 'stop',
          issues: [
            {
              path: ['missingInformation'],
              message:
                'A brief that needs information requires a completion-blocking question',
            },
          ],
        },
        {
          durationMs: expect.any(Number),
          usage: usage(120, 60),
          finishReason: 'stop',
          issues: [],
        },
      ],
    });
    expect(generate).toHaveBeenCalledTimes(2);
    expect(generate.mock.calls[1][0].system).toContain(
      'Your previous response did not satisfy the schema',
    );
    expect(generate.mock.calls[1][0].prompt).toContain(input.body);
  });

  it('makes one corrective call after an AI SDK structured-output error', async () => {
    const invalidOutput = new TypeValidationError({
      value: 'private raw output',
      cause: new Error('invalid structure'),
    });
    generate
      .mockRejectedValueOnce(invalidOutput)
      .mockResolvedValueOnce(result(validEvaluation()));

    const { metadata } = await evaluateBrief(input);

    expect(
      metadata.attempts.map(({ usage, issues }) => ({ usage, issues })),
    ).toEqual([
      {
        usage: null,
        issues: [
          {
            path: [],
            message: 'The response was not valid structured output',
          },
        ],
      },
      { usage: usage(100, 50), issues: [] },
    ]);
    expect(generate).toHaveBeenCalledTimes(2);
  });

  it('records usage from a failed structured-output response', async () => {
    const noObject = new NoObjectGeneratedError({
      text: 'private raw output',
      cause: new TypeValidationError({
        value: 'private raw output',
        cause: new Error('invalid structure'),
      }),
      response: {
        id: 'response-id',
        timestamp: new Date(),
        modelId: 'failed-model',
      },
      usage: usage(90, 10),
      finishReason: 'stop',
    });
    generate
      .mockRejectedValueOnce(noObject)
      .mockResolvedValueOnce(result(validEvaluation()));

    const { metadata } = await evaluateBrief(input);

    expect(metadata.attempts[0].usage).toEqual(usage(90, 10));
    expect(metadata.attempts[0].finishReason).toBe('stop');
    expect(JSON.stringify(metadata)).not.toContain('private raw output');
  });

  it('reports application rule issues from output the AI SDK rejected', async () => {
    const rejected = { ...validEvaluation(), outcome: 'needs_information' };
    const noObject = new NoObjectGeneratedError({
      text: JSON.stringify(rejected),
      cause: new TypeValidationError({
        value: rejected,
        cause: new Error('refinement failed'),
      }),
      response: {
        id: 'response-id',
        timestamp: new Date(),
        modelId: 'failed-model',
      },
      usage: usage(90, 10),
      finishReason: 'stop',
    });
    generate
      .mockRejectedValueOnce(noObject)
      .mockResolvedValueOnce(result(validEvaluation()));

    const { metadata } = await evaluateBrief(input);

    expect(metadata.attempts[0].issues).toEqual([
      {
        path: ['missingInformation'],
        message:
          'A brief that needs information requires a completion-blocking question',
      },
    ]);
    expect(generate.mock.calls[1][0].system).toContain(
      '- missingInformation: A brief that needs information requires a completion-blocking question',
    );
  });

  it('records the finish reason when the model returns no output', async () => {
    generate
      .mockResolvedValueOnce({
        text: '',
        usage: usage(0, 0),
        response: { modelId: 'filtered-model' },
        finishReason: 'content-filter',
      } as unknown as Awaited<ReturnType<typeof generateText>>)
      .mockResolvedValueOnce(result(validEvaluation()));

    const { metadata } = await evaluateBrief(input);

    expect(metadata.attempts[0]).toEqual({
      durationMs: expect.any(Number),
      usage: usage(0, 0),
      finishReason: 'content-filter',
      issues: [
        { path: [], message: 'The response was not valid structured output' },
      ],
    });
  });

  it('fails safely after a second invalid result and reports both attempts', async () => {
    generate.mockResolvedValue(result({}));

    const error = await evaluateBrief(input).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(BriefReviewInvalidOutputError);
    expect((error as BriefReviewInvalidOutputError).message).toBe(
      'The email review returned an invalid result. Please try again.',
    );

    const { metadata } = error as BriefReviewInvalidOutputError;
    expect(metadata.configuredModelId).toBe('configured-model');
    expect(metadata.responseModelId).toBe('response-model');
    expect(metadata.attempts).toHaveLength(2);
    for (const attempt of metadata.attempts) {
      expect(attempt.usage).toEqual(usage(100, 50));
      expect(attempt.issues.length).toBeGreaterThan(0);
    }
    expect(generate).toHaveBeenCalledTimes(2);
  });

  it('does not retry a provider failure or expose its message', async () => {
    generate.mockRejectedValue(new Error('API key and provider internals'));

    await expect(evaluateBrief(input)).rejects.toEqual(
      new BriefReviewProviderError(),
    );
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it.each(['TimeoutError', 'AbortError'])(
    'does not retry a %s',
    async (name) => {
      const timeout = new Error('private timeout details');
      timeout.name = name;
      generate.mockRejectedValue(timeout);

      await expect(evaluateBrief(input)).rejects.toEqual(
        new BriefReviewTimeoutError(),
      );
      expect(generate).toHaveBeenCalledTimes(1);
    },
  );
});
