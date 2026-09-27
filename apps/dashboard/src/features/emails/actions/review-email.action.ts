'use server';

import { requireUser } from '@/server/auth';
import { BriefReviewError } from '../brief-review/brief-review.errors';
import type { BriefReviewActionResult } from './brief-review-action-result';
import { reviewEmailUseCase } from '../use-cases/review-email.use-case';

const REVIEW_FAILURE_MESSAGE = 'Unable to review this email. Please try again.';

export async function reviewEmailAction(
  messageRef: string,
): Promise<BriefReviewActionResult> {
  const user = await requireUser();

  if (typeof messageRef !== 'string' || messageRef.length === 0) {
    return { status: 'failure', message: REVIEW_FAILURE_MESSAGE };
  }

  try {
    const result = await reviewEmailUseCase({ userId: user.id, messageRef });
    return result;
  } catch (error) {
    return {
      status: 'failure',
      message:
        error instanceof BriefReviewError
          ? error.message
          : REVIEW_FAILURE_MESSAGE,
    };
  }
}
