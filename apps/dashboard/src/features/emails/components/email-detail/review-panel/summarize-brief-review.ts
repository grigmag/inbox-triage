import {
  BRIEF_REVIEW_V1_FIELD_KEYS,
  type BriefReviewFieldKey,
} from '@/features/emails/brief-review/brief-review-v1.config';
import type { BriefEvaluationOutput } from '@/features/emails/brief-review/brief-review-v1.schema';

export type BriefReviewSummary = {
  /** Missing or ambiguous fields, in `BRIEF_REVIEW_V1_FIELD_KEYS` order. */
  gaps: BriefReviewFieldKey[];
  /** Provided fields, in `BRIEF_REVIEW_V1_FIELD_KEYS` order. */
  provided: BriefReviewFieldKey[];
  /** All of the review's questions. */
  questionCount: number;
  /** Checked questions, which the next generated reply would ask. */
  selectedQuestionCount: number;
  selectedBlockingQuestionCount: number;
};

/**
 * Groups a review's fields gaps first and counts its questions, overall and
 * among those the user checked.
 */
export function summarizeBriefReview(
  review: BriefEvaluationOutput,
  selectedQuestionIndices: readonly number[],
): BriefReviewSummary {
  const gaps: BriefReviewFieldKey[] = [];
  const provided: BriefReviewFieldKey[] = [];

  for (const fieldKey of BRIEF_REVIEW_V1_FIELD_KEYS) {
    if (review.fields[fieldKey].status === 'provided') {
      provided.push(fieldKey);
    } else {
      gaps.push(fieldKey);
    }
  }

  return {
    gaps,
    provided,
    questionCount: review.missingInformation.length,
    selectedQuestionCount: selectedQuestionIndices.length,
    selectedBlockingQuestionCount: selectedQuestionIndices.filter(
      (index) => review.missingInformation[index]?.blocksCompletion,
    ).length,
  };
}
