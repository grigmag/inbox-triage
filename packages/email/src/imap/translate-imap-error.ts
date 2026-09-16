import { EmailClientError } from '../email-client-error';
import { ImapTransportError } from './imap-transport.types';

export function translateImapError(error: unknown): EmailClientError {
  if (error instanceof EmailClientError) {
    return error;
  }
  if (error instanceof ImapTransportError) {
    if (error.kind === 'authentication') {
      return new EmailClientError('AUTHENTICATION_FAILED');
    }
    if (error.kind === 'connection') {
      return new EmailClientError('CONNECTION_FAILED');
    }
  }

  return new EmailClientError('UNKNOWN');
}
