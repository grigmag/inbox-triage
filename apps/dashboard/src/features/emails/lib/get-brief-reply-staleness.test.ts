import { describe, expect, it } from 'vitest';
import type { BriefEvaluationOutput } from '../brief-review/brief-review-v1.schema';
import { getBriefReplyStaleness } from './get-brief-reply-staleness';

const provided = { status: 'provided', value: 'Stated', reason: null } as const;

function review(
  outcome: BriefEvaluationOutput['outcome'],
  missingInformation: BriefEvaluationOutput['missingInformation'] = [],
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
    missingInformation,
    outcomeReason: 'Reason.',
  };
}

const withQuestions = review('needs_information', [
  {
    fieldKey: 'budget',
    question: 'What is the budget?',
    blocksCompletion: true,
  },
]);
const withTwoQuestions = review('needs_information', [
  {
    fieldKey: 'budget',
    question: 'What is the budget?',
    blocksCompletion: true,
  },
  {
    fieldKey: 'talent',
    question: 'Do you need talent?',
    blocksCompletion: false,
  },
]);
const withoutQuestions = review('complete');
const irrelevant = review('irrelevant');

describe('getBriefReplyStaleness', () => {
  it('has no notice before a draft exists', () => {
    expect(
      getBriefReplyStaleness({
        source: null,
        review: withQuestions,
        reviewId: 2,
        selectedQuestionIndices: [0],
        sent: false,
      }),
    ).toBeNull();
  });

  it('treats a draft from the latest review as current', () => {
    expect(
      getBriefReplyStaleness({
        source: { reviewId: 2, questionIndices: [0] },
        review: withQuestions,
        reviewId: 2,
        selectedQuestionIndices: [0],
        sent: false,
      }),
    ).toBeNull();
  });

  it('treats a blank reply from the latest review as current', () => {
    expect(
      getBriefReplyStaleness({
        source: { reviewId: 1, questionIndices: [] },
        review: withoutQuestions,
        reviewId: 1,
        selectedQuestionIndices: [],
        sent: false,
      }),
    ).toBeNull();
  });

  it.each([
    ['reviewChanged', withQuestions],
    ['nothingToAsk', withoutQuestions],
    ['notABrief', irrelevant],
  ] as const)(
    'reports %s when a newer review exists',
    (staleness, latestReview) => {
      expect(
        getBriefReplyStaleness({
          source: { reviewId: 1, questionIndices: [0] },
          review: latestReview,
          reviewId: 2,
          selectedQuestionIndices: [0],
          sent: false,
        }),
      ).toBe(staleness);
    },
  );

  it('reports a changed selection for a draft from the latest review', () => {
    expect(
      getBriefReplyStaleness({
        source: { reviewId: 2, questionIndices: [0] },
        review: withTwoQuestions,
        reviewId: 2,
        selectedQuestionIndices: [0, 1],
        sent: false,
      }),
    ).toBe('selectionChanged');
  });

  it('reports a changed selection for a blank reply once questions are checked', () => {
    expect(
      getBriefReplyStaleness({
        source: { reviewId: 2, questionIndices: [] },
        review: withTwoQuestions,
        reviewId: 2,
        selectedQuestionIndices: [1],
        sent: false,
      }),
    ).toBe('selectionChanged');
  });

  it('prefers the newer review over a changed selection', () => {
    expect(
      getBriefReplyStaleness({
        source: { reviewId: 1, questionIndices: [0] },
        review: withTwoQuestions,
        reviewId: 2,
        selectedQuestionIndices: [1],
        sent: false,
      }),
    ).toBe('reviewChanged');
  });

  it('has no notice once the reply is sent', () => {
    expect(
      getBriefReplyStaleness({
        source: { reviewId: 1, questionIndices: [0] },
        review: withQuestions,
        reviewId: 2,
        selectedQuestionIndices: [0],
        sent: true,
      }),
    ).toBeNull();
  });
});
