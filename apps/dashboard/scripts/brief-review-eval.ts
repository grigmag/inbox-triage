/**
 * Runs the synthetic Brief Review V1 cases against the configured OpenRouter
 * model and reports how the results compare with each case's expectations.
 *
 * Usage, from the repository root:
 *
 *   OPENROUTER_ALLOW_BILLABLE_REQUESTS=true \
 *     pnpm --filter @inbox-triage/dashboard eval:brief-review [options]
 *
 * Options:
 *
 *   --runs N     Evaluate each case N times (default 1) to show a pass rate
 *                across nondeterministic runs.
 *   --case <id>  Evaluate only the case with this id. Repeat to select
 *                several cases. Ids are in `brief-review-v1.eval-cases.ts`.
 *
 * Examples:
 *
 *   # Every case once
 *   OPENROUTER_ALLOW_BILLABLE_REQUESTS=true \
 *     pnpm --filter @inbox-triage/dashboard eval:brief-review
 *
 *   # Two cases, three runs each
 *   OPENROUTER_ALLOW_BILLABLE_REQUESTS=true \
 *     pnpm --filter @inbox-triage/dashboard eval:brief-review \
 *     --runs 3 --case en-prompt-injection --case el-missing-deliverables
 *
 *   # Compare another model
 *   OPENROUTER_ALLOW_BILLABLE_REQUESTS=true OPENROUTER_MODEL=<model-id> \
 *     pnpm --filter @inbox-triage/dashboard eval:brief-review
 *
 * Every evaluation makes one or two billable requests. The guard must be set
 * in the shell; setting it in `.env` has no effect. Other environment variables
 * load from the dashboard's `.env` files, as they do for `next dev`.
 *
 * At most three evaluations run at once. The console shows a per-case table
 * and token totals.
 *
 * A full JSON report, including inputs and model output, is
 * written to `apps/dashboard/.evals/`, which is gitignored. Never commit it.
 *
 * The script only reports. Failed expectations and provider errors are
 * recorded for the affected case. It exits non-zero only when it cannot run:
 * a missing guard, invalid arguments, missing environment variables, or an
 * unwritable report.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { loadEnvConfig } from '@next/env';

import type { BriefEvaluationOutput } from '../src/features/emails/brief-review/brief-review-v1.schema';
import {
  BRIEF_REVIEW_V1_EVAL_CASES,
  type BriefReviewEvalCase,
} from '../src/features/emails/brief-review/evals/brief-review-v1.eval-cases';
import {
  checkBriefReviewExpectations,
  type BriefReviewCheckResult,
} from '../src/features/emails/brief-review/evals/check-brief-review-expectations';
import type { BriefReviewRunMetadata } from '../src/features/emails/brief-review/evaluate-brief';
import {
  BILLING_GUARD,
  allowsBillableRequests,
} from './openrouter-billing-guard';

const CONCURRENCY = 3;
const REPORT_DIR = path.join(process.cwd(), '.evals');

type Options = { runs: number; cases: readonly BriefReviewEvalCase[] };

type RunResult = {
  caseId: string;
  run: number;
  durationMs: number;
  output: BriefEvaluationOutput | null;
  errorType: string | null;
  metadata: BriefReviewRunMetadata | null;
  checks: BriefReviewCheckResult[];
  passed: boolean;
};

type Evaluator =
  (typeof import('../src/features/emails/brief-review/evaluate-brief'))['evaluateBrief'];
type InvalidOutputError =
  (typeof import('../src/features/emails/brief-review/brief-review.errors'))['BriefReviewInvalidOutputError'];

function parseOptions(): Options {
  const { values } = parseArgs({
    options: {
      runs: { type: 'string', default: '1' },
      case: { type: 'string', multiple: true },
    },
    strict: true,
    allowPositionals: false,
  });

  const runs = Number(values.runs);
  if (!Number.isInteger(runs) || runs < 1) {
    throw new UsageError('--runs must be a positive integer.');
  }

  const ids = values.case ?? [];
  const unknown = ids.filter(
    (id) => !BRIEF_REVIEW_V1_EVAL_CASES.some((c) => c.id === id),
  );
  if (unknown.length > 0) {
    throw new UsageError(`Unknown case id: ${unknown.join(', ')}.`);
  }

  return {
    runs,
    cases:
      ids.length === 0
        ? BRIEF_REVIEW_V1_EVAL_CASES
        : BRIEF_REVIEW_V1_EVAL_CASES.filter((c) => ids.includes(c.id)),
  };
}

class UsageError extends Error {}

async function runCase(
  evaluateBrief: Evaluator,
  InvalidOutput: InvalidOutputError,
  evalCase: BriefReviewEvalCase,
  run: number,
): Promise<RunResult> {
  const startedAt = performance.now();
  const base = { caseId: evalCase.id, run };

  try {
    const { data, metadata } = await evaluateBrief(evalCase.input);
    const checks = checkBriefReviewExpectations(data, evalCase.expectations);

    return {
      ...base,
      durationMs: Math.round(performance.now() - startedAt),
      output: data,
      errorType: null,
      metadata,
      checks,
      passed: checks.every((check) => check.passed),
    };
  } catch (error) {
    const metadata = error instanceof InvalidOutput ? error.metadata : null;
    const filtered =
      metadata !== null &&
      metadata.attempts.every(
        (attempt) => attempt.finishReason === 'content-filter',
      );
    const checks = evalCase.acceptsContentFilter
      ? [
          {
            check: 'contentFilter',
            passed: filtered,
            expected: 'content-filter',
            actual:
              metadata?.attempts.map((attempt) => attempt.finishReason) ?? null,
          },
        ]
      : [];

    return {
      ...base,
      durationMs: Math.round(performance.now() - startedAt),
      output: null,
      errorType: error instanceof Error ? error.name : 'UnknownError',
      metadata,
      checks,
      passed: checks.length > 0 && checks.every((check) => check.passed),
    };
  }
}

/** Runs tasks in order with at most `limit` in flight. */
async function runLimited<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let next = 0;

  async function worker() {
    while (next < tasks.length) {
      const index = next++;
      results[index] = await tasks[index]();
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, tasks.length) }, worker),
  );

  return results;
}

function printSummary(
  cases: readonly BriefReviewEvalCase[],
  results: RunResult[],
) {
  const rows = cases.map((evalCase) => {
    const runs = results.filter((result) => result.caseId === evalCase.id);
    const failedChecks = new Map<string, number>();

    for (const result of runs) {
      const failures = result.passed
        ? []
        : result.errorType
          ? [result.errorType]
          : result.checks.filter((c) => !c.passed).map((c) => c.check);

      for (const failure of failures) {
        failedChecks.set(failure, (failedChecks.get(failure) ?? 0) + 1);
      }
    }

    return {
      case: evalCase.id,
      passed: `${runs.filter((r) => r.passed).length}/${runs.length}`,
      'failed checks': [...failedChecks]
        .map(([check, count]) => (count > 1 ? `${check} ×${count}` : check))
        .join(', '),
      corrective: runs.filter((r) => (r.metadata?.attempts.length ?? 0) > 1)
        .length,
      'avg ms': Math.round(
        runs.reduce((sum, r) => sum + r.durationMs, 0) / runs.length,
      ),
    };
  });

  console.table(rows);

  const attempts = results.flatMap((r) => r.metadata?.attempts ?? []);
  const sum = (
    read: (
      usage: NonNullable<(typeof attempts)[number]['usage']>,
    ) => number | undefined,
  ) =>
    attempts.reduce(
      (total, a) => total + (a.usage ? (read(a.usage) ?? 0) : 0),
      0,
    );

  const passed = results.filter((r) => r.passed).length;
  console.log(`\nPassed ${passed}/${results.length} runs.`);
  // Only calls that returned a response are recorded. A timeout or provider
  // error may still have been billed, so those runs are flagged separately.
  console.log(
    `Tokens: ${sum((u) => u.inputTokens)} input, ${sum((u) => u.outputTokens)} output, ${sum((u) => u.totalTokens)} total across ${attempts.length} completed model calls.`,
  );

  const unmeasured = attempts.filter((a) => a.usage === null).length;
  if (unmeasured > 0) {
    console.log(`${unmeasured} completed model calls reported no usage.`);
  }

  const uncountedRuns = results.filter((r) => r.metadata === null).length;
  if (uncountedRuns > 0) {
    console.log(
      `${uncountedRuns} runs ended in a timeout or provider error. Their requests may have been billed but are not counted above.`,
    );
  }
}

async function main() {
  let options: Options;

  try {
    options = parseOptions();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error('Usage: eval:brief-review [--runs N] [--case <id>]...');
    process.exitCode = 1;
    return;
  }

  if (!allowsBillableRequests(process.env[BILLING_GUARD])) {
    console.error(
      `Refusing to make billable requests. Set ${BILLING_GUARD}=true to confirm this evaluation.`,
    );
    process.exitCode = 1;
    return;
  }

  loadEnvConfig(process.cwd(), process.env.NODE_ENV !== 'production');

  let evaluator: typeof import('../src/features/emails/brief-review/evaluate-brief');
  let errors: typeof import('../src/features/emails/brief-review/brief-review.errors');
  let configuredModelId: string;

  try {
    evaluator =
      await import('../src/features/emails/brief-review/evaluate-brief');
    errors =
      await import('../src/features/emails/brief-review/brief-review.errors');
    configuredModelId = (await import('../src/server/ai')).aiModel.modelId;
  } catch (error) {
    console.error(
      error instanceof Error && error.message.includes('is missing or empty')
        ? error.message
        : 'Unable to load the evaluator. Check the environment configuration.',
    );
    process.exitCode = 1;
    return;
  }

  const { runs, cases } = options;
  const total = cases.length * runs;
  const startedAt = new Date();
  console.log(
    `Making up to ${total * 2} billable OpenRouter requests with ${configuredModelId}: ${cases.length} cases × ${runs} runs, up to one corrective call each.`,
  );

  let completed = 0;
  const tasks = cases.flatMap((evalCase) =>
    Array.from({ length: runs }, (_, index) => async () => {
      const result = await runCase(
        evaluator.evaluateBrief,
        errors.BriefReviewInvalidOutputError,
        evalCase,
        index + 1,
      );
      completed += 1;
      console.log(
        `[${completed}/${total}] ${evalCase.id} #${result.run}: ${result.passed ? 'pass' : (result.errorType ?? 'fail')}`,
      );
      return result;
    }),
  );

  const results = await runLimited(tasks, CONCURRENCY);

  printSummary(cases, results);

  const report = {
    startedAt: startedAt.toISOString(),
    configuredModelId,
    responseModelIds: [
      ...new Set(
        results.flatMap((r) =>
          r.metadata?.responseModelId ? [r.metadata.responseModelId] : [],
        ),
      ),
    ],
    runsPerCase: runs,
    cases: cases.map((evalCase) => ({
      id: evalCase.id,
      description: evalCase.description,
      input: evalCase.input,
      expectations: evalCase.expectations,
      runs: results.filter((r) => r.caseId === evalCase.id),
    })),
  };

  try {
    await mkdir(REPORT_DIR, { recursive: true });
    const file = path.join(
      REPORT_DIR,
      `brief-review-${startedAt.toISOString().replace(/[:.]/g, '-')}.json`,
    );
    await writeFile(file, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`\nReport written to ${path.relative(process.cwd(), file)}.`);
  } catch {
    console.error('Unable to write the evaluation report.');
    process.exitCode = 1;
  }
}

void main();
