'use server';

import { requireUser } from '@/server/auth';
import {
  briefReplyInputSchema,
  type BriefReplyActionInput,
} from '../brief-reply/brief-reply-input.schema';
import { BriefReplyError } from '../brief-reply/brief-reply.errors';
import { generateBriefReplyUseCase } from '../use-cases/generate-brief-reply.use-case';
import type { GenerateBriefReplyActionResult } from './generate-brief-reply-action-result';

const REPLY_FAILURE_MESSAGE = 'Unable to draft a reply. Please try again.';

export async function generateBriefReplyAction(
  messageRef: string,
  input: BriefReplyActionInput,
): Promise<GenerateBriefReplyActionResult> {
  const user = await requireUser();
  const parsed = briefReplyInputSchema.safeParse(input);

  if (
    typeof messageRef !== 'string' ||
    messageRef.length === 0 ||
    !parsed.success
  ) {
    return { status: 'failure', message: REPLY_FAILURE_MESSAGE };
  }

  try {
    const result = await generateBriefReplyUseCase({
      userId: user.id,
      messageRef,
      language: parsed.data.language,
      questions: parsed.data.questions,
    });
    return result;
  } catch (error) {
    return {
      status: 'failure',
      message:
        error instanceof BriefReplyError
          ? error.message
          : REPLY_FAILURE_MESSAGE,
    };
  }
}
