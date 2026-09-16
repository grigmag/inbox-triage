import type { EmailClient, EmailClientConfig } from './email-client.types';
import { createZohoEmailClient } from './zoho/create-zoho-email-client';

export function createEmailClient(config: EmailClientConfig): EmailClient {
  if (config.provider === 'zoho') {
    return createZohoEmailClient(config);
  }

  throw new Error('Unsupported email provider.');
}
