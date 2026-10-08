import type {
  MailboxReader,
  MailboxReaderConfig,
} from './mailbox-reader.types';
import { createGmailMailboxReader } from './gmail/create-gmail-mailbox-reader';
import { createZohoMailboxReader } from './zoho/create-zoho-mailbox-reader';

export function createMailboxReader(
  config: MailboxReaderConfig,
): MailboxReader {
  if (config.provider === 'zoho') {
    return createZohoMailboxReader(config);
  }

  if (config.provider === 'gmail') {
    return createGmailMailboxReader(config);
  }

  throw new Error('Unsupported email provider.');
}
