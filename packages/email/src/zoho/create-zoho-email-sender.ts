import type { EmailSenderConfig } from '../email-sender.types';
import { SmtpEmailSender } from '../smtp/smtp-email-sender';
import { createSmtpTransport } from '../create-mail-transports';
import { quoteZohoEmailReply } from './quote-zoho-email-reply';

export function createZohoEmailSender({
  credentials,
  smtpHost,
  timezone,
}: Extract<EmailSenderConfig, { provider: 'zoho' }>): SmtpEmailSender {
  return new SmtpEmailSender(
    credentials.username,
    () => createSmtpTransport(smtpHost, credentials),
    (parent, replyText) => quoteZohoEmailReply(parent, replyText, timezone),
  );
}
