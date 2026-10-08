import { createImapTransport } from '../create-mail-transports';
import type { MailboxReaderConfig } from '../mailbox-reader.types';
import { ImapMailboxReader } from '../imap/imap-mailbox-reader';
import { GMAIL_IMAP_HOST } from './gmail-hosts';

export function createGmailMailboxReader({
  credentials,
}: Extract<MailboxReaderConfig, { provider: 'gmail' }>): ImapMailboxReader {
  return new ImapMailboxReader(
    createImapTransport(GMAIL_IMAP_HOST, credentials),
  );
}
