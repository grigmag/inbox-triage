import type { ComponentProps } from 'react';
import { Badge, cn } from '@inbox-triage/ui';
import { CircleAlertIcon, CircleCheckIcon } from 'lucide-react';
import {
  BRIEF_REVIEW_V1_FIELD_KEYS,
  type BriefReviewFieldKey,
} from '../brief-review/brief-review-v1.config';
import type { BriefEvaluationOutput } from '../brief-review/brief-review-v1.schema';

type Outcome = BriefEvaluationOutput['outcome'];
type Fields = BriefEvaluationOutput['fields'];

export type BriefReviewGapStatus = Exclude<
  Fields[BriefReviewFieldKey]['status'],
  'provided'
>;

const warningBadgeClassName =
  'border-transparent bg-warning/10 text-warning dark:bg-warning/20';

/** The tinted success style, for complete and sent states. */
export const successBadgeClassName =
  'border-transparent bg-success/10 text-success dark:bg-success/20';

// Missing has no fill, so it differs from Ambiguous without relying on colour.
const gapBadgeClassNames: Record<BriefReviewGapStatus, string> = {
  ambiguous: warningBadgeClassName,
  missing: 'border-dashed border-warning/70 bg-transparent text-warning',
};

const gapStatusLabels: Record<BriefReviewGapStatus, string> = {
  ambiguous: 'Ambiguous',
  missing: 'Missing',
};

export function BriefReviewOutcomeBadge({ outcome }: { outcome: Outcome }) {
  switch (outcome) {
    case 'needs_information':
      return (
        <Badge variant="outline" className={warningBadgeClassName}>
          <CircleAlertIcon data-icon="inline-start" />
          Needs information
        </Badge>
      );

    case 'complete':
      return (
        <Badge variant="outline" className={successBadgeClassName}>
          <CircleCheckIcon data-icon="inline-start" />
          Brief complete
        </Badge>
      );

    case 'irrelevant':
      return <Badge variant="secondary">Not a production brief</Badge>;
  }
}

/** A status badge for a missing or ambiguous field. */
export function BriefReviewGapBadge({
  status,
  children,
  ...props
}: ComponentProps<typeof Badge> & { status: BriefReviewGapStatus }) {
  return (
    <Badge
      variant="outline"
      {...props}
      className={cn(gapBadgeClassNames[status], props.className)}
    >
      {children ?? gapStatusLabels[status]}
    </Badge>
  );
}

/** A field's label as a gap badge, with its status for screen readers. */
export function BriefReviewGapFieldBadge({
  status,
  label,
}: {
  status: BriefReviewGapStatus;
  label: string;
}) {
  return (
    <BriefReviewGapBadge status={status}>
      {label}

      <span className="sr-only">, {gapStatusLabels[status].toLowerCase()}</span>
    </BriefReviewGapBadge>
  );
}

/** "5 of 9", the number of provided fields out of all review fields. */
export function getClearCountText(clearCount: number): string {
  return `${clearCount} of ${BRIEF_REVIEW_V1_FIELD_KEYS.length}`;
}

/**
 * Nine equal segments in canonical field order. The visible count beside it
 * carries the meaning, so the segments are one image with that count as its
 * label.
 */
export function BriefReviewMeter({
  fields,
  label,
}: {
  fields: Fields;
  /** Repeats the visible count, such as "5 of 9 details clear". */
  label: string;
}) {
  return (
    <div role="img" aria-label={label} className="flex w-full max-w-48 gap-1">
      {BRIEF_REVIEW_V1_FIELD_KEYS.map((fieldKey) => (
        <span
          key={fieldKey}
          className={cn(
            'h-1.5 flex-1 rounded-full',
            fields[fieldKey].status === 'provided'
              ? 'bg-success'
              : 'bg-warning/40',
          )}
        />
      ))}
    </div>
  );
}

function questionsText(count: number): string {
  return `${count} ${count === 1 ? 'question' : 'questions'}`;
}

export function getReplySentence({
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

  const asked =
    selectedQuestionCount === questionCount
      ? questionsText(questionCount)
      : `${selectedQuestionCount} of ${questionsText(questionCount)}`;
  const blocking =
    selectedBlockingQuestionCount > 0
      ? `, ${selectedBlockingQuestionCount} blocking`
      : '';

  return `The reply will ask ${asked}${blocking}.`;
}

export function getStripReplyText({
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

  return selectedQuestionCount === questionCount
    ? `reply asks ${questionsText(questionCount)}`
    : `reply asks ${selectedQuestionCount} of ${questionsText(questionCount)}`;
}
