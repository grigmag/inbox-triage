# Add transient email brief review

## Status

Completed and merged in #18. All four slices are implemented: the validated
evaluator, the authenticated reference-based review action, the transient inbox
review experience, and the prompt evaluation tooling. The tooling includes
evaluator run metadata, the shared billing guard, the expectation checker, 15
synthetic cases, and the report-only evaluation script. After prompt fixes, a
funded evaluation run passed every case across three runs.

This is the first production-quality slice of Brief Review. It stops
before persistence, background execution, reply generation, and sending.
Reply generation and sending continue in the
[brief review reply plan](brief-review-reply-plan.md).

## Goal

Let an authenticated user open an inbox email, run a structured AI review, and
inspect the result beneath the source email. Keep the result in browser memory
for this slice while establishing the V1 evaluation contract and service
boundaries that the full persisted workflow can reuse.

## Context

The existing `/offer-emails` page already loads mailbox summaries and the
selected plain-text message on demand. The client stores the active opaque
message reference, and `readMailbox()` resolves the authenticated user's email
connection and closes its provider client after each read. Brief Review should
extend this flow instead of adding another inbox or storing messages locally.

The dashboard already owns a configured OpenRouter model in
`apps/dashboard/src/server/ai.ts` and depends on AI SDK 7 and Zod 4. Keep the
feature in the dashboard until another application or worker establishes a
shared AI contract worth extracting.

The [Brief Review V1 rewrite specification](../rewrite-specs/brief-review-v1-spec.md)
defines the evaluation fields, outcomes, and base prompt. This plan narrows its
workflow for the first slice:

- The product action is named **Review**, not **Evaluate**.
- The application does not save email snapshots or evaluations.
- Selecting another message, refreshing, or leaving the page discards the
  result. Returning to a message does not restore it.
- The UI does not warn that the result is temporary because this slice is for
  the owner's personal testing while the full feature is built.
- Attachments and attachment metadata are unavailable. The evaluator can notice
  attachment dependency only when the email text mentions it.
- Reply generation, editing, and sending remain out of scope.

## Technical Design

### Data & Contracts

This slice adds no database schema. Its central contract is the complete V1
`BriefEvaluationOutput` from the rewrite specification:

- outcomes are `irrelevant`, `needs_information`, or `complete`;
- language is `el`, `en`, `mixed`, or `unknown`;
- the result contains a summary, outcome reason, nine typed analysis fields, and
  a `missingInformation` list;
- every field has a `provided`, `missing`, or `ambiguous` status, a nullable
  value, and a nullable reason;
- missing-information entries use a known V1 field key, a question, and a
  deterministic `blocksCompletion` value.

Create one ordered V1 field definition that owns field keys, labels, prompt
descriptions, value schemas, render kinds, and completion rules. Use it to
constrain the Zod schema, validate missing-information keys, apply completion
rules, and render fields in a stable order. There is no historical schema
registry until persisted evaluations make one necessary.

Use Zod for structural and cross-field validation. The semantic rules include:

- `provided` requires a usable non-null value and a null reason;
- `missing` requires a null value and a factual reason;
- `ambiguous` allows a supported partial value or null and requires a reason;
- project type `other` requires details;
- provided intended use contains at least one non-empty item;
- `complete` requires deliverables, timeline, and at least one of project type or
  objective to be provided;
- `needs_information` has at least one completion-blocking question;
- deliverables and timeline block completion when not provided;
- project type and objective block only when neither is provided;
- every `blocksCompletion` value agrees with those rules;
- `irrelevant` has no missing-information questions;
- `complete` has no completion-blocking question.

Reject inconsistent output and make the one corrective model attempt. Do not
silently rewrite model values.

The server action returns only a serializable feature result:

```ts
type BriefReviewActionResult =
  | { status: 'success'; data: BriefEvaluationOutput }
  | { status: 'noConnection' }
  | { status: 'failure'; message: string };
```

It does not return AI SDK objects, provider metadata, raw output, reasoning, or
usage data.

### Interfaces

Keep the evaluator independent of Next.js and mailbox access. Its input contains
only normalized email data needed by the prompt. Sender metadata stays out of
the evaluator input and model prompt:

```ts
type BriefReviewInput = {
  subject: string | null;
  receivedAt: Date;
  body: string;
};

type BriefReviewAttempt = {
  durationMs: number;
  usage: LanguageModelUsage | null;
  issues: BriefReviewValidationIssue[];
};

type BriefReviewRunMetadata = {
  configuredModelId: string;
  responseModelId: string | null;
  attempts: BriefReviewAttempt[];
};

type EvaluateBrief = (
  input: BriefReviewInput,
) => Promise<{ data: BriefEvaluationOutput; metadata: BriefReviewRunMetadata }>;
```

The evaluator returns run metadata alongside the validated output. One attempt
means the first response was valid; two means the corrective call ran. Issues
contain only Zod paths and messages. Metadata never contains raw model output,
reasoning, or provider metadata. The review use case returns only `data` to the
action, so the action result is unchanged. The evaluation script reads the
metadata now, and the persisted workflow will need the model and usage for each
saved evaluation.

When both attempts fail, `BriefReviewInvalidOutputError` carries the same
attempt metadata so the evaluation script can report the issues. Its safe
message stays unchanged.

The authenticated server action accepts only the opaque message reference:

```ts
declare function reviewEmailAction(
  messageRef: string,
): Promise<BriefReviewActionResult>;
```

The action authenticates and validates the request. A review use case owns the
multi-step mailbox read, input checks, and evaluator call. The browser never
submits its loaded sender, subject, timestamp, or body as authoritative input.

### Structure

Keep the feature under the existing dashboard email capability:

```text
apps/dashboard/src/features/emails/
  actions/
    brief-review-action-result.ts
    review-email.action.ts
  brief-review/
    brief-review-v1.config.ts
    brief-review-v1.prompt.ts
    brief-review-v1.schema.ts
    evaluate-brief.ts
    brief-review.errors.ts
    evals/
      brief-review-v1.eval-cases.ts
      check-brief-review-expectations.ts
  components/
    email-review-panel.tsx
  use-cases/
    review-email.use-case.ts
```

The body-length limit lives in `brief-review-v1.config.ts` so the client can
reuse it. All feature errors extend `BriefReviewError`, whose message is safe to
return from the action.

The exact files may change if implementation reveals a clearer split. Preserve
the boundaries between action, mailbox orchestration, evaluator, V1 contract,
and presentation. Do not add a general AI wrapper or a feature barrel file.

### Behaviors & Flows

The review flow is:

1. The user loads a message and selects **Review email**.
2. The client sends its opaque message reference to the server action.
3. The server authenticates the user and fetches the message through
   `readMailbox()`.
4. The mailbox connection closes before the model call starts.
5. The use case rejects missing plain text or a body over 50,000 JavaScript
   characters before any billable call.
6. The evaluator submits the normalized email to OpenRouter and returns a
   validated V1 result.
7. The client renders that result in the **Brief review** section.

Keep the review action visible but disabled with an explanation when the loaded
message has no non-whitespace plain text or exceeds the same body limit. The
server repeats both checks because client state is untrusted.

While a review runs, disable another review for that message and show the current
spinner. Inbox selection stays available. Keep review state in a standalone
`useBriefReview()` hook owned by the message detail, separate from the mailbox
state in `useEmails()`. The inbox remounts the detail for each loaded message,
which discards its review state, so a late response cannot appear under a newer
selection. The loading state blocks overlapping requests for the same message.

Selecting another message clears the result and error. **Review again** retains
the previous result while the new request runs. A successful rerun replaces it;
a failed rerun leaves it visible and adds a safe inline error.

The message detail stacks three cards in the existing right-hand scrolling
pane: the email headers (subject, sender, date, and recipients), a **Brief
review** card that holds the review action and result, and the email content.
Placing the review above the body keeps the action and its result visible
without scrolling on long emails.

Render the result in the **Brief review** card:

- `irrelevant` shows **Not a production brief**, summary, and outcome reason;
- `needs_information` shows **Needs information** and every V1 field;
- `complete` shows **Brief sufficiently complete** and every V1 field;
- relevant outcomes render fields in configured order with status, value, and
  missing or ambiguous reason;
- a separate **Questions to clarify** section renders every
  `missingInformation` question and distinguishes blocking questions;
- all model-generated content is plain text, never Markdown or HTML;
- missing and ambiguous field statuses use the warning color, and blocking
  questions use the destructive color;
- the outcome, outcome reason, and summary stay visible, while an explicit
  **Hide details** control can hide the field list and questions. Details start
  expanded.

The source email starts expanded. An explicit **Hide content** control can hide
the body while keeping the headers and review visible. The UI never collapses it
automatically.

The evaluator reviews emails asking the studio to scope or perform commercial
photography or video work. Supplier mail, crew coordination, newsletters, and
operational follow-ups are irrelevant even when they mention production.
Borderline production requests use `needs_information` rather than `irrelevant`.
A detail stated only as a preference that leaves other options open is
`ambiguous`; a polite request such as "we would like" states the value. Clarification questions
target only missing or ambiguous fields, so the model must not mark clearly
stated information ambiguous just to ask about it.

Generate summaries, reasons, field prose, and clarification questions in the
email's dominant language. Use English for `unknown`. The language is `mixed`
only when the newest request has full sentences in both Greek and English;
borrowed words, industry terms, greetings, and sign-offs do not count. Preserve
relative timeline phrasing instead of calculating dates.

Send the full plain-text body, including signatures and quoted history. The
prompt treats quoted text as context and tells the model to focus on the newest
sender request. Reliable quote stripping and thread analysis remain outside this
slice.

### Technical Choices

Use AI SDK 7 `generateText()` with `Output.object({ schema })` and the existing
`aiModel`. The configured OpenRouter model and routed provider must support strict
native JSON Schema output. Where the installed OpenRouter provider exposes the
typed option, require routed providers to support the submitted parameters. Do
not fall back to extracting JSON from ordinary text or enable response healing.

Each model call sets `maxRetries: 0` and a 60-second timeout. This disables AI
SDK's automatic billable retries. The application makes one corrective call only
when the first output cannot be structurally parsed or fails semantic Zod
validation. Timeouts, network failures, provider errors, authentication errors,
and unsupported models fail immediately.

Keep the prompt in versioned feature code. Start from the rewrite specification
and add the agreed relevance, language, relative-date, quoted-history, and
irrelevant-output rules. Delimit the email body as untrusted input. Instructions
inside the email cannot override the system prompt.

Use feature-owned errors to return safe messages for mailbox failure, missing or
oversized plain text, provider failure, timeout, and invalid output after the
corrective call. Do not log email content, prompts, raw model output, or raw
provider errors.

Automated tests use deterministic generation and mailbox fakes. Tests, CI,
builds, Git hooks, and application startup make no OpenRouter request.

### Prompt Evaluation

Prompt quality is exercised by a manually run script,
`apps/dashboard/scripts/brief-review-eval.ts`, exposed as
`pnpm --filter @inbox-triage/dashboard eval:brief-review`. It calls
`evaluateBrief()` directly, independent of Clerk, the mailbox, and the page. It
runs under `tsx --conditions=react-server` and loads environment variables with
`@next/env`, like the existing OpenRouter smoke script.

The script makes billable requests only when `OPENROUTER_ALLOW_BILLABLE_REQUESTS`
is `true`. Rename the smoke test's `OPENROUTER_ALLOW_BILLABLE_SMOKE_TEST` guard to
this shared name and update the OpenRouter integration plan's reference.

Cases are synthetic and live in a typed module. Each case has an id, a
description of what it exercises, a `BriefReviewInput` with a fixed
`receivedAt`, and partial expectations. A case asserts only what it specifies:

- outcome, as one value or a set of acceptable values;
- language;
- status of individual fields, each as one value or a set;
- blocking `missingInformation` keys as an exact set;
- non-blocking `missingInformation` keys that must be present.

Expectations check structured output only. They never match summary, reason,
value, or question text; a human reads that prose in the report. Prompt-injection
cases assert structural results, such as an outcome other than `complete`. A
case may also accept a run that the provider's content filter blocked on every
attempt; an unblocked run must still meet its expectations.

The script reports and never gates. It exits non-zero only when it cannot run,
such as a missing guard, missing environment, or unreadable arguments. Failed
expectations, invalid output, provider errors, and timeouts are recorded for the
affected case, and the remaining cases continue.

Options:

- `--runs N` repeats each case, default 1, to show a pass rate across
  nondeterministic runs;
- `--case <id>` limits the run to selected cases and may repeat.

Run at most three evaluations concurrently. To compare models, override
`OPENROUTER_MODEL` for the command; there is no model flag.

The console prints a table of each case with pass rate, failed checks, corrective
attempts, and duration, followed by totals for token usage. Each run writes a
full JSON report to `apps/dashboard/.evals/`, which is gitignored. The report
contains the run timestamp, configured and response model ids, and for every
case and run: the input, output or error type, metadata, and the result of each
check. Reports are never committed.

The expectation checker and evaluator metadata have unit tests. The script's
argument parsing, concurrency, and file output do not.

## Implementation Slices

### 1. Establish the validated V1 evaluator

1. Create the ordered V1 field definition, structural and semantic Zod
   validation, prompt builder, evaluator input contract, and feature errors.
2. Implement the non-streaming AI SDK call with native structured output, the
   per-call timeout, disabled SDK retries, and one corrective attempt for invalid
   output.
3. Test application-owned validation and retry decisions with a deterministic
   fake generation function.
4. Verify that valid output succeeds in one call, an invalid result can recover
   in the second call, a second invalid result fails safely, and provider or
   timeout failures never trigger the corrective call.

### 2. Review the authenticated mailbox message

1. Add the review use case and server action, accepting only an opaque message
   reference from the browser.
2. Authenticate the caller, fetch the message through the existing mailbox
   boundary, close the email client, enforce body availability and length, and
   then invoke the evaluator.
3. Translate expected and unknown failures into the serializable action result
   without exposing source or provider data.
4. Cover the boundary with fakes, including proof that an oversized body fails
   before the evaluator is called.
5. Verify that browser-supplied email content cannot enter the review and every
   response is safe to cross the server action boundary.

### 3. Add the transient inbox review experience

1. Add a standalone `useBriefReview()` hook with loading, result, and error
   state. Keep it out of the mailbox reducer and
   `useEmails()` because review state lives only as long as one loaded message,
   and the persisted workflow will replace it without touching mailbox state.
2. Discard review state by remounting the message detail on selection, ignore
   stale responses, and preserve a successful result during a rerun or failed
   rerun.
3. Add the review action, email disclosure control, and result panel to the
   current message detail flow.
4. Render outcome-specific content, all relevant fields in configured order,
   and clarification questions beneath the email. Keep generated content on
   React's plain-text rendering path.
5. Verify that a user can review and rerun a selected message, collapse and
   restore its body, switch messages during a request without leaking the late
   result, and retry a recoverable failure.

### 4. Exercise prompt quality and finish the feature

1. Return run metadata from `evaluateBrief()`, attach it to
   `BriefReviewInvalidOutputError`, and unwrap `data` in the review use case.
   Extend the evaluator tests to cover attempt count, per-attempt issues, and
   usage.
2. Rename the billing guard to `OPENROUTER_ALLOW_BILLABLE_REQUESTS` and update
   the smoke script and its plan reference.
3. Add the typed expectation checker with unit tests.
4. Add 12 to 15 synthetic cases, including at least three Greek and two
   mixed-language emails. Cover complete, missing, ambiguous, irrelevant,
   attachment-dependent, optional-field, and prompt-injection cases. Keep the
   oversized body in automated control-flow coverage rather than the eval set.
   The owner reviews the Greek wording and the realism of the scenarios.
5. Add the report-only evaluation script, its package script, and the
   gitignored report directory.
6. Run the evaluation with an explicitly funded development key. Resolve
   prompt or schema defects and rerun affected cases with `--runs` until their
   results are stable. Do not commit customer content or live provider output.
7. Complete browser review with two or three messages in a dedicated test
   mailbox at the existing desktop and narrow layouts. It covers UI behavior,
   not prompt quality.
8. Run the repository checks and document every accepted deviation from the
   expected results in this plan.

## Accepted Evaluation Deviations

- `en-prompt-injection`: the configured model's provider blocks the request
  with a content filter before inference, so the evaluator raises an invalid
  output error. The case accepts this; the injection never produces a result.

## Validation

Automated validation should demonstrate:

- every structural and semantic V1 rule, including deterministic completion
  blocking;
- prompt delimiting, sender metadata omission, fallback subject value, and
  preservation of the source body;
- one corrective attempt only for invalid output, with no hidden SDK retries;
- early rejection of absent or oversized plain text;
- authenticated reference-based mailbox access and safe action results;
- evaluator run metadata, including attempt count and issues after a
  corrective call or final invalid output;
- expectation checking for every supported expectation kind.

The evaluation script should show the synthetic case set meeting its
expectations, with any remaining failures documented as accepted deviations.

Manual browser validation should demonstrate the inbox flow with a few test
messages, both email disclosure states, outcome-specific rendering, literal
plain-text output, selection changes during an active request, rerun
replacement, and result retention after a failed rerun. Use only the
dedicated test mailbox until OpenRouter retention, routing, and downstream
provider handling have been approved for real customer email.

Run the repository's formatting, type-checking, lint, and test commands. Do not
run a production build unless explicitly requested. This feature has no database
change, so it needs no migration generation or execution.

## Future Work

The complete feature should replace the synchronous request boundary with a
durable workflow:

1. Save an immutable email snapshot and queued review before dispatch.
2. Run the same versioned evaluator in a background worker.
3. Persist running, successful, and failed states with schema, prompt, and model
   versions.
4. Let the inbox reconnect to a running review after navigation and show the
   saved result when it completes.
5. Add reply-draft generation, editing, explicit sending, and threading after
   persisted evaluations exist.

This is an architectural replacement, not a local TODO in the synchronous server
action. Keep the evaluator, versioned contract, mailbox input mapping, and result
presentation separate so a worker can reuse them. Persistence also unlocks
historical schema rendering.
