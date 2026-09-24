import type {
  EmailMessage,
  EmailSummary,
  MessageRef,
} from './email-message.types';
import type { EmailCredentials } from './email-credentials.types';

export interface MailboxReader {
  listInbox(options?: ListInboxOptions): Promise<EmailPage>;
  /** Returns every newer inbox summary, newest first, from one UID snapshot. */
  listInboxNewerThan(ref: MessageRef): Promise<EmailSummary[]>;
  getMessage(ref: MessageRef): Promise<EmailMessage>;
  close(): Promise<void>;
}

export interface ListInboxOptions {
  /**
   * Continuation token returned by listInbox(). Pass it unchanged to the next
   * listInbox() call. Do not construct or depend on its internal format.
   */
  pageToken?: string;
  limit?: number;
}

export interface EmailPage {
  messages: EmailSummary[];
  nextPageToken: string | null;
}

export interface MailboxReaderConfig {
  provider: 'zoho';
  imapHost: string;
  credentials: EmailCredentials;
}
