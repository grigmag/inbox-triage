import type { EmailSender, EmailSenderConfig } from './email-sender.types';
import { createGmailEmailSender } from './gmail/create-gmail-email-sender';
import { createZohoEmailSender } from './zoho/create-zoho-email-sender';

export function createEmailSender(config: EmailSenderConfig): EmailSender {
  if (config.provider === 'zoho') {
    return createZohoEmailSender(config);
  }

  if (config.provider === 'gmail') {
    return createGmailEmailSender(config);
  }

  throw new Error('Unsupported email provider.');
}
