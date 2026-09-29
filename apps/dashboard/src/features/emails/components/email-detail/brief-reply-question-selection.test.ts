import { describe, expect, it } from 'vitest';
import {
  getSelectedQuestionIndices,
  haveSameQuestionIndices,
  pickSelectedQuestions,
  toggleQuestionIndex,
} from './brief-reply-question-selection';

describe('getSelectedQuestionIndices', () => {
  it('checks every question before the user changes the selection', () => {
    expect(
      getSelectedQuestionIndices({
        selection: null,
        reviewId: 1,
        questionCount: 3,
      }),
    ).toEqual([0, 1, 2]);
  });

  it('returns the selection made for the latest review', () => {
    expect(
      getSelectedQuestionIndices({
        selection: { reviewId: 2, questionIndices: [1] },
        reviewId: 2,
        questionCount: 3,
      }),
    ).toEqual([1]);
  });

  it('checks every question again when a newer review arrives', () => {
    expect(
      getSelectedQuestionIndices({
        selection: { reviewId: 1, questionIndices: [] },
        reviewId: 2,
        questionCount: 2,
      }),
    ).toEqual([0, 1]);
  });

  it('is empty for a review without questions', () => {
    expect(
      getSelectedQuestionIndices({
        selection: null,
        reviewId: 1,
        questionCount: 0,
      }),
    ).toEqual([]);
  });
});

describe('toggleQuestionIndex', () => {
  it('removes an unchecked index', () => {
    expect(toggleQuestionIndex([0, 1, 2], 1, false)).toEqual([0, 2]);
  });

  it('adds a checked index in review order', () => {
    expect(toggleQuestionIndex([0, 3], 2, true)).toEqual([0, 2, 3]);
  });

  it('does not duplicate an index that is already checked', () => {
    expect(toggleQuestionIndex([0, 1], 1, true)).toEqual([0, 1]);
  });
});

describe('pickSelectedQuestions', () => {
  it('keeps the checked questions in review order', () => {
    expect(pickSelectedQuestions(['a', 'b', 'c', 'd'], [0, 2, 3])).toEqual([
      'a',
      'c',
      'd',
    ]);
  });
});

describe('haveSameQuestionIndices', () => {
  it('compares selections by their indices', () => {
    expect(haveSameQuestionIndices([0, 2], [0, 2])).toBe(true);
    expect(haveSameQuestionIndices([0, 2], [0, 1])).toBe(false);
    expect(haveSameQuestionIndices([0], [0, 1])).toBe(false);
    expect(haveSameQuestionIndices([], [])).toBe(true);
  });
});
