export type EmailSenderErrorCode =
  | 'AUTHENTICATION_FAILED'
  | 'CONNECTION_FAILED'
  | 'ENVELOPE_REJECTED'
  | 'INVALID_MESSAGE'
  | 'REPLY_MESSAGE_ID_MISSING'
  | 'REPLY_RECIPIENT_MISSING'
  | 'SEND_FAILED';

const ERROR_MESSAGES: Record<EmailSenderErrorCode, string> = {
  AUTHENTICATION_FAILED: 'The email provider rejected the credentials.',
  CONNECTION_FAILED: 'Could not connect to the email provider.',
  ENVELOPE_REJECTED:
    'The email provider rejected the sender or recipients before the message was sent.',
  INVALID_MESSAGE: 'The email message is invalid.',
  REPLY_MESSAGE_ID_MISSING:
    'The message cannot be replied to without a message ID.',
  REPLY_RECIPIENT_MISSING: 'The message has no reply recipient.',
  SEND_FAILED: 'The email provider did not confirm the message was sent.',
};

export class EmailSenderError extends Error {
  readonly code: EmailSenderErrorCode;

  constructor(code: EmailSenderErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = 'EmailSenderError';
    this.code = code;
  }
}
