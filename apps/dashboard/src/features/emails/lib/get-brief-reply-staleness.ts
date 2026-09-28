import type { BriefEvaluationOutput } from '../brief-review/brief-review-v1.schema';
import type { BriefReplySource } from '../state/brief-reply-state';
import { haveSameQuestionIndices } from './brief-reply-question-selection';

/** Why the draft may not match the latest review. Null when it does. */
export type BriefReplyStaleness =
  null | 'reviewChanged' | 'nothingToAsk' | 'notABrief' | 'selectionChanged';

/**
 * A draft is stale when a newer review exists than the one it came from, or
 * when the user has changed which of that review's questions are checked. The
 * review comparison uses identity rather than question text, so a re-review
 * that returns the same questions still counts as newer.
 */
export function getBriefReplyStaleness({
  source,
  review,
  reviewId,
  selectedQuestionIndices,
  sent,
}: {
  source: BriefReplySource | null;
  review: BriefEvaluationOutput | null;
  reviewId: number | null;
  /** The questions checked now for the latest review. */
  selectedQuestionIndices: readonly number[];
  sent: boolean;
}): BriefReplyStaleness {
  if (sent || source === null || review === null || reviewId === null) {
    return null;
  }

  if (source.reviewId === reviewId) {
    return haveSameQuestionIndices(
      source.questionIndices,
      selectedQuestionIndices,
    )
      ? null
      : 'selectionChanged';
  }

  if (review.outcome === 'irrelevant') {
    return 'notABrief';
  }

  return review.missingInformation.length > 0
    ? 'reviewChanged'
    : 'nothingToAsk';
}
