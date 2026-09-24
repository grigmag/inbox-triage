import type { BriefReviewFieldKey } from '../brief-review-v1.config';
import type { BriefEvaluationOutput } from '../brief-review-v1.schema';

type Outcome = BriefEvaluationOutput['outcome'];
type Language = BriefEvaluationOutput['language'];
type FieldStatus =
  BriefEvaluationOutput['fields'][BriefReviewFieldKey]['status'];

/** One acceptable value, or a set of acceptable values. */
type OneOf<Value> = Value | readonly Value[];

/**
 * Partial structural expectations for one evaluation. Only the specified
 * properties are checked. Generated prose is never matched.
 */
export type BriefReviewExpectations = {
  outcome?: OneOf<Outcome>;
  language?: Language;
  fieldStatuses?: Partial<Record<BriefReviewFieldKey, OneOf<FieldStatus>>>;
  /** The exact set of field keys with a completion-blocking question. */
  blockingQuestions?: readonly BriefReviewFieldKey[];
  /** Field keys that must have a non-blocking question. Others may appear. */
  nonBlockingQuestions?: readonly BriefReviewFieldKey[];
};

export type BriefReviewCheckResult = {
  check: string;
  passed: boolean;
  expected: unknown;
  actual: unknown;
};

export function checkBriefReviewExpectations(
  output: BriefEvaluationOutput,
  expectations: BriefReviewExpectations,
): BriefReviewCheckResult[] {
  const results: BriefReviewCheckResult[] = [];

  if (expectations.outcome !== undefined) {
    results.push(oneOfCheck('outcome', expectations.outcome, output.outcome));
  }

  if (expectations.language !== undefined) {
    results.push(
      oneOfCheck('language', expectations.language, output.language),
    );
  }

  for (const [key, expected] of Object.entries(
    expectations.fieldStatuses ?? {},
  ) as [BriefReviewFieldKey, OneOf<FieldStatus>][]) {
    results.push(
      oneOfCheck(`fields.${key}.status`, expected, output.fields[key].status),
    );
  }

  const blocking = questionKeys(output, true);

  if (expectations.blockingQuestions !== undefined) {
    const expected = uniqueSorted(expectations.blockingQuestions);

    results.push({
      check: 'missingInformation.blocking',
      passed:
        expected.length === blocking.length &&
        expected.every((key, index) => key === blocking[index]),
      expected,
      actual: blocking,
    });
  }

  if (expectations.nonBlockingQuestions !== undefined) {
    const expected = uniqueSorted(expectations.nonBlockingQuestions);
    const actual = questionKeys(output, false);

    results.push({
      check: 'missingInformation.nonBlocking',
      passed: expected.every((key) => actual.includes(key)),
      expected,
      actual,
    });
  }

  return results;
}

function oneOfCheck<Value>(
  check: string,
  expected: OneOf<Value>,
  actual: Value,
): BriefReviewCheckResult {
  const accepted: readonly Value[] = Array.isArray(expected)
    ? expected
    : [expected as Value];

  return { check, passed: accepted.includes(actual), expected, actual };
}

function questionKeys(
  output: BriefEvaluationOutput,
  blocksCompletion: boolean,
): BriefReviewFieldKey[] {
  return uniqueSorted(
    output.missingInformation
      .filter((item) => item.blocksCompletion === blocksCompletion)
      .map((item) => item.fieldKey),
  );
}

function uniqueSorted(
  keys: readonly BriefReviewFieldKey[],
): BriefReviewFieldKey[] {
  return [...new Set(keys)].sort();
}
