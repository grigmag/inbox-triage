'use client';

import { useState } from 'react';
import type { BriefReplyActionInput } from '@/features/emails/brief-reply/brief-reply-input.schema';
import type { BriefEvaluationOutput } from '@/features/emails/brief-review/brief-review-v1.schema';
import {
  type BriefReplyQuestionSelection,
  getSelectedQuestionIndices,
  pickSelectedQuestions,
  toggleQuestionIndex,
} from './brief-reply-question-selection';

/** Tracks which of the latest review's questions the reply should ask. */
export function useBriefReplyQuestions(
  review: BriefEvaluationOutput | null,
  reviewId: number | null,
) {
  const [selection, setSelection] =
    useState<BriefReplyQuestionSelection | null>(null);

  const reviewHasQuestions =
    review !== null &&
    review.outcome !== 'irrelevant' &&
    review.missingInformation.length > 0;
  // A new review result checks every question again, because the selection
  // belongs to the review it was made for.
  const selectedQuestionIndices = getSelectedQuestionIndices({
    selection,
    reviewId,
    questionCount: review?.missingInformation.length ?? 0,
  });

  // Generation uses the latest review's checked questions. With none, the
  // reply starts blank, because there is nothing for AI to ask.
  let replyQuestions: BriefReplyActionInput | null = null;

  if (reviewHasQuestions && selectedQuestionIndices.length > 0) {
    replyQuestions = {
      language: review.language,
      questions: pickSelectedQuestions(
        review.missingInformation,
        selectedQuestionIndices,
      ),
    };
  }

  function setQuestionChecked(index: number, checked: boolean) {
    if (reviewId === null) {
      return;
    }

    setSelection({
      reviewId,
      questionIndices: toggleQuestionIndex(
        selectedQuestionIndices,
        index,
        checked,
      ),
    });
  }

  return {
    reviewHasQuestions,
    selectedQuestionIndices,
    replyQuestions,
    setQuestionChecked,
  };
}
