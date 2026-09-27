import 'server-only';

import {
  generateText,
  JSONParseError,
  NoObjectGeneratedError,
  NoOutputGeneratedError,
  Output,
  TypeValidationError,
  type FinishReason,
  type LanguageModelUsage,
} from 'ai';
import { z } from 'zod';
import { aiModel } from '@/server/ai';
import { isTimeoutError } from '../lib/is-timeout-error';
import {
  BriefReviewInvalidOutputError,
  BriefReviewProviderError,
  BriefReviewTimeoutError,
} from './brief-review.errors';
import {
  buildBriefReviewV1Prompt,
  buildCorrectiveSystemPrompt,
} from './brief-review-v1.prompt';
import {
  briefEvaluationOutputV1Schema,
  type BriefEvaluationOutput,
} from './brief-review-v1.schema';

export type BriefReviewInput = {
  subject: string | null;
  receivedAt: Date;
  body: string;
};

export type BriefReviewValidationIssue = {
  path: PropertyKey[];
  message: string;
};

export type BriefReviewAttempt = {
  durationMs: number;
  usage: LanguageModelUsage | null;
  finishReason: FinishReason | null;
  issues: BriefReviewValidationIssue[];
};

/**
 * Describes how a review was produced. It never contains raw model output,
 * reasoning, or provider metadata.
 */
export type BriefReviewRunMetadata = {
  configuredModelId: string;
  responseModelId: string | null;
  attempts: BriefReviewAttempt[];
};

const BRIEF_REVIEW_TIMEOUT_MS = 60_000;

type AttemptResult = {
  data: BriefEvaluationOutput | null;
  responseModelId: string | null;
  attempt: BriefReviewAttempt;
};

/**
 * Evaluates an email with one corrective attempt when the model returns
 * invalid output. Provider failures and timeouts are never retried.
 */
export async function evaluateBrief(
  input: BriefReviewInput,
): Promise<{ data: BriefEvaluationOutput; metadata: BriefReviewRunMetadata }> {
  const { system, prompt } = buildBriefReviewV1Prompt(input);
  const metadata: BriefReviewRunMetadata = {
    configuredModelId: aiModel.modelId,
    responseModelId: null,
    attempts: [],
  };

  const first = await attempt(system, prompt);
  record(metadata, first);
  if (first.data) {
    return { data: first.data, metadata };
  }

  const second = await attempt(
    buildCorrectiveSystemPrompt(first.attempt.issues),
    prompt,
  );
  record(metadata, second);
  if (second.data) {
    return { data: second.data, metadata };
  }

  throw new BriefReviewInvalidOutputError(metadata);
}

function record(metadata: BriefReviewRunMetadata, result: AttemptResult) {
  metadata.attempts.push(result.attempt);
  metadata.responseModelId = result.responseModelId ?? metadata.responseModelId;
}

async function attempt(system: string, prompt: string): Promise<AttemptResult> {
  const startedAt = performance.now();
  const response = await requestEvaluation(system, prompt);
  const parsed = parseEvaluation(response.text);

  return {
    data: parsed?.success ? parsed.data : null,
    responseModelId: response.modelId,
    attempt: {
      durationMs: Math.round(performance.now() - startedAt),
      usage: response.usage,
      finishReason: response.finishReason,
      issues: !parsed
        ? [
            {
              path: [],
              message: 'The response was not valid structured output',
            },
          ]
        : parsed.success
          ? []
          : parsed.error.issues.map(({ path, message }) => ({ path, message })),
    },
  };
}

/** Returns null when the text is not JSON. */
function parseEvaluation(text: string | null) {
  let json: unknown;

  try {
    json = JSON.parse(text ?? '');
  } catch {
    return null;
  }

  return briefEvaluationOutputV1Schema.safeParse(json);
}

type ModelResponse = {
  text: string | null;
  usage: LanguageModelUsage | null;
  modelId: string | null;
  finishReason: FinishReason | null;
};

/**
 * Returns the raw response text, which `attempt` validates. The AI SDK also
 * validates the output against the schema, but it reports a failed
 * application rule without its issues, and it throws when reading the output
 * of a response without text, such as one stopped by a content filter.
 */
async function requestEvaluation(
  system: string,
  prompt: string,
): Promise<ModelResponse> {
  try {
    const result = await generateText({
      model: aiModel,
      system,
      prompt,
      output: Output.object({ schema: briefEvaluationOutputV1Schema }),
      maxRetries: 0,
      timeout: BRIEF_REVIEW_TIMEOUT_MS,
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
      telemetry: { isEnabled: false },
    });

    return {
      text: result.text,
      usage: result.usage,
      modelId: result.response.modelId,
      finishReason: result.finishReason,
    };
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      return {
        text: error.text ?? null,
        usage: error.usage ?? null,
        modelId: error.response?.modelId ?? null,
        finishReason: error.finishReason ?? null,
      };
    }

    if (isInvalidOutputError(error)) {
      return { text: null, usage: null, modelId: null, finishReason: null };
    }

    throw isTimeoutError(error)
      ? new BriefReviewTimeoutError()
      : new BriefReviewProviderError();
  }
}

function isInvalidOutputError(error: unknown): boolean {
  const cause = error instanceof Error ? error.cause : undefined;

  return [error, cause].some(
    (candidate) =>
      candidate instanceof z.ZodError ||
      JSONParseError.isInstance(candidate) ||
      NoOutputGeneratedError.isInstance(candidate) ||
      TypeValidationError.isInstance(candidate),
  );
}
