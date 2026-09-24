'use client';

import { useId, useState } from 'react';
import {
  Button,
  Card,
  CardAction,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Empty,
  EmptyHeader,
  EmptyDescription,
  Skeleton,
} from '@inbox-triage/ui';
import { BRIEF_REVIEW_MAX_BODY_LENGTH } from '../brief-review/brief-review-v1.config';
import type { EmailAddressDto, EmailMessageDto } from '../dto/email.dto';
import { formatEmailDate } from '../lib/format-email-date';
import { useBriefReview } from '../hooks/use-brief-review';
import { EmailFailure } from './email-failure';
import { EmailReviewPanel } from './email-review-panel';

function addresses(values: EmailAddressDto[]): string {
  return values
    .map(({ name, address }) => (name ? `${name} <${address}>` : address))
    .join(', ');
}

// Mirrors the server's checks so the action explains why it's unavailable.
function getReviewUnavailableReason(text: string | null): string | null {
  if (!text?.trim()) {
    return 'Review needs plain-text content.';
  }

  if (text.length > BRIEF_REVIEW_MAX_BODY_LENGTH) {
    return 'This email is too long to review.';
  }

  return null;
}

export function EmailDetail({
  message,
  loading,
  error,
  retry,
}: {
  message: EmailMessageDto | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}) {
  const [contentHidden, setContentHidden] = useState(false);
  const contentId = useId();
  const briefReview = useBriefReview();

  if (loading)
    return (
      <div
        role="status"
        aria-label="Loading email"
        className="flex flex-col gap-4"
      >
        <Skeleton className="h-8 w-2/3" />

        <Skeleton className="h-24 w-full" />

        <Skeleton className="h-64 w-full" />
      </div>
    );
  if (error) return <EmailFailure message={error} retry={retry} />;
  if (!message)
    return (
      <Empty>
        <EmptyHeader>
          <EmptyDescription>
            Select an email to view its contents.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="wrap-anywhere">
            {message.subject || 'No subject'}
          </CardTitle>

          <CardDescription className="wrap-anywhere">
            {addresses(message.from)}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm wrap-anywhere">
            <dt className="text-muted-foreground">Date</dt>

            <dd>
              {formatEmailDate(message.sentAt ?? message.receivedAt, {
                detail: true,
              })}
            </dd>

            <dt className="text-muted-foreground">To</dt>

            <dd>{addresses(message.to) || 'No recipients'}</dd>

            {message.cc.length > 0 && (
              <>
                <dt className="text-muted-foreground">CC</dt>

                <dd>{addresses(message.cc)}</dd>
              </>
            )}

            {message.replyTo.length > 0 && (
              <>
                <dt className="text-muted-foreground">Reply-To</dt>

                <dd>{addresses(message.replyTo)}</dd>
              </>
            )}
          </dl>
        </CardContent>
      </Card>

      <EmailReviewPanel
        result={briefReview.result}
        error={briefReview.error}
        loading={briefReview.loading}
        unavailableReason={getReviewUnavailableReason(message.text)}
        onReview={() => void briefReview.review(message.ref)}
      />

      <Card>
        <CardHeader>
          <CardTitle>Email content</CardTitle>

          <CardAction>
            <Button
              variant="outline"
              aria-expanded={!contentHidden}
              aria-controls={contentId}
              onClick={() => setContentHidden((hidden) => !hidden)}
            >
              {contentHidden ? 'Show content' : 'Hide content'}
            </Button>
          </CardAction>
        </CardHeader>

        <CardContent id={contentId} hidden={contentHidden}>
          {message.text !== null && message.text.length > 0 ? (
            <div className="text-sm leading-relaxed whitespace-pre-wrap wrap-anywhere">
              {message.text}
            </div>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyDescription>
                  Plain-text content is unavailable for this email.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
