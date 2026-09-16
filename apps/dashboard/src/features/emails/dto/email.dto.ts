import type {
  EmailAddress,
  EmailMessage,
  EmailSummary,
} from '@inbox-triage/email';

export type EmailAddressDto = { name: string | null; address: string };

export type EmailSummaryDto = {
  ref: string;
  from: EmailAddressDto[];
  subject: string | null;
  receivedAt: string;
  isRead: boolean;
};

export type EmailPageDto = {
  messages: EmailSummaryDto[];
  nextPageToken: string | null;
};

export type EmailMessageDto = EmailSummaryDto & {
  to: EmailAddressDto[];
  cc: EmailAddressDto[];
  replyTo: EmailAddressDto[];
  sentAt: string | null;
  text: string | null;
};

function toEmailAddressDto(address: EmailAddress): EmailAddressDto {
  return { name: address.name, address: address.address };
}

export function toEmailSummaryDto(summary: EmailSummary): EmailSummaryDto {
  return {
    ref: summary.ref,
    from: summary.from.map(toEmailAddressDto),
    subject: summary.subject,
    receivedAt: summary.receivedAt.toISOString(),
    isRead: summary.isRead,
  };
}

export function toEmailMessageDto(message: EmailMessage): EmailMessageDto {
  return {
    ...toEmailSummaryDto(message),
    to: message.to.map(toEmailAddressDto),
    cc: message.cc.map(toEmailAddressDto),
    replyTo: message.replyTo.map(toEmailAddressDto),
    sentAt: message.sentAt?.toISOString() ?? null,
    text: message.text,
  };
}
