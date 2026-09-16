import { Badge, cn } from '@inbox-triage/ui';
import type { EmailSummaryDto } from '../dto/email.dto';
import { formatEmailDate } from '../lib/format-email-date';

export function EmailList({
  messages,
  selectedRef,
  select,
}: {
  messages: EmailSummaryDto[];
  selectedRef: string | null;
  select: (ref: string) => void;
}) {
  return (
    <ul className="flex flex-col">
      {messages.map((message) => (
        <li key={message.ref}>
          <button
            type="button"
            aria-pressed={selectedRef === message.ref}
            onClick={() => select(message.ref)}
            className={cn(
              'hover:bg-muted focus-visible:ring-ring flex w-full flex-col gap-2 border-b p-4 text-left focus-visible:ring-2 focus-visible:outline-none',
              selectedRef === message.ref && 'bg-accent text-accent-foreground',
            )}
          >
            <div className="flex w-full items-center justify-between gap-3">
              <span className="truncate text-sm font-medium">
                {message.from
                  .map(({ name, address }) => name || address)
                  .join(', ') || 'Unknown sender'}
              </span>

              <time
                dateTime={message.receivedAt}
                className="text-muted-foreground shrink-0 text-xs"
              >
                {formatEmailDate(message.receivedAt)}
              </time>
            </div>

            <div className="flex w-full items-center gap-2">
              <span className="truncate text-sm">
                {message.subject || 'No subject'}
              </span>

              {!message.isRead && <Badge variant="secondary">Unread</Badge>}
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
