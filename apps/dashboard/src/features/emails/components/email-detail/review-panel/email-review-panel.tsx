'use client';

import { useEffect, useRef } from 'react';
import {
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@inbox-triage/ui';
import { ClipboardCheckIcon, SparklesIcon } from 'lucide-react';
import type { BriefEvaluationOutput } from '@/features/emails/brief-review/brief-review-v1.schema';
import { scrollIntoViewGently } from '@/lib/dom/scroll-into-view-gently';
import { useEmailDetail } from '../email-detail-context';
import { BriefReviewErrorAlert } from './brief-review-error-alert';
import { BriefReviewOutcomeBadge } from './brief-review-outcome-badge';
import { BriefReviewResultCard } from './brief-review-result-card';
import { ReviewAgainButton } from './review-again-button';

/** The first review is running, with no earlier result to keep showing. */
function ReviewLoadingCard() {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Brief review
          <span className="font-normal text-muted-foreground">
            Reviewing...
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div
          role="status"
          aria-label="Reviewing email"
          className="flex flex-col gap-3"
        >
          <Skeleton className="h-5 w-1/3" />

          <Skeleton className="h-4 w-full" />

          <Skeleton className="h-4 w-2/3" />
        </div>
      </CardContent>
    </Card>
  );
}

/** No review yet: offers one, or explains why it is unavailable. */
function ReviewPromptCard() {
  const {
    state: { review },
    actions: { reviewBrief },
  } = useEmailDetail();

  return (
    <Card size="sm" className="border border-dashed bg-transparent ring-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheckIcon
            aria-hidden="true"
            className="size-4 text-muted-foreground"
          />
          Brief review
        </CardTitle>

        <CardDescription>
          {review.unavailableReason ??
            'Check whether this email is a complete production brief and draft a reply asking for anything missing.'}
        </CardDescription>

        <CardAction>
          <Button
            onClick={reviewBrief}
            disabled={review.unavailableReason !== null}
          >
            <SparklesIcon data-icon="inline-start" />

            {review.error ? 'Try again' : 'Review brief'}
          </Button>
        </CardAction>
      </CardHeader>

      {review.error && (
        <CardContent>
          <BriefReviewErrorAlert error={review.error} />
        </CardContent>
      )}
    </Card>
  );
}

/** The email is not a production brief, so there is no reply to draft. */
function IrrelevantReviewCard({ result }: { result: BriefEvaluationOutput }) {
  const {
    state: { review },
  } = useEmailDetail();

  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>Brief review</CardTitle>

          <BriefReviewOutcomeBadge outcome={result.outcome} />
        </div>

        <CardAction>
          <ReviewAgainButton />
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-3 wrap-anywhere">
        {review.error && <BriefReviewErrorAlert error={review.error} />}

        <p className="text-muted-foreground">{result.outcomeReason}</p>
      </CardContent>
    </Card>
  );
}

function BriefReviewCard() {
  const {
    state: { review },
  } = useEmailDetail();
  const { result } = review;

  if (!result) {
    return review.loading ? <ReviewLoadingCard /> : <ReviewPromptCard />;
  }

  if (result.outcome === 'irrelevant') {
    return <IrrelevantReviewCard result={result} />;
  }

  return <BriefReviewResultCard result={result} />;
}

export function EmailReviewPanel() {
  const {
    state: { review },
  } = useEmailDetail();
  const panelRef = useRef<HTMLDivElement>(null);

  // The card sits below the email, often out of view. Reveal a new result or
  // error; `nearest` leaves an already visible card where it is.
  useEffect(() => {
    if ((review.result || review.error) && panelRef.current) {
      scrollIntoViewGently(panelRef.current, 'nearest');
    }
  }, [review.result, review.error]);

  return (
    <div ref={panelRef} className="scroll-my-6">
      <BriefReviewCard />
    </div>
  );
}
