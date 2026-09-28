import { cn } from '@inbox-triage/ui';
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
      {messages.map((message) => {
        const selected = selectedRef === message.ref;
        return (
          <li key={message.ref}>
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => select(message.ref)}
              className={cn(
                'hover:bg-muted focus-visible:ring-ring relative flex w-full flex-col border-b px-4 py-3 text-left focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset',
                selected && 'bg-accent text-accent-foreground hover:bg-accent',
              )}
            >
              {selected && (
                <span
                  aria-hidden
                  className="bg-primary absolute inset-y-2 left-0 w-0.5 rounded-full"
                />
              )}

              <div className="flex w-full items-baseline justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5">
                  {!message.isRead && (
                    <span className="bg-primary size-1.5 shrink-0 rounded-full">
                      <span className="sr-only">Unread</span>
                    </span>
                  )}

                  <span
                    className={cn(
                      'truncate text-sm font-medium',
                      !message.isRead && 'font-semibold',
                    )}
                  >
                    {message.from
                      .map(({ name, address }) => name || address)
                      .join(', ') || 'Unknown sender'}
                  </span>
                </span>

                <time
                  dateTime={message.receivedAt}
                  className="text-muted-foreground shrink-0 text-xs"
                >
                  {formatEmailDate(message.receivedAt)}
                </time>
              </div>

              <span className="w-full truncate text-[13px]">
                {message.subject || 'No subject'}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
