import 'server-only';

import { generateText, type FinishReason, type LanguageModelUsage } from 'ai';
import { aiModel } from '@/server/ai';
import type { BriefReviewFieldKey } from '../brief-review/brief-review-v1.config';
import type { BriefEvaluationOutput } from '../brief-review/brief-review-v1.schema';
import { isTimeoutError } from '../lib/is-timeout-error';
import { BRIEF_REPLY_MAX_BODY_LENGTH } from './brief-reply.config';
import {
  BriefReplyInvalidOutputError,
  BriefReplyProviderError,
  BriefReplyTimeoutError,
} from './brief-reply.errors';
import { buildBriefReplyPrompt } from './brief-reply.prompt';

export type BriefReplyQuestion = {
  fieldKey: BriefReviewFieldKey;
  question: string;
};

export type BriefReplyInput = {
  subject: string | null;
  body: string;
  language: BriefEvaluationOutput['language'];
  questions: BriefReplyQuestion[];
};

/**
 * Describes how a reply was produced. It never contains the prompt, the
 * generated text, reasoning, or provider metadata.
 */
export type BriefReplyRunMetadata = {
  configuredModelId: string;
  responseModelId: string | null;
  usage: LanguageModelUsage | null;
  finishReason: FinishReason | null;
};

const BRIEF_REPLY_TIMEOUT_MS = 60_000;

// Reasoning models spend output tokens before the visible text, so the limit
// leaves room beyond a short email.
const BRIEF_REPLY_MAX_OUTPUT_TOKENS = 4_000;

/**
 * Drafts a plain-text clarification reply. Provider failures and timeouts are
 * never retried, and invalid output has no corrective attempt.
 */
export async function generateBriefReply(
  input: BriefReplyInput,
): Promise<{ body: string; metadata: BriefReplyRunMetadata }> {
  const prompt = buildBriefReplyPrompt(input);
  const result = await requestBriefReply(prompt);
  const body = result.text.trim();
  const metadata: BriefReplyRunMetadata = {
    configuredModelId: aiModel.modelId,
    responseModelId: result.response.modelId,
    usage: result.usage,
    finishReason: result.finishReason,
  };

  if (
    result.finishReason === 'length' ||
    body.length === 0 ||
    body.length > BRIEF_REPLY_MAX_BODY_LENGTH
  ) {
    throw new BriefReplyInvalidOutputError(metadata);
  }

  return { body, metadata };
}

async function requestBriefReply({
  system,
  prompt,
}: {
  system: string;
  prompt: string;
}) {
  try {
    const result = await generateText({
      model: aiModel,
      system,
      prompt,
      maxOutputTokens: BRIEF_REPLY_MAX_OUTPUT_TOKENS,
      maxRetries: 0,
      timeout: BRIEF_REPLY_TIMEOUT_MS,
      providerOptions: {
        openrouter: {
          provider: {
            zdr: true,
            data_collection: 'deny',
          },
        },
      },
      telemetry: { isEnabled: false },
    });
    return result;
  } catch (error) {
    throw isTimeoutError(error)
      ? new BriefReplyTimeoutError()
      : new BriefReplyProviderError();
  }
}
