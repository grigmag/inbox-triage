// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BriefEvaluationOutput } from '@/features/emails/brief-review/brief-review-v1.schema';
import { useBriefReplyQuestions } from './use-brief-reply-questions';

const provided = { status: 'provided', value: 'Stated', reason: null } as const;

function review(
  outcome: BriefEvaluationOutput['outcome'],
  questions: string[],
): BriefEvaluationOutput {
  return {
    outcome,
    language: 'en',
    summary: 'A request.',
    fields: {
      projectType: {
        status: 'provided',
        value: { category: 'video', details: null },
        reason: null,
      },
      objective: provided,
      deliverables: provided,
      timeline: provided,
      location: provided,
      budget: provided,
      intendedUse: { status: 'provided', value: ['Website'], reason: null },
      creativeDirection: provided,
      talent: provided,
    },
    missingInformation: questions.map((question) => ({
      fieldKey: 'budget',
      question,
      blocksCompletion: false,
    })),
    outcomeReason: 'Reason.',
  };
}

const twoQuestions = review('needs_information', ['First?', 'Second?']);

type HookResult = ReturnType<typeof useBriefReplyQuestions>;

describe('useBriefReplyQuestions', () => {
  let container: HTMLDivElement;
  let root: Root;
  let result: HookResult;

  function Harness({
    review,
    reviewId,
  }: {
    review: BriefEvaluationOutput | null;
    reviewId: number | null;
  }) {
    result = useBriefReplyQuestions(review, reviewId);
    return null;
  }

  function render(
    review: BriefEvaluationOutput | null,
    reviewId: number | null,
  ) {
    act(() => {
      root.render(createElement(Harness, { review, reviewId }));
    });
  }

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    vi.unstubAllGlobals();
  });

  it('asks every question of a new review', () => {
    render(twoQuestions, 1);

    expect(result.reviewHasQuestions).toBe(true);
    expect(result.selectedQuestionIndices).toEqual([0, 1]);
    expect(result.replyQuestions).toEqual({
      language: 'en',
      questions: twoQuestions.missingInformation,
    });
  });

  it('asks only the checked questions', () => {
    render(twoQuestions, 1);
    act(() => result.setQuestionChecked(0, false));

    expect(result.selectedQuestionIndices).toEqual([1]);
    expect(result.replyQuestions?.questions).toEqual([
      twoQuestions.missingInformation[1],
    ]);
  });

  it('has no reply questions when none are checked', () => {
    render(twoQuestions, 1);
    act(() => result.setQuestionChecked(0, false));
    act(() => result.setQuestionChecked(1, false));

    expect(result.reviewHasQuestions).toBe(true);
    expect(result.replyQuestions).toBeNull();
  });

  it('checks every question again for a newer review', () => {
    render(twoQuestions, 1);
    act(() => result.setQuestionChecked(0, false));
    render(twoQuestions, 2);

    expect(result.selectedQuestionIndices).toEqual([0, 1]);
  });

  it('has no questions for an irrelevant review', () => {
    render(review('irrelevant', ['Ignored?']), 1);

    expect(result.reviewHasQuestions).toBe(false);
    expect(result.replyQuestions).toBeNull();
  });

  it('ignores selection changes before a review exists', () => {
    render(null, null);
    act(() => result.setQuestionChecked(0, true));

    expect(result.selectedQuestionIndices).toEqual([]);
    expect(result.replyQuestions).toBeNull();
  });
});
