import type { EmailSender, EmailSenderConfig } from './email-sender.types';
import { createZohoEmailSender } from './zoho/create-zoho-email-sender';

export function createEmailSender(config: EmailSenderConfig): EmailSender {
  if (config.provider === 'zoho') {
    return createZohoEmailSender(config);
  }

  throw new Error('Unsupported email provider.');
}
