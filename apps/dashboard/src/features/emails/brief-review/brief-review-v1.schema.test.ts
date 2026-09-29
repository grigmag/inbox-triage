import { describe, expect, it } from 'vitest';
import type { z } from 'zod';
import { BRIEF_REVIEW_V1_FIELD_KEYS } from './brief-review-v1.config';
import { briefEvaluationOutputV1Schema } from './brief-review-v1.schema';

type Evaluation = z.input<typeof briefEvaluationOutputV1Schema>;

function completeEvaluation(): Evaluation {
  return {
    outcome: 'complete',
    language: 'en',
    summary: 'A product photography request.',
    fields: {
      projectType: {
        status: 'provided',
        value: { category: 'photography', details: 'Product photography' },
        reason: null,
      },
      objective: {
        status: 'provided',
        value: 'Launch a skincare range',
        reason: null,
      },
      deliverables: {
        status: 'provided',
        value: '20 edited photographs',
        reason: null,
      },
      timeline: {
        status: 'provided',
        value: 'Second week of June',
        reason: null,
      },
      location: {
        status: 'provided',
        value: 'Client studio in Athens',
        reason: null,
      },
      budget: {
        status: 'missing',
        value: null,
        reason: 'No budget is stated.',
      },
      intendedUse: {
        status: 'provided',
        value: ['Instagram', 'Website'],
        reason: null,
      },
      creativeDirection: {
        status: 'ambiguous',
        value: 'Clean',
        reason: 'The visual direction is not specific.',
      },
      talent: {
        status: 'missing',
        value: null,
        reason: 'Talent is not discussed.',
      },
    },
    missingInformation: [
      {
        fieldKey: 'budget',
        question: 'What budget should we plan around?',
        blocksCompletion: false,
      },
    ],
    outcomeReason: 'The required scope is clear.',
  };
}

function issuePaths(value: unknown): string[] {
  const result = briefEvaluationOutputV1Schema.safeParse(value);

  if (result.success) {
    return [];
  }

  return result.error.issues.map((issue) => issue.path.join('.'));
}

describe('briefEvaluationOutputV1Schema', () => {
  it('accepts a complete evaluation with all nine ordered fields', () => {
    const result =
      briefEvaluationOutputV1Schema.safeParse(completeEvaluation());

    expect(result.success).toBe(true);
    expect(BRIEF_REVIEW_V1_FIELD_KEYS).toEqual([
      'projectType',
      'objective',
      'deliverables',
      'timeline',
      'location',
      'budget',
      'intendedUse',
      'creativeDirection',
      'talent',
    ]);
  });

  it.each([
    {
      name: 'provided without a value',
      field: { status: 'provided', value: null, reason: null },
      path: 'fields.objective.value',
    },
    {
      name: 'provided with a reason',
      field: {
        status: 'provided',
        value: 'Launch campaign',
        reason: 'Should be null.',
      },
      path: 'fields.objective.reason',
    },
    {
      name: 'missing with a value',
      field: {
        status: 'missing',
        value: 'Launch campaign',
        reason: 'No objective is stated.',
      },
      path: 'fields.objective.value',
    },
    {
      name: 'missing without a reason',
      field: { status: 'missing', value: null, reason: null },
      path: 'fields.objective.reason',
    },
    {
      name: 'ambiguous without a reason',
      field: { status: 'ambiguous', value: null, reason: null },
      path: 'fields.objective.reason',
    },
  ] as const)('rejects $name', ({ field, path }) => {
    const value = completeEvaluation();
    value.fields.objective = field;

    expect(issuePaths(value)).toContain(path);
  });

  it('accepts an ambiguous field with a supported partial value', () => {
    const value = completeEvaluation();
    value.fields.objective = {
      status: 'ambiguous',
      value: 'A campaign',
      reason: 'The campaign goal is not stated.',
    };
    value.outcome = 'needs_information';
    value.missingInformation = [
      {
        fieldKey: 'objective',
        question: 'What should the campaign achieve?',
        blocksCompletion: true,
      },
    ];

    expect(briefEvaluationOutputV1Schema.safeParse(value).success).toBe(true);
  });

  it('rejects whitespace-only prose and list items', () => {
    const value = completeEvaluation();
    value.summary = '   ';
    value.fields.intendedUse.value = ['Website', '  '];

    expect(issuePaths(value)).toEqual(
      expect.arrayContaining(['summary', 'fields.intendedUse.value.1']),
    );
  });

  it('rejects an empty provided intended-use list', () => {
    const value = completeEvaluation();
    value.fields.intendedUse.value = [];

    expect(issuePaths(value)).toContain('fields.intendedUse.value');
  });

  it('requires details for project type other', () => {
    const value = completeEvaluation();
    value.fields.projectType.value = { category: 'other', details: null };

    expect(issuePaths(value)).toContain('fields.projectType.value.details');
  });

  it.each([
    'projectType',
    'objective',
    'deliverables',
    'timeline',
    'location',
    'intendedUse',
  ] as const)('rejects complete when %s is not provided', (fieldKey) => {
    const value = completeEvaluation();
    const field = value.fields[fieldKey];
    field.status = 'ambiguous';
    field.value = null;
    field.reason = 'The field is unclear.';

    expect(issuePaths(value)).toContain('outcome');
  });

  it('requires needs_information to contain a blocking question', () => {
    const value = completeEvaluation();
    value.outcome = 'needs_information';

    expect(issuePaths(value)).toContain('missingInformation');
  });

  it.each([
    ['projectType', true],
    ['objective', true],
    ['deliverables', true],
    ['timeline', true],
    ['location', true],
    ['intendedUse', true],
    ['budget', false],
    ['creativeDirection', false],
    ['talent', false],
  ] as const)(
    'enforces deterministic blocking for %s',
    (fieldKey, blocksCompletion) => {
      const value = completeEvaluation();
      value.outcome = 'needs_information';
      value.fields.deliverables = {
        status: 'missing',
        value: null,
        reason: 'No deliverables are stated.',
      };
      const field = value.fields[fieldKey];
      field.status = 'missing';
      field.value = null;
      field.reason = 'Not stated.';
      value.missingInformation = [
        {
          fieldKey: 'deliverables',
          question: 'What should be delivered?',
          blocksCompletion: true,
        },
        {
          fieldKey,
          question: 'Please clarify this field.',
          blocksCompletion: !blocksCompletion,
        },
      ];

      expect(issuePaths(value)).toContain(
        'missingInformation.1.blocksCompletion',
      );
    },
  );

  it('rejects questions for fields marked provided', () => {
    const value = completeEvaluation();
    value.missingInformation = [
      {
        fieldKey: 'timeline',
        question: 'When is this needed?',
        blocksCompletion: false,
      },
    ];

    expect(issuePaths(value)).toContain('missingInformation.0.fieldKey');
  });

  it('rejects missing-information questions for irrelevant emails', () => {
    const value = completeEvaluation();
    value.outcome = 'irrelevant';

    expect(issuePaths(value)).toContain('missingInformation');
  });

  it('rejects unknown missing-information field keys and extra properties', () => {
    const value = {
      ...completeEvaluation(),
      missingInformation: [
        {
          fieldKey: 'unknown',
          question: 'What is missing?',
          blocksCompletion: false,
        },
      ],
      extra: 'not allowed',
    };

    expect(issuePaths(value)).toEqual(
      expect.arrayContaining(['missingInformation.0.fieldKey']),
    );
    expect(briefEvaluationOutputV1Schema.safeParse(value).success).toBe(false);
  });
});
