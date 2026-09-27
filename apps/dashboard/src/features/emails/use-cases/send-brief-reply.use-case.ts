import 'server-only';

import {
  EmailSenderError,
  type EmailMessage,
  type EmailSenderErrorCode,
  type ReplyEmailResult,
} from '@inbox-triage/email';
import {
  BriefReplyMailboxError,
  BriefReplySendFailedError,
  BriefReplySendUnconfirmedError,
} from '../brief-reply/brief-reply.errors';
import {
  toSentBriefReplyDto,
  type SentBriefReplyDto,
} from '../dto/sent-brief-reply.dto';
import { readMailbox } from '../server/read-mailbox';
import { sendEmailReply } from '../server/send-email-reply';

type SendBriefReplyResult =
  { status: 'success'; data: SentBriefReplyDto } | { status: 'noConnection' };

// Codes that prove nothing was submitted. CONNECTION_FAILED and SEND_FAILED
// are absent because the provider may have accepted the message.
const NOT_SUBMITTED_MESSAGES: Partial<Record<EmailSenderErrorCode, string>> = {
  AUTHENTICATION_FAILED:
    'The email provider rejected the credentials. Check Email settings and try again.',
  ENVELOPE_REJECTED: 'The email provider refused the reply before it was sent.',
  INVALID_MESSAGE: 'The reply could not be sent because it is invalid.',
  REPLY_MESSAGE_ID_MISSING:
    'This email cannot be replied to because it has no message ID.',
  REPLY_RECIPIENT_MISSING: 'This email has no address to reply to.',
};

const NOT_SENT_MESSAGE = 'Unable to send the reply. Please try again.';

/**
 * Sends the user's reply to a message from their mailbox. The parent message
 * comes only from the mailbox, and its connection closes before the one SMTP
 * submission. The reply quotes the original in the provider's format unless
 * that would exceed the package's body limit, in which case only the body is
 * sent. The caller must validate the body first.
 */
export async function sendBriefReplyUseCase(input: {
  userId: string;
  messageRef: string;
  body: string;
}): Promise<SendBriefReplyResult> {
  let parentEmail: EmailMessage;

  try {
    const mailbox = await readMailbox(input.userId, (reader) =>
      reader.getMessage(input.messageRef),
    );

    if (mailbox.status === 'noConnection') {
      return mailbox;
    }

    parentEmail = mailbox.data;
  } catch {
    throw new BriefReplyMailboxError();
  }

  let sent: ReplyEmailResult;

  try {
    const result = await sendEmailReply(input.userId, parentEmail, {
      text: input.body,
      quoteParent: true,
    });

    if (result.status === 'noConnection') {
      return result;
    }

    sent = result.data;
  } catch (error) {
    throw toSendError(error);
  }

  return { status: 'success', data: toSentBriefReplyDto(sent) };
}

function toSendError(error: unknown) {
  if (!(error instanceof EmailSenderError)) {
    // Only sender submission errors can mean the reply was delivered.
    return new BriefReplySendFailedError(NOT_SENT_MESSAGE);
  }

  const message = NOT_SUBMITTED_MESSAGES[error.code];
  return message
    ? new BriefReplySendFailedError(message)
    : new BriefReplySendUnconfirmedError();
}
