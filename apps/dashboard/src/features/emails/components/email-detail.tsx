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
import type { EmailMessageDto } from '../dto/email.dto';
import { formatEmailAddresses } from '../lib/format-email-addresses';
import { formatEmailDate } from '../lib/format-email-date';
import { useBriefReply } from '../hooks/use-brief-reply';
import { useBriefReview } from '../hooks/use-brief-review';
import { EmailFailure } from './email-failure';
import { EmailReplyComposer } from './email-reply-composer';
import { EmailReviewPanel } from './email-review-panel';

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
  const briefReply = useBriefReply();

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

  const review = briefReview.result;
  const replyAvailable = review !== null && review.outcome !== 'irrelevant';
  // Generation always uses the latest review's questions. A brief with none
  // gets a blank reply instead, because there is nothing for AI to ask.
  const replyQuestions =
    replyAvailable && review.missingInformation.length > 0
      ? {
          language: review.language,
          questions: review.missingInformation,
        }
      : null;
  const messageRef = message.ref;

  function draftReply() {
    if (replyQuestions) {
      void briefReply.generate(messageRef, replyQuestions);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="wrap-anywhere">
            {message.subject || 'No subject'}
          </CardTitle>

          <CardDescription className="wrap-anywhere">
            {formatEmailAddresses(message.from)}
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

            <dd>{formatEmailAddresses(message.to) || 'No recipients'}</dd>

            {message.cc.length > 0 && (
              <>
                <dt className="text-muted-foreground">CC</dt>

                <dd>{formatEmailAddresses(message.cc)}</dd>
              </>
            )}

            {message.replyTo.length > 0 && (
              <>
                <dt className="text-muted-foreground">Reply-To</dt>

                <dd>{formatEmailAddresses(message.replyTo)}</dd>
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
        draftReplyDisabled={briefReview.loading || briefReply.pending !== null}
        onDraftReply={
          replyAvailable && briefReply.draft === null
            ? replyQuestions
              ? draftReply
              : briefReply.startBlank
            : undefined
        }
      />

      {briefReply.started && (
        <EmailReplyComposer
          message={message}
          reply={briefReply}
          canRegenerate={!briefReview.loading}
          onRegenerate={replyQuestions ? draftReply : undefined}
        />
      )}

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
