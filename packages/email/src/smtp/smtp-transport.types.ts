import type { EmailAddress } from '../email-message.types';

export interface SmtpMessage {
  from: string;
  envelope: {
    from: string;
    to: string[];
  };
  to?: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject?: string;
  text?: string;
  html?: string;
  replyTo?: EmailAddress[];
  inReplyTo?: string;
  references?: string[];
}

export interface SmtpSendResult {
  messageId: string;
  acceptedRecipients: string[];
  rejectedRecipients: string[];
}

export interface SmtpTransport {
  send(message: SmtpMessage): Promise<SmtpSendResult>;
  close(): void;
}

export type SmtpTransportErrorKind =
  'authentication' | 'connection' | 'unknown';

export class SmtpTransportError extends Error {
  readonly kind: SmtpTransportErrorKind;

  constructor(kind: SmtpTransportErrorKind) {
    super('SMTP transport request failed.');
    this.name = 'SmtpTransportError';
    this.kind = kind;
  }
}
