/**
 * Generates replies for the synthetic Brief Reply cases with the configured
 * OpenRouter model and checks their structure. A person reads the replies in
 * the report to judge language, greeting, question coverage, and tone.
 *
 * Usage, from the repository root:
 *
 *   OPENROUTER_ALLOW_BILLABLE_REQUESTS=true \
 *     pnpm --filter @inbox-triage/dashboard eval:brief-reply [options]
 *
 * Options:
 *
 *   --runs N     Generate each case N times (default 1) to compare replies
 *                across nondeterministic runs.
 *   --case <id>  Generate only the case with this id. Repeat to select
 *                several cases. Ids are in `brief-reply.eval-cases.ts`.
 *
 * Examples:
 *
 *   # Every case once
 *   OPENROUTER_ALLOW_BILLABLE_REQUESTS=true \
 *     pnpm --filter @inbox-triage/dashboard eval:brief-reply
 *
 *   # Two cases, three runs each
 *   OPENROUTER_ALLOW_BILLABLE_REQUESTS=true \
 *     pnpm --filter @inbox-triage/dashboard eval:brief-reply \
 *     --runs 3 --case el-missing-deliverables --case en-unsigned-no-name
 *
 *   # Compare another model
 *   OPENROUTER_ALLOW_BILLABLE_REQUESTS=true OPENROUTER_MODEL=<model-id> \
 *     pnpm --filter @inbox-triage/dashboard eval:brief-reply
 *
 * Each case supplies fixed questions instead of running a review, so every
 * run makes exactly one billable request. The guard must be set in the shell;
 * setting it in `.env` has no effect. Other environment variables load from
 * the dashboard's `.env` files, as they do for `next dev`.
 *
 * At most three generations run at once. The console shows a per-case table
 * and token totals.
 *
 * A JSON report and a Markdown copy for reading, both including inputs and
 * generated replies, are written to `apps/dashboard/.evals/`, which is
 * gitignored. Never commit them.
 *
 * The script only reports. Failed checks and provider errors are recorded for
 * the affected case. It exits non-zero only when it cannot run: a missing
 * guard, invalid arguments, missing environment variables, or an unwritable
 * report.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { loadEnvConfig } from '@next/env';

import {
  BRIEF_REPLY_EVAL_CASES,
  type BriefReplyEvalCase,
} from '../src/features/emails/brief-reply/evals/brief-reply.eval-cases';
import {
  checkBriefReplyStructure,
  type BriefReplyCheckResult,
} from '../src/features/emails/brief-reply/evals/check-brief-reply-structure';
import type { BriefReplyRunMetadata } from '../src/features/emails/brief-reply/generate-brief-reply';
import {
  BILLING_GUARD,
  allowsBillableRequests,
} from './openrouter-billing-guard';
import { runLimited } from './run-limited';

const CONCURRENCY = 3;
const REPORT_DIR = path.join(process.cwd(), '.evals');

type Options = { runs: number; cases: readonly BriefReplyEvalCase[] };

type RunResult = {
  caseId: string;
  run: number;
  durationMs: number;
  body: string | null;
  errorType: string | null;
  metadata: BriefReplyRunMetadata | null;
  checks: BriefReplyCheckResult[];
  passed: boolean;
};

type Generator =
  (typeof import('../src/features/emails/brief-reply/generate-brief-reply'))['generateBriefReply'];
type InvalidOutputError =
  (typeof import('../src/features/emails/brief-reply/brief-reply.errors'))['BriefReplyInvalidOutputError'];

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
    (id) => !BRIEF_REPLY_EVAL_CASES.some((c) => c.id === id),
  );
  if (unknown.length > 0) {
    throw new UsageError(`Unknown case id: ${unknown.join(', ')}.`);
  }

  return {
    runs,
    cases:
      ids.length === 0
        ? BRIEF_REPLY_EVAL_CASES
        : BRIEF_REPLY_EVAL_CASES.filter((c) => ids.includes(c.id)),
  };
}

class UsageError extends Error {}

async function runCase(
  generateBriefReply: Generator,
  InvalidOutput: InvalidOutputError,
  evalCase: BriefReplyEvalCase,
  run: number,
): Promise<RunResult> {
  const startedAt = performance.now();
  const base = { caseId: evalCase.id, run };

  try {
    const { body, metadata } = await generateBriefReply(evalCase.input);
    const checks = checkBriefReplyStructure(body);

    return {
      ...base,
      durationMs: Math.round(performance.now() - startedAt),
      body,
      errorType: null,
      metadata,
      checks,
      passed: checks.every((check) => check.passed),
    };
  } catch (error) {
    const metadata = error instanceof InvalidOutput ? error.metadata : null;
    const checks = evalCase.acceptsContentFilter
      ? [
          {
            check: 'contentFilter',
            passed: metadata?.finishReason === 'content-filter',
            match: null,
          },
        ]
      : [];

    return {
      ...base,
      durationMs: Math.round(performance.now() - startedAt),
      body: null,
      errorType: error instanceof Error ? error.name : 'UnknownError',
      metadata,
      checks,
      passed: checks.length > 0 && checks.every((check) => check.passed),
    };
  }
}

function failures(result: RunResult): string[] {
  if (result.passed) {
    return [];
  }

  return result.errorType
    ? [result.errorType]
    : result.checks.filter((c) => !c.passed).map((c) => c.check);
}

function printSummary(
  cases: readonly BriefReplyEvalCase[],
  results: RunResult[],
) {
  const rows = cases.map((evalCase) => {
    const runs = results.filter((result) => result.caseId === evalCase.id);
    const failedChecks = new Map<string, number>();

    for (const failure of runs.flatMap(failures)) {
      failedChecks.set(failure, (failedChecks.get(failure) ?? 0) + 1);
    }

    return {
      case: evalCase.id,
      passed: `${runs.filter((r) => r.passed).length}/${runs.length}`,
      'failed checks': [...failedChecks]
        .map(([check, count]) => (count > 1 ? `${check} ×${count}` : check))
        .join(', '),
      'avg ms': Math.round(
        runs.reduce((sum, r) => sum + r.durationMs, 0) / runs.length,
      ),
    };
  });

  console.table(rows);

  const usages = results.flatMap((r) =>
    r.metadata?.usage ? [r.metadata.usage] : [],
  );
  const sum = (read: (usage: (typeof usages)[number]) => number | undefined) =>
    usages.reduce((total, usage) => total + (read(usage) ?? 0), 0);

  const passed = results.filter((r) => r.passed).length;
  console.log(`\nPassed ${passed}/${results.length} runs.`);
  // Only calls that returned a response are recorded. A timeout or provider
  // error may still have been billed, so those runs are flagged separately.
  console.log(
    `Tokens: ${sum((u) => u.inputTokens)} input, ${sum((u) => u.outputTokens)} output, ${sum((u) => u.totalTokens)} total across ${usages.length} measured model calls.`,
  );

  const unmeasured = results.filter(
    (r) => r.metadata !== null && r.metadata.usage === null,
  ).length;
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

/** Renders the replies for a person to read. */
function renderMarkdown(
  report: { startedAt: string; configuredModelId: string },
  cases: readonly BriefReplyEvalCase[],
  results: RunResult[],
): string {
  const lines = [
    `# Brief reply evaluation`,
    '',
    `Started ${report.startedAt} with \`${report.configuredModelId}\`.`,
  ];

  for (const evalCase of cases) {
    const { subject, body, language, questions } = evalCase.input;

    lines.push(
      '',
      `## ${evalCase.id}`,
      '',
      evalCase.description,
      '',
      `Language: \`${language}\`. Subject: ${subject ?? '(none)'}`,
      '',
      'Questions:',
      '',
      ...questions.map((q) => `- \`${q.fieldKey}\`: ${q.question}`),
      '',
      '<details><summary>Email</summary>',
      '',
      fence(body),
      '',
      '</details>',
    );

    for (const result of results.filter((r) => r.caseId === evalCase.id)) {
      const failed = failures(result);

      lines.push(
        '',
        `### Run ${result.run}: ${result.passed ? 'pass' : `fail (${failed.join(', ')})`}`,
        '',
        result.body === null ? '_No reply._' : fence(result.body),
      );
    }
  }

  return `${lines.join('\n')}\n`;
}

function fence(text: string): string {
  const longestRun = Math.max(
    2,
    ...Array.from(text.matchAll(/`+/g), (match) => match[0].length),
  );
  const marker = '`'.repeat(longestRun + 1);
  return `${marker}text\n${text}\n${marker}`;
}

async function main() {
  let options: Options;

  try {
    options = parseOptions();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error('Usage: eval:brief-reply [--runs N] [--case <id>]...');
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

  let generator: typeof import('../src/features/emails/brief-reply/generate-brief-reply');
  let errors: typeof import('../src/features/emails/brief-reply/brief-reply.errors');
  let configuredModelId: string;

  try {
    generator =
      await import('../src/features/emails/brief-reply/generate-brief-reply');
    errors =
      await import('../src/features/emails/brief-reply/brief-reply.errors');
    configuredModelId = (await import('../src/server/ai')).aiModel.modelId;
  } catch (error) {
    console.error(
      error instanceof Error && error.message.includes('is missing or empty')
        ? error.message
        : 'Unable to load the reply generator. Check the environment configuration.',
    );
    process.exitCode = 1;
    return;
  }

  const { runs, cases } = options;
  const total = cases.length * runs;
  const startedAt = new Date();
  console.log(
    `Making ${total} billable OpenRouter requests with ${configuredModelId}: ${cases.length} cases × ${runs} runs.`,
  );

  let completed = 0;
  const tasks = cases.flatMap((evalCase) =>
    Array.from({ length: runs }, (_, index) => async () => {
      const result = await runCase(
        generator.generateBriefReply,
        errors.BriefReplyInvalidOutputError,
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
      reviewCaseId: evalCase.reviewCaseId,
      input: evalCase.input,
      runs: results.filter((r) => r.caseId === evalCase.id),
    })),
  };

  try {
    await mkdir(REPORT_DIR, { recursive: true });
    const file = path.join(
      REPORT_DIR,
      `brief-reply-${startedAt.toISOString().replace(/[:.]/g, '-')}`,
    );
    await writeFile(`${file}.json`, `${JSON.stringify(report, null, 2)}\n`);
    await writeFile(`${file}.md`, renderMarkdown(report, cases, results));
    console.log(
      `\nReports written to ${path.relative(process.cwd(), file)}.json and .md.`,
    );
  } catch {
    console.error('Unable to write the evaluation reports.');
    process.exitCode = 1;
  }
}

void main();
