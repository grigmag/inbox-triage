export interface EmailAddress {
  name: string | null;
  address: string;
}

/**
 * A package-generated reference to one message in the connected mailbox.
 * Pass it back unchanged to getMessage(). Do not create or inspect this value.
 */
export type MessageRef = string;

export interface EmailSummary {
  ref: MessageRef;
  from: EmailAddress[];
  subject: string | null;
  receivedAt: Date;
  isRead: boolean;
  sizeBytes: number;
}

export interface EmailMessage extends EmailSummary {
  messageId: string | null;
  to: EmailAddress[];
  cc: EmailAddress[];
  replyTo: EmailAddress[];
  sentAt: Date | null;
  text: string | null;
  html: string | null;
}
