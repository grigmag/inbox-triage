import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@inbox-triage/ui';
import { ChevronRightIcon } from 'lucide-react';
import type { EmailMessageDto } from '@/features/emails/dto/email.dto';
import { formatEmailAddresses } from '@/features/emails/lib/format-email-addresses';
import { formatEmailDate } from '@/features/emails/lib/format-email-date';

/**
 * A collapsed, illustrative preview of the quoted original. The email package
 * builds the real quote at send time, so the date format and layout here only
 * approximate it.
 */
export function EmailReplyQuotePreview({
  message,
}: {
  message: EmailMessageDto;
}) {
  const attribution = [
    `From: ${formatEmailAddresses(message.from)}`,
    `To: ${formatEmailAddresses(message.to)}`,
    message.cc.length > 0 && `Cc: ${formatEmailAddresses(message.cc)}`,
    `Date: ${formatEmailDate(message.sentAt ?? message.receivedAt, { detail: true })}`,
    message.subject !== null && `Subject: ${message.subject}`,
  ].filter((line) => line !== false);
  const text = message.text?.trim();

  return (
    <Collapsible className="flex flex-col gap-2">
      <CollapsibleTrigger
        render={
          <Button variant="ghost" size="sm" className="-ml-2 self-start" />
        }
      >
        <ChevronRightIcon
          data-icon="inline-start"
          className="in-data-panel-open:rotate-90 motion-safe:transition-transform"
        />
        Original email is quoted below when sent
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="flex flex-col gap-3 border-l-2 pl-3 text-xs/5 text-muted-foreground wrap-anywhere">
          <div>
            {attribution.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>

          {text && <p className="line-clamp-6 whitespace-pre-wrap">{text}</p>}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
