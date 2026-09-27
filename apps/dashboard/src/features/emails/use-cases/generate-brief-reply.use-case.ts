import 'server-only';

import type { EmailMessage } from '@inbox-triage/email';
import type { BriefReplyActionInput } from '../brief-reply/brief-reply-input.schema';
import {
  BriefReplyBodyTooLongError,
  BriefReplyMailboxError,
  BriefReplyMissingTextError,
} from '../brief-reply/brief-reply.errors';
import {
  generateBriefReply,
  type BriefReplyInput,
} from '../brief-reply/generate-brief-reply';
import { BRIEF_REVIEW_MAX_BODY_LENGTH } from '../brief-review/brief-review-v1.config';
import { readMailbox } from '../server/read-mailbox';

type GenerateBriefReplyResult =
  { status: 'success'; data: { body: string } } | { status: 'noConnection' };

/**
 * Drafts a reply to a message from the user's mailbox. The email content comes
 * only from the mailbox; the caller supplies the review's language and
 * questions. The mailbox connection closes before the generator runs, and body
 * checks happen before any billable call.
 */
export async function generateBriefReplyUseCase(
  input: { userId: string; messageRef: string } & BriefReplyActionInput,
): Promise<GenerateBriefReplyResult> {
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
    throw new BriefReplyMailboxError();
  }

  const { body } = await generateBriefReply(toBriefReplyInput(message, input));

  return { status: 'success', data: { body } };
}

function toBriefReplyInput(
  message: EmailMessage,
  { language, questions }: BriefReplyActionInput,
): BriefReplyInput {
  const body = message.text;

  if (!body?.trim()) {
    throw new BriefReplyMissingTextError();
  }

  if (body.length > BRIEF_REVIEW_MAX_BODY_LENGTH) {
    throw new BriefReplyBodyTooLongError();
  }

  return { subject: message.subject, body, language, questions };
}
