import type { EmailCredentials } from './email-credentials.types';
import type { EmailAddress, EmailMessage } from './email-message.types';

export interface EmailSenderConfig {
  provider: 'zoho';
  smtpHost: string;
  credentials: EmailCredentials;
  /** The mailbox's IANA time zone, such as `Europe/Athens`, for quoted dates. */
  timezone: string;
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

interface ReplyDestinations {
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
}

export type ReplyEmailInput = ReplyDestinations &
  (
    | { text?: string; html?: string; quoteParent?: false }
    | {
        text: string;
        html?: undefined;
        /**
         * Quotes the parent below `text` in the provider's reply format, which
         * builds both the text and HTML bodies. The reply is sent without the
         * quote when the quoted bodies would exceed the size limit.
         */
        quoteParent: true;
      }
  );

export interface SendEmailResult {
  messageId: string;
  acceptedRecipients: string[];
  rejectedRecipients: string[];
}

export interface ReplyEmailResult extends SendEmailResult {
  /** False when no quote was requested or it was left out for size. */
  quotedParent: boolean;
}

export interface EmailSender {
  send(input: SendEmailInput): Promise<SendEmailResult>;
  reply(
    parent: EmailMessage,
    input: ReplyEmailInput,
  ): Promise<ReplyEmailResult>;
  close(): Promise<void>;
}
