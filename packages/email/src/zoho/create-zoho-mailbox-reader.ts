import type { MailboxReaderConfig } from '../mailbox-reader.types';
import { ImapMailboxReader } from '../imap/imap-mailbox-reader';
import { createImapTransport } from '../create-mail-transports';

export function createZohoMailboxReader({
  credentials,
  imapHost,
}: Extract<MailboxReaderConfig, { provider: 'zoho' }>): ImapMailboxReader {
  return new ImapMailboxReader(createImapTransport(imapHost, credentials));
}
