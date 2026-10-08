import { createSmtpTransport } from '../create-mail-transports';
import type { EmailSenderConfig } from '../email-sender.types';
import { SmtpEmailSender } from '../smtp/smtp-email-sender';
import { GMAIL_SMTP_HOST } from './gmail-hosts';
import { quoteGmailEmailReply } from './quote-gmail-email-reply';

// Gmail saves messages sent over SMTP to Sent itself, so no copy is appended.
export function createGmailEmailSender({
  credentials,
  timezone,
}: Extract<EmailSenderConfig, { provider: 'gmail' }>): SmtpEmailSender {
  return new SmtpEmailSender(
    credentials.username,
    () => createSmtpTransport(GMAIL_SMTP_HOST, credentials),
    (parent, replyText) => quoteGmailEmailReply(parent, replyText, timezone),
  );
}
