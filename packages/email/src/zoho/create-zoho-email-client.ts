import type { EmailClientConfig } from '../email-client.types';
import { ImapEmailClient } from '../imap/imap-email-client';
import { ImapFlowTransport } from '../imap/imapflow-transport';

export function createZohoEmailClient({
  credentials,
  imapHost,
}: EmailClientConfig): ImapEmailClient {
  const transport = new ImapFlowTransport({
    host: imapHost,
    port: 993,
    secure: true,
    username: credentials.username,
    password: credentials.password,
  });
  return new ImapEmailClient(transport);
}
