export type EmailClientErrorCode =
  | 'AUTHENTICATION_FAILED'
  | 'CONNECTION_FAILED'
  | 'INVALID_PAGE_TOKEN'
  | 'INVALID_MESSAGE_REF'
  | 'MESSAGE_NOT_FOUND'
  | 'MESSAGE_TOO_LARGE'
  | 'UNKNOWN';

const ERROR_MESSAGES: Record<EmailClientErrorCode, string> = {
  AUTHENTICATION_FAILED: 'The email provider rejected the credentials.',
  CONNECTION_FAILED: 'Could not connect to the email provider.',
  INVALID_PAGE_TOKEN: 'The inbox page token is invalid or stale.',
  INVALID_MESSAGE_REF: 'The message reference is invalid.',
  MESSAGE_NOT_FOUND: 'The email message was not found.',
  MESSAGE_TOO_LARGE: 'The email message is too large to download.',
  UNKNOWN: 'The email provider request failed.',
};

export class EmailClientError extends Error {
  readonly code: EmailClientErrorCode;

  constructor(code: EmailClientErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = 'EmailClientError';
    this.code = code;
  }
}
