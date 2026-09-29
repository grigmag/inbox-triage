import { cn } from '@inbox-triage/ui';
import { BRIEF_REVIEW_V1_FIELD_KEYS } from '@/features/emails/brief-review/brief-review-v1.config';
import type { BriefEvaluationOutput } from '@/features/emails/brief-review/brief-review-v1.schema';

/**
 * Nine equal segments in canonical field order. The visible count beside it
 * carries the meaning, so the segments are one image with that count as its
 * label.
 */
export function BriefReviewMeter({
  fields,
  label,
}: {
  fields: BriefEvaluationOutput['fields'];
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
