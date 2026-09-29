'use client';

import { useState } from 'react';
import type { BriefReviewActionResult } from '@/features/emails/actions/brief-review-action-result';
import { reviewEmailAction } from '@/features/emails/actions/review-email.action';
import type { BriefEvaluationOutput } from '@/features/emails/brief-review/brief-review-v1.schema';
import { getMailboxFailureMessage } from '@/features/emails/lib/get-mailbox-failure-message';

const unexpectedFailure = {
  status: 'failure',
  message: 'Unable to review this email. Please try again.',
} as const;

/**
 * Holds the review for one loaded message. The owning component remounts per
 * message, so results never outlive the message they belong to.
 */
export function useBriefReview() {
  const [result, setResult] = useState<BriefEvaluationOutput | null>(null);
  // Increases with each successful result, so a draft can tell whether it
  // came from the latest review.
  const [resultId, setResultId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function review(messageRef: string) {
    if (loading) {
      return;
    }

    setLoading(true);
    setError(null);

    let response: BriefReviewActionResult;

    try {
      response = await reviewEmailAction(messageRef);
    } catch {
      response = unexpectedFailure;
    }

    setLoading(false);

    // A failed rerun keeps the previous result visible beside the error.
    if (response.status === 'success') {
      setResult(response.data);
      setResultId((id) => (id ?? 0) + 1);
    } else {
      setError(getMailboxFailureMessage(response));
    }
  }

  return { result, resultId, error, loading, review };
}
