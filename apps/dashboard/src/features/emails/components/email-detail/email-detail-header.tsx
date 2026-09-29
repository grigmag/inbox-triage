import type { ReactNode } from 'react';
import { Avatar, AvatarFallback } from '@inbox-triage/ui';
import type { EmailMessageDto } from '@/features/emails/dto/email.dto';
import { formatEmailAddresses } from '@/features/emails/lib/format-email-addresses';
import { formatEmailDate } from '@/features/emails/lib/format-email-date';
import { getSenderInitials } from '@/features/emails/lib/get-sender-initials';

export function EmailDetailHeader({
  message,
  action,
}: {
  message: EmailMessageDto;
  /** The primary action shown beside the subject. */
  action?: ReactNode;
}) {
  const sender = message.from[0];
  const date = formatEmailDate(message.sentAt ?? message.receivedAt, {
    detail: true,
  });
  const recipientsLine = [
    `to ${formatEmailAddresses(message.to) || 'no recipients'}`,
    date,
    message.cc.length > 0 && `cc ${formatEmailAddresses(message.cc)}`,
    message.replyTo.length > 0 &&
      `reply-to ${formatEmailAddresses(message.replyTo)}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <header className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-xl font-semibold wrap-anywhere">
          {message.subject || 'No subject'}
        </h2>

        {action && <div className="shrink-0">{action}</div>}
      </div>

      <div className="flex items-start gap-3">
        <Avatar size="lg" aria-hidden>
          <AvatarFallback>
            {sender ? getSenderInitials(sender) : '?'}
          </AvatarFallback>
        </Avatar>

        <div className="flex min-w-0 flex-col gap-0.5 text-sm">
          <p className="wrap-anywhere">
            {message.from.length > 0 ? (
              message.from.map(({ name, address }, index) => (
                <span key={`${address}-${index}`}>
                  {index > 0 && ', '}

                  {name ? (
                    <>
                      <span className="font-medium">{name}</span>

                      <span className="text-muted-foreground">
                        {` <${address}>`}
                      </span>
                    </>
                  ) : (
                    <span className="font-medium">{address}</span>
                  )}
                </span>
              ))
            ) : (
              <span className="text-muted-foreground">Unknown sender</span>
            )}
          </p>

          <p className="text-muted-foreground wrap-anywhere">
            {recipientsLine}
          </p>
        </div>
      </div>
    </header>
  );
}
