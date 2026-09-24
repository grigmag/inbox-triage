import { describe, expect, it } from 'vitest';
import type { BriefEvaluationOutput } from '../brief-review-v1.schema';
import { checkBriefReviewExpectations } from './check-brief-review-expectations';

function missing(reason: string) {
  return { status: 'missing' as const, value: null, reason };
}

function evaluation(): BriefEvaluationOutput {
  return {
    outcome: 'needs_information',
    language: 'el',
    summary: 'Αίτημα για φωτογράφιση προϊόντων.',
    fields: {
      projectType: {
        status: 'provided',
        value: { category: 'photography', details: null },
        reason: null,
      },
      objective: missing('Δεν αναφέρεται στόχος.'),
      deliverables: {
        status: 'ambiguous',
        value: 'Φωτογραφίες',
        reason: 'Δεν αναφέρεται ποσότητα.',
      },
      timeline: missing('Δεν αναφέρεται χρονοδιάγραμμα.'),
      location: missing('Δεν αναφέρεται τοποθεσία.'),
      budget: missing('Δεν αναφέρεται προϋπολογισμός.'),
      intendedUse: missing('Δεν αναφέρεται χρήση.'),
      creativeDirection: missing('Δεν αναφέρεται ύφος.'),
      talent: missing('Δεν αναφέρονται μοντέλα.'),
    },
    missingInformation: [
      {
        fieldKey: 'timeline',
        question: 'Πότε χρειάζεστε τις φωτογραφίες;',
        blocksCompletion: true,
      },
      {
        fieldKey: 'deliverables',
        question: 'Πόσες φωτογραφίες χρειάζεστε;',
        blocksCompletion: true,
      },
      {
        fieldKey: 'deliverables',
        question: 'Σε ποια μορφή;',
        blocksCompletion: true,
      },
      {
        fieldKey: 'budget',
        question: 'Υπάρχει προϋπολογισμός;',
        blocksCompletion: false,
      },
      {
        fieldKey: 'location',
        question: 'Πού θα γίνει η φωτογράφιση;',
        blocksCompletion: false,
      },
    ],
    outcomeReason: 'Λείπουν τα παραδοτέα και το χρονοδιάγραμμα.',
  };
}

describe('checkBriefReviewExpectations', () => {
  it('checks nothing without expectations', () => {
    expect(checkBriefReviewExpectations(evaluation(), {})).toEqual([]);
  });

  it('checks the outcome as one value or a set', () => {
    expect(
      checkBriefReviewExpectations(evaluation(), {
        outcome: 'needs_information',
      }),
    ).toEqual([
      {
        check: 'outcome',
        passed: true,
        expected: 'needs_information',
        actual: 'needs_information',
      },
    ]);

    const [notComplete] = checkBriefReviewExpectations(evaluation(), {
      outcome: ['irrelevant', 'needs_information'],
    });
    expect(notComplete.passed).toBe(true);

    const [complete] = checkBriefReviewExpectations(evaluation(), {
      outcome: 'complete',
    });
    expect(complete.passed).toBe(false);
  });

  it('checks the language', () => {
    expect(
      checkBriefReviewExpectations(evaluation(), { language: 'en' }),
    ).toEqual([
      { check: 'language', passed: false, expected: 'en', actual: 'el' },
    ]);
  });

  it('checks only the specified field statuses', () => {
    expect(
      checkBriefReviewExpectations(evaluation(), {
        fieldStatuses: {
          projectType: 'provided',
          deliverables: ['missing', 'ambiguous'],
          timeline: 'provided',
        },
      }),
    ).toEqual([
      {
        check: 'fields.projectType.status',
        passed: true,
        expected: 'provided',
        actual: 'provided',
      },
      {
        check: 'fields.deliverables.status',
        passed: true,
        expected: ['missing', 'ambiguous'],
        actual: 'ambiguous',
      },
      {
        check: 'fields.timeline.status',
        passed: false,
        expected: 'provided',
        actual: 'missing',
      },
    ]);
  });

  it('requires the exact set of blocking question keys regardless of order or repetition', () => {
    const [exact] = checkBriefReviewExpectations(evaluation(), {
      blockingQuestions: ['timeline', 'deliverables'],
    });
    expect(exact).toEqual({
      check: 'missingInformation.blocking',
      passed: true,
      expected: ['deliverables', 'timeline'],
      actual: ['deliverables', 'timeline'],
    });

    for (const blockingQuestions of [
      ['deliverables'],
      ['deliverables', 'timeline', 'objective'],
      [],
    ] as const) {
      const [result] = checkBriefReviewExpectations(evaluation(), {
        blockingQuestions,
      });
      expect(result.passed).toBe(false);
    }
  });

  it('passes an empty blocking set only when no question blocks', () => {
    const output = evaluation();
    output.missingInformation = output.missingInformation.filter(
      (item) => !item.blocksCompletion,
    );

    const [result] = checkBriefReviewExpectations(output, {
      blockingQuestions: [],
    });
    expect(result.passed).toBe(true);
  });

  it('requires listed non-blocking question keys and allows others', () => {
    const [present] = checkBriefReviewExpectations(evaluation(), {
      nonBlockingQuestions: ['budget'],
    });
    expect(present).toEqual({
      check: 'missingInformation.nonBlocking',
      passed: true,
      expected: ['budget'],
      actual: ['budget', 'location'],
    });

    // A blocking question does not satisfy a non-blocking expectation.
    const [absent] = checkBriefReviewExpectations(evaluation(), {
      nonBlockingQuestions: ['budget', 'timeline'],
    });
    expect(absent.passed).toBe(false);
  });
});
