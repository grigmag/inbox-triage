import 'server-only';

import type { EmailMessage } from '@inbox-triage/email';
import { BRIEF_REVIEW_MAX_BODY_LENGTH } from '../brief-review/brief-review-v1.config';
import type { BriefEvaluationOutput } from '../brief-review/brief-review-v1.schema';
import {
  BriefReviewBodyTooLongError,
  BriefReviewMailboxError,
  BriefReviewMissingTextError,
} from '../brief-review/brief-review.errors';
import {
  evaluateBrief,
  type BriefReviewInput,
} from '../brief-review/evaluate-brief';
import { readMailbox } from '../server/read-mailbox';

type ReviewEmailResult =
  | { status: 'success'; data: BriefEvaluationOutput }
  | { status: 'noConnection' };

/**
 * Reviews a message from the user's mailbox. The mailbox connection closes
 * before the evaluator runs, and body checks happen before any billable call.
 */
export async function reviewEmailUseCase(input: {
  userId: string;
  messageRef: string;
}): Promise<ReviewEmailResult> {
  let message: EmailMessage;

  try {
    const mailbox = await readMailbox(input.userId, (reader) =>
      reader.getMessage(input.messageRef),
    );

    if (mailbox.status === 'noConnection') {
      return mailbox;
    }

    message = mailbox.data;
  } catch {
    throw new BriefReviewMailboxError();
  }

  const { data } = await evaluateBrief(toBriefReviewInput(message));

  return { status: 'success', data };
}

function toBriefReviewInput(message: EmailMessage): BriefReviewInput {
  const body = message.text;

  if (!body?.trim()) {
    throw new BriefReviewMissingTextError();
  }

  if (body.length > BRIEF_REVIEW_MAX_BODY_LENGTH) {
    throw new BriefReviewBodyTooLongError();
  }

  return {
    subject: message.subject,
    receivedAt: message.receivedAt,
    body,
  };
}
