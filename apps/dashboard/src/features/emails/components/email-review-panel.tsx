'use client';

import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Skeleton,
  Spinner,
} from '@inbox-triage/ui';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ClipboardCheckIcon,
  ReplyIcon,
  SparklesIcon,
} from 'lucide-react';
import { BRIEF_REVIEW_V1_FIELDS } from '../brief-review/brief-review-v1.config';
import type { BriefEvaluationOutput } from '../brief-review/brief-review-v1.schema';
import { summarizeBriefReview } from '../lib/summarize-brief-review';
import { BriefReviewDetails } from './brief-review-details';
import {
  BriefReviewGapFieldBadge,
  BriefReviewMeter,
  BriefReviewOutcomeBadge,
  getClearCountText,
  getReplySentence,
  getStripReplyText,
} from './brief-review-status';

/**
 * How much of a review result the card shows. `strip` is one line and applies
 * only once a reply has started.
 */
export type BriefReviewCollapseLevel = 'strip' | 'summary' | 'details';

function ReviewErrorAlert({ error }: { error: string }) {
  return (
    <Alert variant="destructive">
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
}

function ReviewAgainButton({
  loading,
  disabled,
  onReview,
}: {
  loading: boolean;
  disabled: boolean;
  onReview: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onReview}
      disabled={loading || disabled}
    >
      {loading && <Spinner data-icon="inline-start" />}
      Review again
    </Button>
  );
}

function DraftReplyButton({
  questionCount,
  disabled,
  onClick,
  size,
}: {
  questionCount: number;
  disabled: boolean;
  onClick: () => void;
  size?: 'sm';
}) {
  return (
    <Button size={size} onClick={onClick} disabled={disabled}>
      <ReplyIcon data-icon="inline-start" />

      {questionCount > 0 ? 'Draft reply' : 'Write reply'}
    </Button>
  );
}

export function EmailReviewPanel({
  result,
  error,
  loading,
  unavailableReason,
  onReview,
  draftReplyDisabled,
  onDraftReply,
  replyStarted,
  replyPending,
  level,
  onLevelChange,
  selectedQuestionIndices,
  onQuestionCheckedChange,
  questionsDisabled,
}: {
  result: BriefEvaluationOutput | null;
  error: string | null;
  loading: boolean;
  unavailableReason: string | null;
  onReview: () => void;
  draftReplyDisabled: boolean;
  /**
   * Omitted when no reply is available or once a draft exists; the composer
   * regenerates it. Without questions it opens a blank reply. It also
   * collapses the card to the strip, so the composer becomes the focus of the
   * pane.
   */
  onDraftReply?: () => void;
  /** A draft, a request in progress, or a reply error exists. */
  replyStarted: boolean;
  /** A reply is being generated or sent. */
  replyPending: boolean;
  /** Held by the owner so the header action can collapse the card too. */
  level: BriefReviewCollapseLevel;
  onLevelChange: (level: BriefReviewCollapseLevel) => void;
  /** The questions the next generation asks, checked in the details. */
  selectedQuestionIndices: readonly number[];
  onQuestionCheckedChange: (index: number, checked: boolean) => void;
  questionsDisabled: boolean;
}) {
  const reviewDisabled = unavailableReason !== null;

  if (!result && loading) {
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

  if (!result) {
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
            {unavailableReason ??
              'Check whether this email is a complete production brief and draft a reply asking for anything missing.'}
          </CardDescription>

          <CardAction>
            <Button onClick={onReview} disabled={reviewDisabled}>
              <SparklesIcon data-icon="inline-start" />

              {error ? 'Try again' : 'Review brief'}
            </Button>
          </CardAction>
        </CardHeader>

        {error && (
          <CardContent>
            <ReviewErrorAlert error={error} />
          </CardContent>
        )}
      </Card>
    );
  }

  if (result.outcome === 'irrelevant') {
    return (
      <Card size="sm">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Brief review</CardTitle>

            <BriefReviewOutcomeBadge outcome={result.outcome} />
          </div>

          <CardAction>
            <ReviewAgainButton
              loading={loading}
              disabled={reviewDisabled}
              onReview={onReview}
            />
          </CardAction>
        </CardHeader>

        <CardContent className="flex flex-col gap-3 wrap-anywhere">
          {error && <ReviewErrorAlert error={error} />}

          <p className="text-muted-foreground">{result.outcomeReason}</p>
        </CardContent>
      </Card>
    );
  }

  const summary = summarizeBriefReview(result, selectedQuestionIndices);
  const clearCount = getClearCountText(summary.provided.length);
  // The strip exists only beside a reply. Before one starts, the result is
  // always open.
  const open = !replyStarted || level !== 'strip';
  const showDetails = level === 'details';

  return (
    <Collapsible
      open={open}
      onOpenChange={(nextOpen) => onLevelChange(nextOpen ? 'summary' : 'strip')}
      render={<Card size="sm" />}
    >
      {/* The action spans one row so it centers against the title line. */}
      <CardHeader className="items-center">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <CardTitle>Brief review</CardTitle>

          <BriefReviewOutcomeBadge outcome={result.outcome} />

          {!open && (
            <span className="text-muted-foreground">
              {`${clearCount} clear · ${getStripReplyText(summary)}`}
            </span>
          )}
        </div>

        <CardAction className="row-span-1 flex items-center gap-1 self-center">
          {open && (
            <ReviewAgainButton
              loading={loading}
              disabled={reviewDisabled}
              onReview={onReview}
            />
          )}

          {/* Retries a failed first generation without reopening the card. */}
          {!open && onDraftReply && !replyPending && (
            <DraftReplyButton
              size="sm"
              questionCount={summary.selectedQuestionCount}
              disabled={draftReplyDisabled}
              onClick={onDraftReply}
            />
          )}

          {replyStarted && (
            <CollapsibleTrigger render={<Button variant="ghost" size="sm" />}>
              {open ? 'Hide' : 'Show'}

              <span className="sr-only"> brief review</span>

              {open ? (
                <ChevronUpIcon data-icon="inline-end" />
              ) : (
                <ChevronDownIcon data-icon="inline-end" />
              )}
            </CollapsibleTrigger>
          )}
        </CardAction>
      </CardHeader>

      {error && (
        <CardContent>
          <ReviewErrorAlert error={error} />
        </CardContent>
      )}

      <CollapsibleContent
        render={<CardContent className="flex flex-col gap-4 wrap-anywhere" />}
      >
        <p className="leading-relaxed">{result.summary}</p>

        <div className="flex items-center gap-3">
          <BriefReviewMeter
            fields={result.fields}
            label={`${clearCount} details clear`}
          />

          <span className="shrink-0 text-muted-foreground">
            {clearCount} details clear
          </span>
        </div>

        {summary.gaps.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-muted-foreground">Unclear</span>

            {summary.gaps.map((fieldKey) => {
              const status = result.fields[fieldKey].status;

              return status === 'provided' ? null : (
                <BriefReviewGapFieldBadge
                  key={fieldKey}
                  status={status}
                  label={BRIEF_REVIEW_V1_FIELDS[fieldKey].label}
                />
              );
            })}
          </div>
        ) : (
          <p className="text-muted-foreground">
            Every detail needed for a quote is in the email.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {onDraftReply && (
            <DraftReplyButton
              questionCount={summary.selectedQuestionCount}
              disabled={draftReplyDisabled}
              onClick={onDraftReply}
            />
          )}

          <p className="text-muted-foreground">{getReplySentence(summary)}</p>
        </div>

        <Collapsible
          open={showDetails}
          onOpenChange={(nextOpen) =>
            onLevelChange(nextOpen ? 'details' : 'summary')
          }
          className="flex flex-col gap-4"
        >
          <CollapsibleContent>
            <BriefReviewDetails
              review={result}
              summary={summary}
              selectedQuestionIndices={selectedQuestionIndices}
              onQuestionCheckedChange={onQuestionCheckedChange}
              questionsDisabled={questionsDisabled}
            />
          </CollapsibleContent>

          <CollapsibleTrigger
            render={<Button variant="ghost" size="sm" className="self-start" />}
          >
            {showDetails ? 'Show less' : 'Show details'}

            {showDetails ? (
              <ChevronUpIcon data-icon="inline-end" />
            ) : (
              <ChevronDownIcon data-icon="inline-end" />
            )}
          </CollapsibleTrigger>
        </Collapsible>
      </CollapsibleContent>
    </Collapsible>
  );
}
