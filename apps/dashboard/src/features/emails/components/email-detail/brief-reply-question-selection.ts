/**
 * The questions the user checked, tied to the review they belong to. A newer
 * review makes the stored indices meaningless, so they are ignored rather
 * than reset in an effect.
 */
export type BriefReplyQuestionSelection = {
  reviewId: number;
  /** Indices into the review's `missingInformation`, ascending. */
  questionIndices: number[];
};

/**
 * The checked question indices for the latest review. Every question is
 * checked until the user changes the selection for that review.
 */
export function getSelectedQuestionIndices({
  selection,
  reviewId,
  questionCount,
}: {
  selection: BriefReplyQuestionSelection | null;
  reviewId: number | null;
  questionCount: number;
}): number[] {
  if (selection !== null && selection.reviewId === reviewId) {
    return selection.questionIndices;
  }

  return Array.from({ length: questionCount }, (_, index) => index);
}

/** Adds or removes one index and keeps the result in review order. */
export function toggleQuestionIndex(
  questionIndices: readonly number[],
  index: number,
  checked: boolean,
): number[] {
  const others = questionIndices.filter((item) => item !== index);

  return checked ? [...others, index].sort((a, b) => a - b) : others;
}

/** The questions at the given indices, in review order. */
export function pickSelectedQuestions<T>(
  questions: readonly T[],
  questionIndices: readonly number[],
): T[] {
  return questions.filter((_, index) => questionIndices.includes(index));
}

export function haveSameQuestionIndices(
  a: readonly number[],
  b: readonly number[],
): boolean {
  return a.length === b.length && a.every((index, i) => index === b[i]);
}
