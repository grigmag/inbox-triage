import {
  Button,
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@inbox-triage/ui';
import { ChevronDownIcon, ChevronUpIcon, ReplyIcon } from 'lucide-react';
import {
  BRIEF_REVIEW_V1_FIELDS,
  BRIEF_REVIEW_V1_FIELD_KEYS,
} from '@/features/emails/brief-review/brief-review-v1.config';
import type { BriefEvaluationOutput } from '@/features/emails/brief-review/brief-review-v1.schema';
import { useEmailDetail } from '../email-detail-context';
import { summarizeBriefReview } from './summarize-brief-review';
import { BriefReviewDetails } from './brief-review-details';
import { BriefReviewErrorAlert } from './brief-review-error-alert';
import { BriefReviewGapBadge } from './brief-review-gap-badge';
import { BriefReviewMeter } from './brief-review-meter';
import { BriefReviewOutcomeBadge } from './brief-review-outcome-badge';
import { ReviewAgainButton } from './review-again-button';

/** "5 of 9", the number of provided fields out of all review fields. */
function getClearCountText(clearCount: number): string {
  return `${clearCount} of ${BRIEF_REVIEW_V1_FIELD_KEYS.length}`;
}

function getQuestionsText(count: number): string {
  return `${count} ${count === 1 ? 'question' : 'questions'}`;
}

/** "3 questions" when every question is selected, else "2 of 3 questions". */
function getAskedQuestionsText({
  questionCount,
  selectedQuestionCount,
}: {
  questionCount: number;
  selectedQuestionCount: number;
}): string {
  if (selectedQuestionCount === questionCount) {
    return getQuestionsText(questionCount);
  }

  return `${selectedQuestionCount} of ${getQuestionsText(questionCount)}`;
}

function getReplySentence({
  questionCount,
  selectedQuestionCount,
  selectedBlockingQuestionCount,
}: {
  questionCount: number;
  selectedQuestionCount: number;
  selectedBlockingQuestionCount: number;
}): string {
  if (questionCount === 0) {
    return 'Nothing to ask, so the reply starts blank.';
  }

  if (selectedQuestionCount === 0) {
    return 'No questions selected, so the reply starts blank.';
  }

  const asked = getAskedQuestionsText({
    questionCount,
    selectedQuestionCount,
  });
  const blocking =
    selectedBlockingQuestionCount > 0
      ? `, ${selectedBlockingQuestionCount} blocking`
      : '';

  return `The reply will ask ${asked}${blocking}.`;
}

function getStripReplyText({
  questionCount,
  selectedQuestionCount,
}: {
  questionCount: number;
  selectedQuestionCount: number;
}): string {
  if (questionCount === 0) {
    return 'reply starts blank';
  }

  if (selectedQuestionCount === 0) {
    return 'no questions selected';
  }

  return `reply asks ${getAskedQuestionsText({ questionCount, selectedQuestionCount })}`;
}

/** Points up while its section is open and down while it is closed. */
function DisclosureChevron({ open }: { open: boolean }) {
  if (open) {
    return <ChevronUpIcon data-icon="inline-end" />;
  }

  return <ChevronDownIcon data-icon="inline-end" />;
}

/** Without selected questions it opens a blank reply. */
function DraftReplyButton({ size }: { size?: 'sm' }) {
  const {
    state: { review, reply },
    actions: { startReply },
  } = useEmailDetail();

  return (
    <Button
      size={size}
      onClick={startReply}
      disabled={review.loading || reply.pending !== null}
    >
      <ReplyIcon data-icon="inline-start" />

      {review.selectedQuestionIndices.length > 0
        ? 'Draft reply'
        : 'Write reply'}
    </Button>
  );
}

/**
 * A review of a production brief: the summary, the gaps, and the reply it
 * leads to. Once a reply starts, it collapses to a one-line strip.
 */
export function BriefReviewResultCard({
  result,
}: {
  result: BriefEvaluationOutput;
}) {
  const {
    state: { review, reply },
    actions: { setReviewLevel },
  } = useEmailDetail();
  const summary = summarizeBriefReview(result, review.selectedQuestionIndices);
  const clearCount = getClearCountText(summary.provided.length);
  // The strip exists only beside a reply. Before one starts, the result is
  // always open.
  const open = !reply.started || review.level !== 'strip';
  const showDetails = review.level === 'details';

  return (
    <Collapsible
      open={open}
      onOpenChange={(nextOpen) =>
        setReviewLevel(nextOpen ? 'summary' : 'strip')
      }
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
          {open && <ReviewAgainButton />}

          {/* Retries a failed first generation without reopening the card. */}
          {!open && reply.canStart && reply.pending === null && (
            <DraftReplyButton size="sm" />
          )}

          {reply.started && (
            <CollapsibleTrigger render={<Button variant="ghost" size="sm" />}>
              {open ? 'Hide' : 'Show'}

              <span className="sr-only"> brief review</span>

              <DisclosureChevron open={open} />
            </CollapsibleTrigger>
          )}
        </CardAction>
      </CardHeader>

      {review.error && (
        <CardContent>
          <BriefReviewErrorAlert error={review.error} />
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
                <BriefReviewGapBadge
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
          {reply.canStart && <DraftReplyButton />}

          <p className="text-muted-foreground">{getReplySentence(summary)}</p>
        </div>

        <Collapsible
          open={showDetails}
          onOpenChange={(nextOpen) =>
            setReviewLevel(nextOpen ? 'details' : 'summary')
          }
          className="flex flex-col gap-4"
        >
          <CollapsibleContent>
            <BriefReviewDetails result={result} summary={summary} />
          </CollapsibleContent>

          <CollapsibleTrigger
            render={<Button variant="ghost" size="sm" className="self-start" />}
          >
            {showDetails ? 'Show less' : 'Show details'}

            <DisclosureChevron open={showDetails} />
          </CollapsibleTrigger>
        </Collapsible>
      </CollapsibleContent>
    </Collapsible>
  );
}
