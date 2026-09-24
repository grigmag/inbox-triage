'use client';

import { useState } from 'react';
import type { BriefReviewActionResult } from '../actions/brief-review-action-result';
import { reviewEmailAction } from '../actions/review-email.action';
import type { BriefEvaluationOutput } from '../brief-review/brief-review-v1.schema';

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
    } else {
      setError(
        response.status === 'noConnection'
          ? 'Connect your mailbox in Email settings.'
          : response.message,
      );
    }
  }

  return { result, error, loading, review };
}
