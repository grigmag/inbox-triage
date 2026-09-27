import 'server-only';

import {
  createEmailSender,
  EmailSenderError,
  type EmailMessage,
  type ReplyEmailInput,
  type ReplyEmailResult,
} from '@inbox-triage/email';
import { STUDIO_TIMEZONE } from '@/config/consts';
import { loadEmailConnection } from './load-email-connection';

type EmailReplySend =
  { status: 'success'; data: ReplyEmailResult } | { status: 'noConnection' };

// Callers must authenticate and pass the local user ID from requireUser().
// Unlike readMailbox(), this never retries: a failed submission may still have
// been delivered, and a second attempt could send the email twice.
export async function sendEmailReply(
  userId: string,
  parent: EmailMessage,
  input: ReplyEmailInput,
): Promise<EmailReplySend> {
  try {
    const connection = await loadEmailConnection(userId);

    if (!connection) {
      return { status: 'noConnection' };
    }

    const sender = createEmailSender({
      provider: connection.provider,
      smtpHost: connection.smtpHost,
      credentials: connection.credentials,
      timezone: STUDIO_TIMEZONE,
    });

    try {
      const data = await sender.reply(parent, input);
      return { status: 'success', data };
    } finally {
      await sender.close();
    }
  } catch (error) {
    console.error(
      'Email reply failed.',
      error instanceof EmailSenderError ? { code: error.code } : error,
    );
    throw error;
  }
}
