import { MailboxReaderError } from '../mailbox-reader-error';
import { ImapTransportError } from './imap-transport.types';

export function translateImapError(error: unknown): MailboxReaderError {
  if (error instanceof MailboxReaderError) {
    return error;
  }
  if (error instanceof ImapTransportError) {
    if (error.kind === 'authentication') {
      return new MailboxReaderError('AUTHENTICATION_FAILED', error.diagnostic);
    }
    if (error.kind === 'connection') {
      return new MailboxReaderError('CONNECTION_FAILED', error.diagnostic);
    }
    return new MailboxReaderError('UNKNOWN', error.diagnostic);
  }

  return new MailboxReaderError('UNKNOWN');
}
