import { Badge } from '@inbox-triage/ui';
import type { BriefReviewFieldKey } from '@/features/emails/brief-review/brief-review-v1.config';
import type { BriefEvaluationOutput } from '@/features/emails/brief-review/brief-review-v1.schema';
import { WarningBadge } from '@/features/emails/components/warning-badge';

type BriefReviewGapStatus = Exclude<
  BriefEvaluationOutput['fields'][BriefReviewFieldKey]['status'],
  'provided'
>;

const gapStatusLabels: Record<BriefReviewGapStatus, string> = {
  ambiguous: 'Ambiguous',
  missing: 'Missing',
};

/**
 * A status badge for a missing or ambiguous field. Given the field's label, it
 * shows the label and keeps the status for screen readers.
 */
export function BriefReviewGapBadge({
  status,
  label,
}: {
  status: BriefReviewGapStatus;
  label?: string;
}) {
  const statusLabel = gapStatusLabels[status];

  const content = label ? (
    <>
      {label}

      <span className="sr-only">, {statusLabel.toLowerCase()}</span>
    </>
  ) : (
    statusLabel
  );

  switch (status) {
    case 'ambiguous':
      return <WarningBadge>{content}</WarningBadge>;

    case 'missing':
      // Missing has no fill, so it differs from Ambiguous without relying on colour.
      return (
        <Badge
          variant="outline"
          className="border-dashed border-warning/70 bg-transparent text-warning"
        >
          {content}
        </Badge>
      );
  }
}
