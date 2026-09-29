import { Badge } from '@inbox-triage/ui';
import { CircleAlertIcon } from 'lucide-react';
import type { BriefEvaluationOutput } from '@/features/emails/brief-review/brief-review-v1.schema';
import { SuccessBadge } from '@/features/emails/components/success-badge';
import { WarningBadge } from '@/features/emails/components/warning-badge';

export function BriefReviewOutcomeBadge({
  outcome,
}: {
  outcome: BriefEvaluationOutput['outcome'];
}) {
  switch (outcome) {
    case 'needs_information':
      return (
        <WarningBadge>
          <CircleAlertIcon data-icon="inline-start" />
          Needs information
        </WarningBadge>
      );

    case 'complete':
      return <SuccessBadge>Brief complete</SuccessBadge>;

    case 'irrelevant':
      return <Badge variant="secondary">Not a production brief</Badge>;
  }
}
