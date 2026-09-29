import { Button, Spinner } from '@inbox-triage/ui';
import { useEmailDetail } from '../email-detail-context';

/** Reruns the review from a result card. */
export function ReviewAgainButton() {
  const {
    state: { review },
    actions: { reviewBrief },
  } = useEmailDetail();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={reviewBrief}
      disabled={review.loading || review.unavailableReason !== null}
    >
      {review.loading && <Spinner data-icon="inline-start" />}
      Review again
    </Button>
  );
}
