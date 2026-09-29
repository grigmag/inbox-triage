import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@inbox-triage/ui';
import { ChevronRightIcon } from 'lucide-react';
import { useMemo } from 'react';
import { splitQuotedEmailText } from './split-quoted-email-text';

/**
 * The plain-text body of an email, with the quoted history of earlier
 * messages collapsed below the new content. Display only; the full text is
 * still what brief review and reply generation receive.
 */
export function EmailBodyText({ text }: { text: string }) {
  const { body, quoted } = useMemo(() => splitQuotedEmailText(text), [text]);

  return (
    <div className="flex max-w-[68ch] flex-col gap-4">
      <div className="text-base leading-7 whitespace-pre-wrap wrap-anywhere">
        {body}
      </div>

      {quoted !== null && (
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

            <span className="in-data-panel-open:hidden">
              Show message history
            </span>

            <span className="hidden in-data-panel-open:inline">
              Hide message history
            </span>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="border-l-2 pl-3 text-sm leading-6 whitespace-pre-wrap text-muted-foreground wrap-anywhere">
              {quoted}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
