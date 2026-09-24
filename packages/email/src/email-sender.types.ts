import type { EmailCredentials } from './email-credentials.types';
import type { EmailAddress, EmailMessage } from './email-message.types';

export interface EmailSenderConfig {
  provider: 'zoho';
  smtpHost: string;
  credentials: EmailCredentials;
}

export interface SendEmailInput {
  to?: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject?: string;
  text?: string;
  html?: string;
  replyTo?: EmailAddress[];
}

export interface ReplyEmailInput {
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  text?: string;
  html?: string;
}

export interface SendEmailResult {
  messageId: string;
  acceptedRecipients: string[];
  rejectedRecipients: string[];
}

export interface EmailSender {
  send(input: SendEmailInput): Promise<SendEmailResult>;
  reply(parent: EmailMessage, input: ReplyEmailInput): Promise<SendEmailResult>;
  close(): Promise<void>;
}
