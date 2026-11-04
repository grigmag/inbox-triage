'use client';

import { Empty, EmptyHeader, EmptyDescription } from '@inbox-triage/ui';
import type { EmailMessageDto } from '@/features/emails/dto/email.dto';
import { EmailBodyText } from './email-body-text';
import { EmailDetailHeader } from './email-detail-header';
import { EmailDetailHeaderAction } from './email-detail-header-action';
import { EmailDetailProvider } from './email-detail-provider';
import { EmailReplyComposer } from './reply-composer/email-reply-composer';
import { EmailReviewPanel } from './review-panel/email-review-panel';

export function EmailDetailContent({
  message,
  replyFooter,
}: {
  message: EmailMessageDto;
  replyFooter: string | null;
}) {
  return (
    <EmailDetailProvider message={message} replyFooter={replyFooter}>
      <div className="mx-auto flex w-full max-w-[820px] flex-col gap-10">
        <article className="flex flex-col gap-6">
          <EmailDetailHeader
            message={message}
            action={<EmailDetailHeaderAction />}
          />

          {message.text !== null && message.text.length > 0 ? (
            <EmailBodyText text={message.text} />
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyDescription>
                  Plain-text content is unavailable for this email.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </article>

        <EmailReviewPanel />

        <EmailReplyComposer />
      </div>
    </EmailDetailProvider>
  );
}
