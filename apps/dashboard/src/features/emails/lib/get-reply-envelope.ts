import type { EmailAddressDto, EmailMessageDto } from '../dto/email.dto';

// Display only. The server derives the real recipients and subject from the
// parent message with the same rules.

export function getReplyRecipients(
  message: EmailMessageDto,
): EmailAddressDto[] {
  return message.replyTo.length > 0 ? message.replyTo : message.from;
}

export function getReplySubject(subject: string | null): string {
  if (subject === null) {
    return 'No subject';
  }

  return /^re:/i.test(subject) ? subject : `Re: ${subject}`;
}
