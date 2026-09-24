import type {
  MailboxReader,
  MailboxReaderConfig,
} from './mailbox-reader.types';
import { createZohoMailboxReader } from './zoho/create-zoho-mailbox-reader';

export function createMailboxReader(
  config: MailboxReaderConfig,
): MailboxReader {
  if (config.provider === 'zoho') {
    return createZohoMailboxReader(config);
  }

  throw new Error('Unsupported email provider.');
}
