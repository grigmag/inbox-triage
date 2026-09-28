import { Avatar, AvatarFallback } from '@inbox-triage/ui';
import { ReplyIcon } from 'lucide-react';
import type { EmailAddressDto, EmailMessageDto } from '../dto/email.dto';
import { getReplyRecipients, getReplySubject } from '../lib/get-reply-envelope';
import { getSenderInitials } from '../lib/get-sender-initials';

/** A recipient chip. The address is its accessible name. */
function RecipientChip({ recipient }: { recipient: EmailAddressDto }) {
  return (
    <li
      title={recipient.address}
      className="flex min-w-0 items-center gap-1.5 rounded-full bg-muted py-0.5 pr-2.5 pl-0.5"
    >
      <Avatar size="sm" aria-hidden>
        <AvatarFallback>{getSenderInitials(recipient)}</AvatarFallback>
      </Avatar>

      {recipient.name ? (
        <>
          <span aria-hidden className="truncate">
            {recipient.name}
          </span>

          <span className="sr-only">{recipient.address}</span>
        </>
      ) : (
        <span className="truncate">{recipient.address}</span>
      )}
    </li>
  );
}

/** The reply's recipients and subject, the composer's top row. */
export function EmailReplyHeader({ message }: { message: EmailMessageDto }) {
  const recipients = getReplyRecipients(message);
  const subject = getReplySubject(message.subject);

  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <ReplyIcon aria-hidden className="size-4 text-muted-foreground" />

        <span className="text-muted-foreground">To</span>

        {recipients.length > 0 ? (
          <ul className="flex min-w-0 flex-wrap items-center gap-1.5">
            {recipients.map((recipient, index) => (
              <RecipientChip
                key={`${recipient.address}-${index}`}
                recipient={recipient}
              />
            ))}
          </ul>
        ) : (
          <span className="text-muted-foreground">No recipients</span>
        )}
      </div>

      <p
        title={subject}
        className="max-w-1/2 min-w-0 shrink truncate text-muted-foreground"
      >
        {subject}
      </p>
    </div>
  );
}
