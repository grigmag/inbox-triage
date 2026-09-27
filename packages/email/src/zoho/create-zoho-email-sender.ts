import type { EmailSenderConfig } from '../email-sender.types';
import { NodemailerSmtpTransport } from '../smtp/nodemailer-smtp-transport';
import { SmtpEmailSender } from '../smtp/smtp-email-sender';
import { quoteZohoEmailReply } from './quote-zoho-email-reply';

export function createZohoEmailSender({
  credentials,
  smtpHost,
  timezone,
}: EmailSenderConfig): SmtpEmailSender {
  return new SmtpEmailSender(
    credentials.username,
    () =>
      new NodemailerSmtpTransport({
        host: smtpHost,
        port: 465,
        secure: true,
        username: credentials.username,
        password: credentials.password,
      }),
    (parent, replyText) => quoteZohoEmailReply(parent, replyText, timezone),
  );
}
