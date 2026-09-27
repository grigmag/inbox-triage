# Redesign the email detail pane as a thread

## Status

Planned. No slices are implemented.

## Goal

Make the email the main content of the detail pane and put the brief review
and reply under it, in reading order. The pane should read like a mail thread:
the email, then a short brief review, then the reply.

After the change:

- the email header and body come first, and the body is always visible;
- the brief review is a compact card below the email that shows gaps before
  provided details, and it shrinks to one line once a reply exists;
- the header has one primary action that follows the workflow, from
  **Review brief** to **Draft reply** or **Write reply**, then **Go to reply**,
  then a **Reply sent** indicator;
- the composer looks like a mail composer rather than a form, with its actions
  in a bar that stays visible while the user scrolls a long draft.

Two later slices change behaviour. The composer says when a draft was written
from an earlier review, and the user picks which questions the reply asks.

## Context

`EmailsInbox` renders `EmailDetail` in a scrolling `section` and remounts it
per loaded message (`key={state.messageRequestId}`). Review, reply, and any new
local UI state are discarded on every message change. This plan relies on
that.

`EmailDetail` renders four identical shadcn `Card`s in this order: a header
card (subject, from, and a `dl` of Date, To, CC, Reply-To), the Brief review
card (`EmailReviewPanel`), the Reply card (`EmailReplyComposer`), and an
**Email content** card with a Hide content toggle. On a real brief the user
scrolls past roughly 1,150px of review and reply before reaching the email.
The review panel lists all nine fields with equal weight, so gaps are hard to
find. The body runs the full width of the pane.

Current behaviour that the redesign keeps:

- `useBriefReview()` holds one result. A failed rerun keeps the previous
  result beside the error. `getReviewUnavailableReason()` in
  `email-detail.tsx` explains why review is disabled (no plain text, or longer
  than `BRIEF_REVIEW_MAX_BODY_LENGTH`).
- A reply is available for any non-`irrelevant` result. When the result has
  `missingInformation` items, the user drafts with AI, and generation sends the
  latest review's language and all its questions, blocking and optional. When
  it has none, **Write reply** opens a blank draft (commit b28d4c2). A
  `complete` result can still carry optional questions, so it can offer
  **Draft reply** too.
- `useBriefReply()` wraps the pure `briefReplyReducer` in
  `state/brief-reply-state.ts`. The reducer has tests for edit detection,
  overlapping requests, and the lock after sending. **Draft reply** stays in
  the review card until a draft exists, so a failed first generation can be
  retried there. **Regenerate** uses the latest review's questions, is hidden
  when the latest review has none, and asks for confirmation over an edited
  draft through `ConfirmActionDialog`.
- The composer shows a generating skeleton, an inline error (with a "may have
  been sent" title for `unconfirmed`), a sent alert listing accepted and
  rejected recipients and whether the original was quoted, and a read-only
  textarea after sending. Its field description says the original is quoted
  when sent and asks the user to add their name.
- `briefReplyInputSchema` accepts 1 to 20 questions from the browser, and
  the prompt asks for "every piece of information they cover and nothing
  else". The server does not check the questions against a review, because
  it never sees one.

The UI package has `Badge`, `Button`, `Card`, `Alert`, `Field`, `Skeleton`,
`Spinner`, and `Textarea`, but no `Avatar`, `Collapsible`, or `Checkbox`.
`Button` sizes icons marked with `data-icon="inline-start"` or
`"inline-end"`. `globals.css` has one project-added status token, `warning`,
and `docs/application-conventions.md` documents it under "User feedback".
Dashboard tests run in Vitest's `node` environment on `*.test.ts` files only,
so the plan tests pure helpers and reducers, not components.

The approved interactive prototype is
[`docs/prototypes/email-detail-thread-states.html`](../prototypes/email-detail-thread-states.html).
Open it in a browser to step through every state below. `docs/prototypes/` is
gitignored, so the file exists only in the local checkout that created it.
This plan restates the design so it does not depend on that file.

## Technical Design

### Layout and states

The detail pane is one column, centred, about 820px wide at most, with
generous vertical spacing between the three parts. It no longer puts every
part in a card.

**Email header.** The subject is the page heading. Beside it, on the right,
sits the primary action. Below it, an `Avatar` with the sender's initials, the
sender name with the address in muted text, and one muted line with the
recipients and date: "to hello@example.com · 24/09/2026 08:48". CC and
Reply-To are appended to that line as "cc ..." and "reply-to ..." segments
when present, and the line may wrap. Reply-To matters because it decides
where the reply goes, so it stays visible. The date keeps
`formatEmailDate(..., { detail: true })`.

**Email body.** Plain text with preserved whitespace and `wrap-anywhere`,
capped at about `68ch`, at a comfortable reading size and line height. It is
always shown. A message without plain text keeps today's "Plain-text content
is unavailable" message.

**Brief review card.** It sits below the email and has these states:

| State                    | What the card shows                                                                                                                                                                                                                                                                                                                                            |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Not reviewed             | A slim dashed card: icon, "Brief review", the description "Check whether this email is a complete production brief and draft a reply asking for anything missing.", and **Review brief**.                                                                                                                                                                      |
| Unavailable              | The same card with the `getReviewUnavailableReason()` text as the description and a disabled **Review brief**.                                                                                                                                                                                                                                                 |
| First review running     | Title with "Reviewing..." and a skeleton in a `role="status"` region labelled "Reviewing email".                                                                                                                                                                                                                                                               |
| First review failed      | The not-reviewed card with a destructive `Alert` and **Try again**.                                                                                                                                                                                                                                                                                            |
| Result, collapsed        | Default. Title row with the outcome badge and a ghost **Review again**. The summary clamped to two lines. A "5 of 9 details clear" meter. The unclear fields as badges after an "Unclear" label, or "Every detail needed for a quote is in the email." when there are none. Then **Draft reply** or **Write reply**, the reply sentence, and **Show details**. |
| Result, expanded         | The same, with the full summary and a details section: outcome reason, "Needs attention", "Provided", "Questions the reply will ask", and **Show less**.                                                                                                                                                                                                       |
| Reply exists             | A one-line strip: "Brief review", outcome badge, "5 of 9 clear · reply asks 4 questions", and **Show**. Opening it shows the collapsed result with a **Hide** control that returns to the strip. The draft button is gone because the composer owns regeneration.                                                                                              |
| `irrelevant`             | One compact card: title, "Not a production brief" badge, **Review again**, and the outcome reason. No meter, fields, or reply action.                                                                                                                                                                                                                          |
| Rerun failed with result | The result stays, with the destructive `Alert` above the summary, as today.                                                                                                                                                                                                                                                                                    |

Details of the result view:

- Outcome badges: "Needs information" in the warning style with an alert
  icon, "Brief complete" in the new success style with a check icon, and
  "Not a production brief" as `secondary`.
- The meter has nine equal segments in `BRIEF_REVIEW_V1_FIELD_KEYS` order:
  success colour for provided and a softened warning colour for missing or
  ambiguous. It is one `role="img"` element whose label repeats the visible
  count. The visible text "N of 9 details clear" carries the meaning, so the
  segments need no tooltips.
- Field badges: "Ambiguous" uses today's tinted warning style. "Missing" uses
  a dashed warning outline and no fill, so the two differ without relying on
  colour. The same styles apply in the details section. They are dashboard
  `className`s on `Badge`, as `warningBadgeClassName` is today, not new
  `Badge` variants.
- The reply sentence is "The reply will ask 4 questions, 2 blocking." The
  blocking part is left out when there are no blocking questions, and the
  noun is singular for one question. With no questions it reads "Nothing to
  ask, so the reply starts blank."
- "Needs attention" is a bordered list of the missing and ambiguous fields.
  Each row has the label, the status badge under it, the value ("Not
  mentioned" in muted italics when null), and the reason in muted text.
  "Provided" is a compact two-column `dl` of label and value. Both groups
  follow `BRIEF_REVIEW_V1_FIELD_KEYS` order. Today's `FieldValue` rendering
  of `projectType` and `intendedUse` carries over, and model output stays
  plain React text.
- "Questions the reply will ask" is a numbered, read-only list. Each item has
  its number, the question, and a **Blocking** (`destructive`) or
  **Optional** (`outline`) badge. The badge aligns with the question's first
  line and keeps its own height instead of stretching to the paragraph.

The collapse level is local `useState` in the dashboard, with three values:
`strip`, `summary`, and `details`. It starts at `summary`. Starting a reply
sets it to `strip` in the same click handler, not in an effect. **Show**,
**Hide**, **Show details**, and **Show less** move between levels. Every
toggle is a `Collapsible` trigger, so `aria-expanded` and `aria-controls` come
from the component.

**Composer.** It sits below the brief review card:

- A top row with a reply icon, "To", one chip per recipient (small initials
  avatar and name, with the address as the accessible name or when there is
  no name), and "Re: subject" right-aligned and truncated. The recipient and
  subject rules stay the same as today's `replyRecipients()` and
  `replySubject()`.
- Error and sent alerts under the top row, with today's content: the
  "may have been sent" title for `unconfirmed`, accepted and rejected
  recipients, and the note when the original was too large to quote.
- A borderless, auto-growing editor. It keeps a visually hidden "Message"
  label, `aria-invalid`, `aria-describedby`, and the validation error. The
  focus indication moves to the composer container through `focus-within`, so
  removing the textarea border does not remove the visible focus. The editor
  is read-only after sending and disabled while generating or sending.
- Below the editor, the muted hint "Add your name before sending." as the
  field description, and a collapsed disclosure, "Original email is quoted
  below when sent", that opens a muted preview of the attribution and the
  start of the original text. The preview is illustrative. The package builds
  the real quote at send time.
- A bar at the bottom, sticky to the scrolling pane, with **Regenerate** on the
  left and **Send reply** on the right. It is hidden after sending. The
  generating skeleton, the confirmation before regenerating an edited draft,
  and the blank reply for briefs without questions keep today's behaviour.

**Buttons with icons.** Use lucide icons with `data-icon="inline-start"` or
`"inline-end"` so `Button` sizes and spaces them. Check optical centring in
the browser at `default`, `sm`, and `xs` sizes. If an icon looks low, raise it
with the user. Do not edit `packages/ui/src/components/button.tsx` for it.

### Interfaces

The header action comes from a pure helper so its precedence is testable:

```ts
type EmailDetailPrimaryAction =
  | { kind: 'review'; disabled: boolean }
  | { kind: 'reviewing' }
  | { kind: 'draftReply'; disabled: boolean }
  | { kind: 'writeReply'; disabled: boolean }
  | { kind: 'goToReply' }
  | { kind: 'replySent' }
  | { kind: 'none' };

declare function getEmailDetailPrimaryAction(input: {
  review: BriefEvaluationOutput | null;
  reviewLoading: boolean;
  reviewUnavailable: boolean;
  reply: Pick<BriefReplyState, 'draft' | 'pending' | 'sent' | 'error'>;
  /** Questions the next generation would send. Empty means a blank reply. */
  questionCount: number;
}): EmailDetailPrimaryAction;
```

Precedence, first match wins:

1. `replySent` after a successful send.
2. `goToReply` while generating, sending, or once a draft exists.
3. `reviewing` while a review runs.
4. `none` for an `irrelevant` result.
5. `draftReply` or `writeReply` for any other result, by `questionCount`.
   This also covers a failed first generation (error, no draft), so the
   header offers the retry. Disabled while the reply is pending.
6. `review` otherwise, disabled when review is unavailable.

The same helper, or a sibling in the same file, derives the result summary
the card needs:

```ts
type BriefReviewSummary = {
  gaps: BriefReviewFieldKey[]; // missing or ambiguous, canonical order
  provided: BriefReviewFieldKey[]; // canonical order
  questionCount: number;
  blockingQuestionCount: number;
};

declare function summarizeBriefReview(
  review: BriefEvaluationOutput,
): BriefReviewSummary;
```

A small `getSenderInitials(address: EmailAddressDto)` helper returns up to two
initials from the name, including Greek names, falls back to the first letter
of the address, and never returns an empty string.

### Structure

```text
packages/ui/src/
  components/
    avatar.tsx                 # shadcn registry, new
    collapsible.tsx            # shadcn registry, new
    checkbox.tsx               # shadcn registry, new in slice 7
  styles/globals.css           # adds the success token
  index.ts                     # named exports for the new components

apps/dashboard/src/features/emails/
  components/
    email-detail.tsx           # orchestration, order, scroll and focus
    email-detail-header.tsx    # subject, sender, recipients line, primary action
    email-review-panel.tsx     # rewritten card states
    email-reply-composer.tsx   # restyled composer
  lib/
    get-sender-initials.ts
    summarize-brief-review.ts
  state/
    email-detail-primary-action.ts
    brief-reply-state.ts       # records the draft's source in slice 6
    brief-reply-staleness.ts   # slice 6
```

Each new helper has a colocated `*.test.ts`. Split the review panel into
smaller components in the same folder if it reads more clearly, for example
the strip and the details section. Keep all product styling and composition
in the dashboard. `packages/ui` gets only registry components and the token.

### Behaviors & Flows

Primary action clicks:

- **Review brief** runs the review, as the card button does.
- **Draft reply** and **Write reply** do what the card button does. They
  collapse the brief to the strip, render the composer, and scroll it into
  view. The scroll runs after the composer mounts. Use smooth scrolling only
  when the user has not set `prefers-reduced-motion`.
- When a generation the user started succeeds, focus the editor without
  scrolling again and update a persistent `role="status"` region in the
  composer to "Reply draft ready." The region is always in the DOM so screen
  readers announce the change. A blank reply focuses the editor immediately.
  `useBriefReply().generate()` may resolve to whether a draft arrived, so the
  handler can focus after `await` instead of watching state in an effect. If
  the message remounts first, the ref is gone and nothing happens.
- **Go to reply** scrolls to the composer and does not move focus.

The header and in-card buttons both stay visible. Hiding the header action
while the card button is on screen needs an `IntersectionObserver`, and the
duplication has not been a problem in the prototype, so it is a follow-up.

### Draft source and staleness (slice 6)

Today the draft keeps its old questions after **Review again**, while the card
shows the new review. **Regenerate** silently uses the new questions,
disappears when the new review has none, and after an `irrelevant` re-review
the draft stays under a card that says there is nothing to reply to.

A draft is stale when a newer review exists than the one it was generated
from. The comparison uses review identity, not question text: model output
rarely repeats a question word for word, so comparing text would add rules
without avoiding many notices, and "you reviewed again after drafting" is
easier to explain than "the questions differ".

`useBriefReview()` exposes a `resultId` that increases on each successful
result. The reply state records which review each draft came from:

```ts
type BriefReplySource = {
  /** The `resultId` of the review the draft was generated or started from. */
  reviewId: number;
};

type BriefReplyState = {
  // existing fields...
  /** Source of the current draft. Null until a draft exists. */
  source: BriefReplySource | null;
  /** Source of the generation in flight, committed only on success. */
  pendingSource: BriefReplySource | null;
};
```

`startGenerate` carries its source. A successful `setGenerateResult` commits
it, and a failed one keeps the old source beside the old draft. `startBlank`
records the current `resultId` too.

A pure helper decides the notice:

```ts
type BriefReplyStaleness =
  null | 'reviewChanged' | 'nothingToAsk' | 'notABrief';

declare function getBriefReplyStaleness(input: {
  source: BriefReplySource | null;
  review: BriefEvaluationOutput | null;
  reviewId: number | null;
  sent: boolean;
}): BriefReplyStaleness;
```

The draft is current when `source.reviewId` equals the latest `reviewId`.
Otherwise the latest review picks the row below. A re-review that happens to
return the same questions still shows the notice. The text is still true, and
regenerating costs one click.

| Staleness       | When                                                            | One-line notice in the composer                                                           | Regenerate |
| --------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------- |
| `reviewChanged` | A newer review exists, and it has questions.                    | "This draft was written from an earlier review. Regenerate to use the current questions." | Enabled    |
| `nothingToAsk`  | A newer, non-irrelevant review exists, and it has no questions. | "The latest review found nothing to ask. Check this draft before sending."                | Hidden     |
| `notABrief`     | The latest review is `irrelevant`.                              | "The latest review says this is not a production brief. Check this draft before sending." | Hidden     |

Decisions in this table:

- The draft is never discarded. It is the user's text, and **Send reply**
  stays enabled in every row.
- A blank reply counts as having no questions. If a re-review of a `complete`
  brief now returns questions, the notice appears and **Regenerate** offers
  the AI draft, behind the existing confirmation for edited text.
- A blank reply started from a review with no questions stays current until
  the next review, like any draft. If that review also has no questions, the
  `nothingToAsk` wording tells the user the blank reply is still fine.
- Editing does not clear the notice. Edits do not make the draft ask the
  current questions. The notice clears after a successful regeneration or
  after sending. It has no dismiss button: it is one quiet line, and it goes
  away as soon as the user regenerates or sends.
- While a re-review runs, **Regenerate** stays disabled as today, and the
  notice waits for the result.

### Question selection (slice 7)

The read-only question list becomes a list of checkboxes, all checked when
each new review result arrives. The selection is local dashboard state tied
to the review's `resultId`, so a new result resets it without an effect.
`BriefReplySource` gains the selected question indices, so the draft
remembers which questions of its review it asked.

- The next generation sends the checked questions in review order. The action
  and schema already accept any 1 to 20 questions, and the prompt asks only
  for what the supplied questions cover, so the server, prompt, and eval need
  no change. Check this during the slice. If a draft built only from optional
  questions reads badly, add one eval case before touching the prompt.
- The reply sentence and strip count the selection: "The reply will ask 3 of
  4 questions, 2 blocking." The button keeps its plain **Draft reply** label.
  The sentence beside it already shows the count, and a changing label makes
  the main action harder to recognise.
- With nothing checked before a draft exists, the action becomes
  **Write reply** and the sentence reads "No questions selected, so the reply
  starts blank." This matches the complete-brief behaviour and needs no
  server change. Unchecking blocking questions is allowed. The badges already
  show what the user is leaving out.
- After a draft exists, the draft is also stale when it came from the
  current review but its selected indices differ from the current selection.
  The notice then reads "The selected questions changed. Regenerate to update
  the draft." When the draft came from an earlier review, slice 6's text
  applies. With nothing checked,
  **Regenerate** is disabled rather than replacing the draft with a blank
  one.
- The checkboxes are disabled while generating or sending, and after sending.

### Technical Choices

- Add a `success` token beside `warning` in `globals.css`, in `:root` and
  `.dark`, with a `--color-success` mapping and the same "Project addition"
  comment. Start from `oklch(0.55 0.12 155)` in light mode and pick a lighter
  green for dark mode. Small badge text on a 10% tint must reach 4.5:1
  contrast in both themes. This extends the reusable package's theme with a
  product status colour, the tradeoff `warning` already made. Update the
  status colour bullet in `docs/application-conventions.md`: `success` marks
  completed or positive states, such as a complete brief, clear details, or a
  sent reply.
- Add `Avatar`, `Collapsible`, and later `Checkbox` from the `@shadcn`
  registry, following the AGENTS.md shadcn workflow. They are generic
  primitives, so they belong in `packages/ui`. The composer chip, meter,
  field badges, and card states stay in the dashboard.
- The review panel keeps `Card` for the brief and composer containers. The
  email itself is not a card.
- No database, action, or schema changes in the layout slices.

## Implementation Slices

### 1. Add the UI foundations

1. From `apps/dashboard`, preview `avatar` and `collapsible` from the
   `@shadcn` registry with `--dry-run` and `--diff`, then apply. Check the
   generated imports against the package aliases and the compatibility notes
   in `packages/ui/AGENTS.md`, and add named exports to
   `packages/ui/src/index.ts`.
2. Confirm that only the intended files and dependencies changed, that only
   the root `pnpm-lock.yaml` changed, and that React versions stay single.
3. Add the `success` token in light and dark mode, check contrast, and update
   the status colour convention.

### 2. Put the email first

1. Add `email-detail-header.tsx` with the subject, `Avatar`, sender, and the
   recipients and date line. Add `getSenderInitials()` with tests.
2. Render the body without a card, always visible and capped at about `68ch`.
   Remove the Hide content toggle and its state.
3. Reorder `EmailDetail` to email, brief review, reply, and centre the column.
   The existing review and reply cards move unchanged.
4. Leave a slot for the primary action. Slice 5 fills it.

### 3. Redesign the brief review card

1. Add `summarizeBriefReview()` with tests for gaps-first grouping, canonical
   order within each group, and question and blocking counts.
2. Rewrite `EmailReviewPanel` with the states in the table above: dashed
   pre-result card, skeleton, errors, unavailable reason, collapsed and
   expanded result, and the compact `irrelevant` card.
3. Add the three-level collapse state with `Collapsible`, and switch to the
   strip when a reply starts. Keep **Draft reply** in the card while no draft
   exists, so a failed first generation can still be retried from the card.
4. Check the question badges against multi-line questions, and check the
   narrow pane width.

### 4. Restyle the composer

1. Replace the To and Subject `dl` with the recipient chips and subject row.
2. Make the editor borderless with focus on the container, keeping the hidden
   label, description, validation error, and ARIA wiring.
3. Add the quoted-original disclosure and the sticky action bar.
4. Walk through every existing composer state in the browser: generating,
   failed first draft, failed regeneration, `unconfirmed`, sent with rejected
   recipients, sent without quoting, blank reply, and the regenerate
   confirmation.

### 5. Add the header primary action

1. Add `getEmailDetailPrimaryAction()` with tests for each branch and the
   precedence order, including a failed first generation, a re-review while
   a draft exists, and a `complete` result with and without optional
   questions.
2. Render the action in the header and wire it to the same handlers as the
   card buttons.
3. Scroll to the composer on **Draft reply**, **Write reply**, and **Go to
   reply**. Focus the editor and update the status region when a draft
   arrives.
4. Verify keyboard and screen reader behaviour for the toggles, the focus
   move, and the announcement.

### 6. Flag drafts from an earlier review

1. Add `source` and `pendingSource` to the reply state, with reducer tests for
   success, failure, blank replies, and sending.
2. Expose `resultId` from `useBriefReview()`.
3. Add `getBriefReplyStaleness()` with tests for each row of the staleness
   table, a current draft, a blank reply, and a sent reply.
4. Show the one-line notice at the top of the composer, and hide
   **Regenerate** for `nothingToAsk` and `notABrief`.

### 7. Let the user choose the questions

Depends on slice 6.

1. Add `checkbox` to `packages/ui` with the same shadcn workflow as slice 1.
2. Replace the read-only list with checkboxes and add selection state tied to
   `resultId`.
3. Build the generation input from the selection, update the counts, and
   handle an empty selection as described above.
4. Extend the staleness helper and its tests for selection changes.
5. Draft a reply from a subset in the test mailbox and read it. Change the
   prompt or eval cases only if the result shows a need.

### 8. Verify the redesign

1. Do a final browser pass over every state below in light and dark mode.
2. Move the `PROGRESS.md` entry to Completed and update Status.

## Validation

After each slice, run `pnpm typecheck`, `pnpm lint`, and `pnpm test` from the
repository root. Do not run `pnpm build`.

Automated tests cover the helpers and the reducer: sender initials, the
review summary, primary action precedence, the draft source in the reducer,
and staleness for each case above. They do not cover markup or copy.

The running app needs Clerk sign-in and a connected mailbox, so check each
slice by hand in the browser with the dedicated test mailbox. Compare against
these states:

- not reviewed, reviewing, review failed, and review unavailable;
- `needs_information` collapsed and expanded, and the strip after drafting;
- drafting, draft ready, and reply sent;
- `complete` with no questions leading to a blank reply, and `complete` with
  optional questions;
- `irrelevant`;
- **Review again** after drafting, where the new review has questions, no
  questions, or an `irrelevant` result (slice 6);
- partial, full, and empty question selections, before and after a draft
  exists (slice 7).

Also check a long email and a long draft (sticky bar, scroll to composer),
the narrow pane width, keyboard use of every toggle, focus after a draft
arrives, dark mode, and icon centring in buttons.

## Non-goals and follow-ups

- An automatic signature. It needs a signature setting that does not exist.
  The composer keeps the "Add your name before sending." hint.
- Folding the email to a few lines while replying.
- Persisting reviews, drafts, or the collapse state.
- Brief status dots in the inbox list.
- A right-rail layout and the alternative themes from the earlier prototype.
- A "More actions" menu in the header. The prototype shows one, but there are
  no actions to put in it.
- Hiding the header action while the card button is visible.

## Open Questions

None. The selected count appears only in the reply sentence, and the
staleness notice is not dismissible (see slices 6 and 7).
