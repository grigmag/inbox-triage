'use server';

import { requireUser } from '@/server/auth';
import { briefReplyBodySchema } from '../brief-reply/brief-reply-body.schema';
import { BRIEF_REPLY_MAX_BODY_LENGTH } from '../brief-reply/brief-reply.config';
import {
  BriefReplyError,
  BriefReplySendUnconfirmedError,
} from '../brief-reply/brief-reply.errors';
import { sendBriefReplyUseCase } from '../use-cases/send-brief-reply.use-case';
import type { SendBriefReplyActionResult } from './send-brief-reply-action-result';

const SEND_FAILURE_MESSAGE = 'Unable to send the reply. Please try again.';
const INVALID_BODY_MESSAGE = `Enter a reply with visible text and no more than ${BRIEF_REPLY_MAX_BODY_LENGTH.toLocaleString('en-US')} characters.`;

export async function sendBriefReplyAction(input: {
  messageRef: string;
  body: string;
}): Promise<SendBriefReplyActionResult> {
  const user = await requireUser();
  const messageRef: unknown = input?.messageRef;

  if (typeof messageRef !== 'string' || messageRef.length === 0) {
    return { status: 'failure', message: SEND_FAILURE_MESSAGE };
  }

  const body = briefReplyBodySchema.safeParse(input.body);

  if (!body.success) {
    return { status: 'failure', message: INVALID_BODY_MESSAGE };
  }

  try {
    const result = await sendBriefReplyUseCase({
      userId: user.id,
      messageRef,
      body: body.data,
    });
    return result;
  } catch (error) {
    if (error instanceof BriefReplySendUnconfirmedError) {
      return { status: 'unconfirmed', message: error.message };
    }

    return {
      status: 'failure',
      message:
        error instanceof BriefReplyError ? error.message : SEND_FAILURE_MESSAGE,
    };
  }
}
