import type { EmailCredentials } from './email-credentials.types';
import { ImapFlowTransport } from './imap/imapflow-transport';
import { NodemailerSmtpTransport } from './smtp/nodemailer-smtp-transport';

/** IMAP over implicit TLS on port 993, which every supported provider uses. */
export function createImapTransport(
  host: string,
  { username, password }: EmailCredentials,
): ImapFlowTransport {
  return new ImapFlowTransport({
    host,
    port: 993,
    secure: true,
    username,
    password,
  });
}

/** SMTP over implicit TLS on port 465, which every supported provider uses. */
export function createSmtpTransport(
  host: string,
  { username, password }: EmailCredentials,
): NodemailerSmtpTransport {
  return new NodemailerSmtpTransport({
    host,
    port: 465,
    secure: true,
    username,
    password,
  });
}
