import { describe, expect, it } from 'vitest';
import type { BriefEvaluationOutput } from '../brief-review/brief-review-v1.schema';
import { summarizeBriefReview } from './summarize-brief-review';

type Fields = BriefEvaluationOutput['fields'];

const provided = { status: 'provided', value: 'Stated', reason: null } as const;
const missing = {
  status: 'missing',
  value: null,
  reason: 'Not stated.',
} as const;
const ambiguous = {
  status: 'ambiguous',
  value: 'Vague',
  reason: 'Not specific.',
} as const;

function review(
  fields: Partial<Fields>,
  missingInformation: BriefEvaluationOutput['missingInformation'] = [],
): BriefEvaluationOutput {
  return {
    outcome: 'needs_information',
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
      ...fields,
    },
    missingInformation,
    outcomeReason: 'Reason.',
  };
}

describe('summarizeBriefReview', () => {
  it('puts missing and ambiguous fields in gaps and the rest in provided', () => {
    const summary = summarizeBriefReview(
      review({ timeline: missing, budget: ambiguous }),
      [],
    );

    expect(summary.gaps).toEqual(['timeline', 'budget']);
    expect(summary.provided).toEqual([
      'projectType',
      'objective',
      'deliverables',
      'location',
      'intendedUse',
      'creativeDirection',
      'talent',
    ]);
  });

  it('keeps canonical field order within gaps regardless of status', () => {
    const summary = summarizeBriefReview(
      review({
        talent: missing,
        objective: ambiguous,
        intendedUse: { status: 'missing', value: null, reason: 'None.' },
        deliverables: missing,
      }),
      [],
    );

    expect(summary.gaps).toEqual([
      'objective',
      'deliverables',
      'intendedUse',
      'talent',
    ]);
    expect(summary.provided).toEqual([
      'projectType',
      'timeline',
      'location',
      'budget',
      'creativeDirection',
    ]);
  });

  it('returns no gaps when every field is provided', () => {
    const summary = summarizeBriefReview(review({}), []);

    expect(summary.gaps).toEqual([]);
    expect(summary.provided).toHaveLength(9);
  });

  it('counts all questions and the checked blocking ones', () => {
    const summary = summarizeBriefReview(
      review({ deliverables: missing, timeline: missing, budget: missing }, [
        {
          fieldKey: 'deliverables',
          question: 'What do you need?',
          blocksCompletion: true,
        },
        {
          fieldKey: 'budget',
          question: 'What is the budget?',
          blocksCompletion: false,
        },
        {
          fieldKey: 'timeline',
          question: 'When is it due?',
          blocksCompletion: true,
        },
      ]),
      [1, 2],
    );

    expect(summary.questionCount).toBe(3);
    expect(summary.selectedQuestionCount).toBe(2);
    expect(summary.selectedBlockingQuestionCount).toBe(1);
  });

  it('counts zero questions for a review without any', () => {
    const summary = summarizeBriefReview(review({}), []);

    expect(summary.questionCount).toBe(0);
    expect(summary.selectedQuestionCount).toBe(0);
    expect(summary.selectedBlockingQuestionCount).toBe(0);
  });
});
