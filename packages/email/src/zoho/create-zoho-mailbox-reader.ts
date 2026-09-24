import type { MailboxReaderConfig } from '../mailbox-reader.types';
import { ImapMailboxReader } from '../imap/imap-mailbox-reader';
import { ImapFlowTransport } from '../imap/imapflow-transport';

export function createZohoMailboxReader({
  credentials,
  imapHost,
}: MailboxReaderConfig): ImapMailboxReader {
  const transport = new ImapFlowTransport({
    host: imapHost,
    port: 993,
    secure: true,
    username: credentials.username,
    password: credentials.password,
  });
  return new ImapMailboxReader(transport);
}
