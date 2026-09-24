export type MailboxReaderErrorCode =
  | 'AUTHENTICATION_FAILED'
  | 'CONNECTION_FAILED'
  | 'INVALID_PAGE_TOKEN'
  | 'INVALID_MESSAGE_REF'
  | 'MESSAGE_NOT_FOUND'
  | 'MESSAGE_TOO_LARGE'
  | 'UNKNOWN';

const ERROR_MESSAGES: Record<MailboxReaderErrorCode, string> = {
  AUTHENTICATION_FAILED: 'The email provider rejected the credentials.',
  CONNECTION_FAILED: 'Could not connect to the email provider.',
  INVALID_PAGE_TOKEN: 'The inbox page token is invalid or stale.',
  INVALID_MESSAGE_REF: 'The message reference is invalid.',
  MESSAGE_NOT_FOUND: 'The email message was not found.',
  MESSAGE_TOO_LARGE: 'The email message is too large to download.',
  UNKNOWN: 'The email provider request failed.',
};

/**
 * Token-like provider details for server logs. Never contains response text,
 * executed commands, credentials, or message data.
 */
export interface MailboxReaderErrorDiagnostic {
  providerErrorCode?: string;
  responseStatus?: string;
  serverResponseCode?: string;
}

export class MailboxReaderError extends Error {
  readonly code: MailboxReaderErrorCode;
  readonly diagnostic: MailboxReaderErrorDiagnostic;

  constructor(
    code: MailboxReaderErrorCode,
    diagnostic: MailboxReaderErrorDiagnostic = {},
  ) {
    super(ERROR_MESSAGES[code]);
    this.name = 'MailboxReaderError';
    this.code = code;
    this.diagnostic = diagnostic;
  }
}
