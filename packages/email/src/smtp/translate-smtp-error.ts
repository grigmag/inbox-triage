import { EmailSenderError } from '../email-sender-error';
import { SmtpTransportError } from './smtp-transport.types';

export function translateSmtpError(error: unknown): EmailSenderError {
  if (error instanceof EmailSenderError) {
    return error;
  }
  if (error instanceof SmtpTransportError) {
    if (error.kind === 'authentication') {
      return new EmailSenderError('AUTHENTICATION_FAILED');
    }
    if (error.kind === 'connection') {
      return new EmailSenderError('CONNECTION_FAILED');
    }
    if (error.kind === 'envelope') {
      return new EmailSenderError('ENVELOPE_REJECTED');
    }
  }

  return new EmailSenderError('SEND_FAILED');
}
