# Add a company footer to drafted replies

## Status

In progress. Slice 1 is complete. The schema, application contracts, repository and form now use only the footer fields, and the company settings copy is in English. The generated migration is named `0006_trim-company-profile.sql`; its SQL and snapshot contain only the planned column rename and four drops. `pnpm db:check`, `pnpm typecheck`, `pnpm lint` and `pnpm test` pass. Tests required running outside the agent sandbox so local email test servers could listen. The user confirmed applying the migration. Slices 2 and 3 have not started.

## Goal

Give the company profile a job in the current app. Drafted replies end with a footer built from the company profile, so every reply the studio sends carries its name and contact details.

- The company profile keeps only the fields a footer needs: name, email, phone, address, postal code and city. The invoice fields (tax ID, tax office, IBAN, bank name) go away.
- Generated drafts end with the footer. Blank replies, which the user writes without AI, start with it.
- The footer is part of the draft text, so the user sees it and can edit or delete it before sending.
- With an empty company profile, replies look exactly as they do today.

A per-user signature and the company name as the sender's display name are out of scope. The footer design leaves room for both (see Technical Choices).

## Context

- `company_profile` (`packages/db/src/schema/company-profile.ts`) is a studio-wide singleton row with a `uniqueIndex` on `(true)` and a fixed ID in `CompanyProfileRepository`. It has no `userId`. The row may not exist yet, and `get()` returns an all-null DTO in that case.
- The company profile feature lives in `apps/dashboard/src/features/settings/company-profile`: input schema with per-field limits, DTO, repository, save action and form. The settings page is `/settings/company`, with a "Company" tab. It is the only part of the app whose user-facing copy is in Greek: form legends, labels and the save button in `company-profile-form.tsx`, the save action's announcement and failure message, and `validation-messages.ts`. Everything else is in English.
- `generateBriefReplyUseCase` reads the message from the mailbox, calls `generateBriefReply`, and returns `{ body }`. `generateBriefReply` rejects empty output and output over `BRIEF_REPLY_MAX_BODY_LENGTH` (20,000) with `BriefReplyInvalidOutputError`.
- The reply prompt ends with "End with a generic closing and no name, company, or placeholder." The reply evals depend on that rule, so the prompt must not change.
- The reply reducer (`features/emails/components/email-detail/brief-reply-state.ts`) stores a successful generation as both `draft` and `generated`. A draft counts as edited when the two differ. `startBlank` sets both to `''`. Staleness (`get-brief-reply-staleness.ts`) compares review IDs and question selections only, never draft text.
- The emails page (`app/(app)/emails/page.tsx`) is a server component. Below it, `EmailsInbox`, `EmailDetail`, `EmailDetailContent` and `EmailDetailProvider` are client components. `EmailDetailProvider.startReply` starts a blank draft inside `flushSync` and then focuses the editor, so the blank draft's text must already be available on the client.
- The send body schema (`brief-reply-body.schema.ts`) requires visible text and enforces the same length limit.
- drizzle-kit 0.31.10 asks interactively whether an added column is a rename when the same `generate` also drops columns from that table. An agent cannot answer the prompt. `generate --custom` doesn't help: it copies the previous snapshot, so a hand-written rename would be detected again by the next `generate`.

## Technical Design

### Data & Contracts

`company_profile` after the change:

| Column                                             | Change                    |
| -------------------------------------------------- | ------------------------- |
| `id`, `created_at`, `updated_at`                   | unchanged                 |
| `name`                                             | renamed from `legal_name` |
| `address`, `postal_code`, `city`, `phone`, `email` | unchanged                 |
| `tax_id`, `tax_office`, `iban`, `bank_name`        | dropped                   |

The singleton index and table name stay. The migration should contain one `RENAME COLUMN` and four `DROP COLUMN` statements and nothing else. Dropping the columns deletes their data, which is acceptable because the app is not deployed.

`CompanyProfileInput` and `CompanyProfileDto` follow the table: `name`, `email`, `phone`, `address`, `postalCode`, `city`, all `string | null`, keeping their current limits and trimming (`name` takes the `legalName` limit of 200). The form labels the field "Company name", and all copy on the company settings page is in English.

### Interfaces

One module in the brief-reply capability, `features/emails/brief-reply/reply-footer.ts`, with two pure functions:

```ts
export type ReplyFooterProfile = Pick<
  CompanyProfileDto,
  'name' | 'email' | 'phone' | 'address' | 'postalCode' | 'city'
>;

/** The footer text, or null when the profile has nothing to show. */
export function formatReplyFooter(profile: ReplyFooterProfile): string | null;

/** Adds the footer below the body, separated by a blank line. */
export function appendReplyFooter({
  body,
  footer,
}: {
  body: string;
  footer: string | null;
}): string;
```

`appendReplyFooter` returns `body` unchanged when `footer` is null, and otherwise `${body}\n\n${footer}`.

### Behaviors & Flows

**Generated reply**

1. The user generates a reply, as today.
2. The use case drafts the body with the unchanged prompt.
3. It loads the company profile and appends the footer.
4. The composer shows the body with the footer.

**Blank reply**

1. The emails page loads the company profile and formats the footer.
2. The user starts a blank reply.
3. The composer opens with two empty lines above the footer, and the caret on the first line.

**What the draft looks like**

| Situation                              | Draft starts as                     | Counts as edited? |
| -------------------------------------- | ----------------------------------- | ----------------- |
| Generated, profile filled              | body, blank line, footer            | No                |
| Generated, profile empty               | body only, as today                 | No                |
| Blank reply, profile filled            | two empty lines, footer             | No                |
| Blank reply, profile empty             | empty, as today                     | No                |
| Body and footer over 20,000 characters | "The reply draft was invalid" error | n/a               |

End of a generated draft with a full profile:

```
Kind regards,

Northlight Studio
+30 210 1234567 · hello@northlight.example
12 Ermou Street, Athens 10563
```

Footer with only name and email. The phone, the separator and the address line are left out:

```
Northlight Studio
hello@northlight.example
```

**Rules**

- The footer is part of the draft. The user can edit or delete it before sending.
- Staleness rules don't change. The footer never makes a draft stale or edited.
- Changing the company profile doesn't touch an open draft. The next draft uses the new footer.
- Sending doesn't change. A draft holding only the footer can be sent, behind the existing send confirmation.

### Technical Choices

- **Append in code, not in the prompt.** The model never sees the company details, the prompt stays identical, and the reply evals stay valid.
- **Append on the server for generated replies.** `generateBriefReplyUseCase` already owns the draft body. It loads the profile with `companyProfileRepository.get()` after generation and checks the combined length against `BRIEF_REPLY_MAX_BODY_LENGTH`, throwing `BriefReplyInvalidOutputError` with the run metadata. The field limits keep the footer under about 1,000 characters, so the check only matters for a generation already near the limit.
- **Load the footer in the page for blank replies.** The blank reply starts synchronously inside `flushSync` so the editor can be scrolled to and focused, so a server action round trip won't work. The page passes `replyFooter: string | null` down to `EmailDetailProvider`.
- **Keep the footer unedited through `generated`.** The reducer stores the starting text as both `draft` and `generated`. The `startBlank` action carries the initial draft for that, so the existing edited check needs no change.
- **Revalidate the emails page on save.** `saveCompanyProfileAction` also revalidates `routes.emails`, so the next visit picks up the new footer.
- **Room for later work.** A per-user signature fits between the body and the footer by extending `appendReplyFooter`'s input. The sender display name (action plan, section H) reads `name` from the same profile.

## Implementation Slices

### 1. Trim the company profile to footer fields

The company profile stores and edits only the footer fields, and `legal_name` becomes `name`.

1. Update `packages/db/src/schema/company-profile.ts`: rename the `legalName` property and column to `name`, and remove the four invoice columns.
2. Stop and ask the user to run `pnpm db:generate` and answer the prompt for `name` with "renamed from `legal_name`". Rename the migration file to match the existing naming (e.g. `0006_trim-company-profile.sql`) together with its journal entry.
3. Run `pnpm db:check` and review the SQL against Data & Contracts. Don't apply it.
4. Update the input schema, field limits, DTO, repository selection and empty DTO, and the form. Label the name field "Company name". Remove the invoice fields and their validation and test cases.
5. Translate the rest of the page's copy to English: form legends, labels, the save button, the save action's announcement and failure messages, and `validation-messages.ts`. Match the wording of the email settings page, such as "Unable to save … Please try again." Remove the "Bank details" legend along with its fields.
6. Run `pnpm typecheck`, `pnpm lint` and `pnpm test`.

### 2. Append the footer to generated replies

Generated drafts end with the company footer.

1. Add `reply-footer.ts` with `formatReplyFooter` and `appendReplyFooter`, plus a colocated test.
2. In `generateBriefReplyUseCase`, load the profile after generation, append the footer, and enforce the combined length limit.
3. Extend the use-case test: footer appended, empty profile leaves the body unchanged, combined text over the limit throws `BriefReplyInvalidOutputError`.

### 3. Start blank replies with the footer

Blank replies open with the footer below an empty area for the user to type into.

1. Load and format the footer in `app/(app)/emails/page.tsx` and pass `replyFooter` through `EmailsInbox`, `EmailDetail` and `EmailDetailContent` to `EmailDetailProvider`.
2. Make the `startBlank` action carry the initial draft, and set `draft` and `generated` to it in the reducer. Update the reducer test for the blank case.
3. Place the caret at the start of the editor after starting a blank reply.
4. Revalidate `routes.emails` in `saveCompanyProfileAction`.

## Validation

- `formatReplyFooter` handles a full profile, a partial profile (for example, only name and email) and an empty one, and never leaves stray separators or blank lines.
- A generated draft ends with the footer, and an untouched draft does not count as edited.
- With an empty company profile, generated and blank replies match today's behavior.
- A blank reply starts with the footer and does not count as edited until the user types.
- The migration renames `legal_name` and drops the four invoice columns, and nothing else. `pnpm db:check` passes.
- Manual check after the user applies the migration: save a profile, generate a reply, start a blank reply, and send one to a test mailbox.
