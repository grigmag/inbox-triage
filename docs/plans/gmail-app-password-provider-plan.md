# Add Gmail as an email provider using app passwords

## Status

Completed. All four slices are implemented. `pnpm typecheck`, `pnpm lint`, `pnpm test` (810 tests), and `pnpm db:check` passed. Live Gmail and Zoho account checks passed, as confirmed by the user. Migration 0005 is generated but has not been applied by the agent.

## Goal

Let a user connect a Gmail mailbox, either personal `@gmail.com` or Google Workspace on a custom domain, as an alternative to Zoho. The connection authenticates with a Google app password over IMAP and SMTP. Everything built on the mailbox (inbox, brief review, generated replies) works unchanged. Replies quote the parent in the connected provider's native format.

Each user still has exactly one email connection: Zoho or Gmail. Switching provider replaces the connection and requires a new password.

When the provider rejects the saved password, for example after a Google password change revoked the app password, the inbox says so and names the provider, instead of showing the generic load failure.

A later slice checks the credentials against the provider before saving, for both providers.

## Context

- `@inbox-triage/email` exposes `createMailboxReader()` and `createEmailSender()`, which branch on `config.provider`. Only `'zoho'` exists. The Zoho factories in `packages/email/src/zoho/` wire the shared `ImapMailboxReader`/`ImapFlowTransport` and `SmtpEmailSender`/`NodemailerSmtpTransport` with the configured hosts, ports 993 and 465, and a password.
- `SmtpEmailSender` takes a `QuoteReply` function. Zoho passes `quoteZohoEmailReply()`, which reproduces Zoho Mail's reply markup and uses the studio time zone for the quoted date.
- Gmail supports the same IMAP and SMTP protocols. An app password logs in exactly like a Zoho password, so `EmailCredentials` (`{ username, password }`) and the transports need no auth changes. The Gmail hosts are fixed: `imap.gmail.com:993` and `smtp.gmail.com:465`. Gmail saves SMTP-sent messages to Sent itself, and the app doesn't append a copy.
- `split-quoted-email-text.ts` already recognizes Gmail's "On … wrote:" attribution lines (English and Greek), so inbound Gmail threads need no changes.
- `email_connections` has one row per user (`email_connections_user_id_unique`). `provider` is checked to equal `'zoho'`. `imap_host` and `smtp_host` are `NOT NULL` with Zoho defaults. `encrypted_password` holds the password encrypted with `cryptoService`.
- `'zoho'` is hard-coded as a literal type in the settings repository, use case, action, `load-email-connection.ts`, and indirectly in `read-mailbox.ts` and `send-email-reply.ts`. The Zoho-specific UI copy is in the settings form, the validation messages, and the inbox empty state (`emails-inbox.tsx`).
- `saveEmailConnectionUseCase()` reuses the stored encrypted password when the password field is empty. Once there's more than one provider, a provider switch without a new password would silently reuse the old provider's password. The fix is part of this plan.
- There is no credential check on save today. A wrong password first shows up as a mailbox or send failure.
- The four inbox load actions (`load-inbox`, `load-newer-inbox`, `load-older-inbox`, `load-email-message`) catch every error and return the same generic "check Email settings" message. `readMailbox()` logs the `MailboxReaderError` code but doesn't surface it. Reply sending already names rejected credentials (`send-brief-reply.use-case.ts`).
- The user-facing setup guide `docs/user-guides/connect-gmail.md` already exists. It describes the planned settings flow (Settings > Email, provider **Gmail**, fields **Email** and **App password**, spaces allowed) and the admin settings. Keep the UI labels consistent with it, and update the guide if shipped behavior differs.
- No new environment variables are needed.

## Technical Design

### Data & Contracts

**`email_connections` (migration 0005):**

- `provider`: `$type<'zoho' | 'gmail'>()`, with the check widened to `provider IN ('zoho', 'gmail')`.
- `imap_host`, `smtp_host`: nullable, with the Zoho defaults dropped. The Zoho form already supplies the default hosts as initial values.
- New check `email_connections_provider_hosts`: Zoho rows have both hosts, Gmail rows have neither:

  ```sql
  (provider = 'zoho' AND imap_host IS NOT NULL AND smtp_host IS NOT NULL)
  OR (provider = 'gmail' AND imap_host IS NULL AND smtp_host IS NULL)
  ```

- The trimmed and non-empty host checks stay. They pass for `NULL`.
- `encrypted_password` stores the Gmail app password with the same encryption. Existing rows are all Zoho with hosts set, so they satisfy the new checks without a backfill.

Storing Gmail's fixed hosts in the row would duplicate constants owned by the email package and could go stale, which is why Gmail rows keep the host columns `NULL`.

**Settings input (`email-connection-input.schema.ts`):** a discriminated union on `provider`:

- `zoho`: `email`, `imapHost`, `smtpHost`, `password`, unchanged from today.
- `gmail`: `email`, `password`. The Gmail password has all whitespace removed. After that it must be empty (allowed only for an unchanged saved connection, as today) or exactly 16 characters. Only the length is checked, not the character set: Google documents app passwords as 16 characters but doesn't document which characters they use.
- Validation messages are provider-specific ("Enter your Zoho Mail password." / "Enter your Gmail app password." / "A Gmail app password has 16 characters.").

**Settings DTO:**

```ts
export type EmailConnectionSettingsDto =
  | { provider: 'zoho'; username: string; imapHost: string; smtpHost: string }
  | { provider: 'gmail'; username: string };
```

### Interfaces

**`@inbox-triage/email` configuration.** Each config is a union on `provider`, so Gmail callers can't pass hosts:

```ts
export type EmailProvider = 'zoho' | 'gmail';

export type MailboxReaderConfig =
  | { provider: 'zoho'; imapHost: string; credentials: EmailCredentials }
  | { provider: 'gmail'; credentials: EmailCredentials };

export type EmailSenderConfig =
  | {
      provider: 'zoho';
      smtpHost: string;
      credentials: EmailCredentials;
      /** The mailbox's IANA time zone, such as `Europe/Athens`, for quoted dates. */
      timezone: string;
    }
  | { provider: 'gmail'; credentials: EmailCredentials; timezone: string };
```

`EmailProvider` is exported from the package index. `EmailCredentials`, `MailboxReader`, `EmailSender`, and the error types don't change.

**Dashboard connection loader.** `loadEmailConnection()` returns a union that mirrors the row:

```ts
type EmailConnectionConfig =
  | {
      provider: 'zoho';
      imapHost: string;
      smtpHost: string;
      credentials: EmailCredentials;
    }
  | { provider: 'gmail'; credentials: EmailCredentials };
```

`readMailbox()` and `sendEmailReply()` narrow on `provider` to build the package config.

**Rejected mailbox credentials.** `readMailbox()` rethrows a `MailboxReaderError` with code `AUTHENTICATION_FAILED` as a dashboard error that carries the provider. One helper turns any error into the inbox failure message:

```ts
export class MailboxCredentialsRejectedError extends Error {
  constructor(readonly provider: EmailProvider) {
    /* … */
  }
}

/** The provider-specific message for rejected credentials, otherwise `fallback`. */
export function mailboxFailureMessage(error: unknown, fallback: string): string;
```

The brief review and reply use cases already wrap every mailbox error in their own error types, so they're unaffected.

**Connection check (slice 4).** A new package export checks both directions without exposing protocol types:

```ts
export type EmailConnectionCheckConfig =
  | {
      provider: 'zoho';
      imapHost: string;
      smtpHost: string;
      credentials: EmailCredentials;
    }
  | { provider: 'gmail'; credentials: EmailCredentials };

export type EmailConnectionCheck =
  | { status: 'verified' }
  | { status: 'failed'; reason: 'authentication' | 'connection' | 'unknown' };

export function checkEmailConnection(
  config: EmailConnectionCheckConfig,
): Promise<EmailConnectionCheck>;
```

The function logs in over IMAP and logs out, then verifies the SMTP login without sending anything. It resolves with a result instead of throwing for expected provider failures, and it never returns provider text or credentials.

### Structure

```text
packages/email/src/
├── create-mailbox-reader.ts        # + gmail branch
├── create-email-sender.ts          # + gmail branch
├── check-email-connection.ts       # slice 4
├── reply/                          # shared quote helpers extracted from the Zoho formatter
├── gmail/
│   ├── gmail-hosts.ts              # imap.gmail.com, smtp.gmail.com
│   ├── create-gmail-mailbox-reader.ts
│   ├── create-gmail-email-sender.ts
│   └── quote-gmail-email-reply.ts
└── zoho/                           # unchanged behavior

apps/dashboard/src/features/settings/email-integration/
├── validation/email-connection-input.schema.ts   # provider union
├── use-cases/save-email-connection.use-case.ts   # provider-aware
└── components/email-connection-form.tsx          # provider choice + Gmail fields
```

### Behaviors & Flows

**Settings > Email:**

1. The form shows a provider choice (Zoho or Gmail), preselected from the saved connection, with Zoho as the default for a new connection.
2. Zoho shows the current fields. Gmail shows **Email** and **App password**, with short help text: turn on 2-Step Verification, create the password at `myaccount.google.com/apppasswords`, and the normal Google password won't work. The full walkthrough is in the user guide.
3. When a connection exists and the chosen provider differs, saving asks for confirmation (with the existing `ConfirmActionDialog`) that the new connection replaces the current mailbox. A new password is required.
4. Save outcomes stay `saved | unchanged | password_required`:
   - `unchanged` requires the same provider, username, and (for Zoho) hosts, with an empty password.
   - `password_required` is returned when there's no saved connection, or the provider changes, and the password is empty.
   - The stored encrypted password is reused only for the same provider.

**Mailbox and replies:** the inbox, brief review, and replies work the same for Gmail. `createEmailSender()` picks the quote formatter by provider:

- **Zoho:** `quoteZohoEmailReply()`, as today.
- **Gmail:** `quoteGmailEmailReply()`, which matches what Gmail's web client produces when replying:
  - the text part is the reply text, then the attribution `On <date> <name> <<email>> wrote:`, then the parent's text with each line prefixed `> `;
  - the HTML part wraps the parent in `<div class="gmail_quote">` with a `gmail_attr` attribution and a `blockquote class="gmail_quote"` using Gmail's left-border style.
  - The date is English and uses the mailbox time zone.
  - Match a real Gmail reply sample when implementing, and keep the attribution line matching the pattern that `split-quoted-email-text.ts` already recognizes.

**Rejected credentials in the inbox:** when an inbox load fails because the provider rejected the saved password, the inbox shows a provider-specific failure message instead of the generic one:

- **Gmail:** "Gmail rejected the saved app password. If you changed your Google password, create a new app password and update it in Email settings."
- **Zoho:** "Zoho rejected the saved password. Update it in Email settings."

Other failures keep the generic message. Brief review and reply generation keep their current messages, and reply sending keeps its existing rejected-credentials message.

**Connection check (slice 4):** when the save would change credentials, hosts, or provider, the use case runs `checkEmailConnection()` before saving. If the password field is empty for the same provider, the check uses the decrypted stored password. A failed check saves nothing and returns a form error:

- `authentication`: "Gmail rejected the app password." or "Zoho rejected the password.", with a pointer to the help text.
- `connection`: "Couldn't reach the mail server."
- `unknown`: the generic failure message.

An `unchanged` save skips the check.

### Technical Choices

- **App passwords, not OAuth.** They work for personal and Workspace accounts, need no Google Cloud project or verification, and reuse the password flow and transports. Tradeoff: Google discourages app passwords, and a Workspace admin can block them indirectly (IMAP limited to OAuth clients, security-key-only 2-Step Verification). Google hasn't announced a removal date. OAuth can be added later as another credential type without changing the reader or sender.
- **Per-provider factories over a generic host configuration.** Gmail's hosts and quote format are provider facts, so they live in `packages/email/src/gmail/`, alongside `zoho/`.
- **Shared quote helpers.** The HTML body extraction, style-sheet and inline-image stripping, and escaping in `quote-zoho-email-reply.ts` move to a shared module both formatters use. Zoho's output must stay byte-for-byte identical.
- **Length-only password validation.** This catches a pasted normal password or a partial copy without betting on an undocumented character set.

## Implementation Slices

### 1. Gmail provider in the email package

Completed. Gmail reader and sender factories, native reply quoting, shared quote helpers, and automated coverage are implemented.

Adds Gmail as a package-level provider with native reply quoting. No dashboard changes are needed yet beyond what's required to keep type checking passing.

1. Turn `MailboxReaderConfig` and `EmailSenderConfig` into the provider unions above and export `EmailProvider`.
2. Add the Gmail host constants and the Gmail reader and sender factories, mirroring the Zoho ones, and branch on `'gmail'` in `createMailboxReader()` and `createEmailSender()`.
3. Extract the reusable HTML/text quote helpers from `quote-zoho-email-reply.ts` into a shared module. Keep the Zoho tests passing unchanged.
4. Implement `quoteGmailEmailReply()` in Gmail's native format and pass it from the Gmail sender factory.
5. Test the factory branches (Gmail hosts, ports, and credentials reach the transports) and the Gmail formatter: text and HTML output, a parent without a text or HTML part, and an attribution line that `split-quoted-email-text.ts` recognizes.

### 2. Store and use Gmail connections

Completed. Migration 0005, provider-aware persistence and validation, mailbox and reply routing, and rejected-credential messages are implemented with automated coverage.

Persists Gmail connections and routes mailbox reads and replies through them. Depends on slice 1.

1. Update the `email_connections` schema as described in Data & Contracts. Run `pnpm db:generate` and `pnpm db:check`, and review the generated SQL. It should only drop the host defaults and `NOT NULL`, replace the provider check, and add the provider-hosts check. Don't apply it.
2. Make the repository's save input a provider union. Gmail saves write `NULL` hosts.
3. Update the input schema to the provider union, with Gmail password normalization and the length rule.
4. Make `saveEmailConnectionUseCase()` provider-aware: include the provider in the `unchanged` comparison, require a password on a provider change, and reuse the stored password only for the same provider.
5. Pass the parsed provider through `saveEmailConnectionAction()`.
6. Return the connection union from `loadEmailConnection()`, and narrow it in `readMailbox()` and `sendEmailReply()`.
7. Build the provider-shaped DTO in the settings page.
8. Add `MailboxCredentialsRejectedError` and `mailboxFailureMessage()`, rethrow rejected credentials from `readMailbox()`, and use the helper in the catch blocks of the four inbox load actions.
9. Test the schema (Gmail whitespace removal, the 16-character rule, the empty password), the use case (the provider switch with and without a password, `unchanged` across providers, no password reuse across providers), the repository with `NULL` hosts, and the inbox actions returning each provider's rejected-credentials message while other errors keep the generic one.

### 3. Gmail in the settings UI

Completed. Provider selection, Gmail fields, replacement confirmation, provider-neutral inbox copy, and the Gmail setup guide are implemented.

Lets users choose and connect Gmail. Depends on slice 2.

1. Add the provider choice to `EmailConnectionForm`, using an existing `@inbox-triage/ui` component such as `Select` or `Tabs`. If a new shadcn component is needed, follow the shadcn workflow.
2. Render the Gmail fields and help text. Keep the Zoho fields and help as they are.
3. Track the saved provider in the form's change detection, and confirm before replacing a connection with a different provider.
4. Make the inbox empty-state copy in `emails-inbox.tsx` provider-neutral.
5. Check the labels and flow against `docs/user-guides/connect-gmail.md`, and update the guide where they differ.

### 4. Check credentials before saving

Completed. IMAP and SMTP credential checks, failure handling without saving, transport cleanup, automated coverage, and guide updates are implemented.

Rejects bad credentials at save time for both providers. Depends on slice 2 and can run in parallel with slice 3.

1. Add a verify operation to the SMTP transport interface and the Nodemailer implementation, which logs in without sending.
2. Implement and export `checkEmailConnection()`, reusing the IMAP transport's connect and logout and the existing error translators to map failures to `authentication | connection | unknown`.
3. Call it from `saveEmailConnectionUseCase()` for any save that isn't `unchanged`, using the decrypted stored password when the password field is empty. Add a failure outcome that the action maps to the provider-specific form errors above.
4. Test the check with mocked transports (each failure kind, and the IMAP connection closed after a failed SMTP check), and test the use case skipping the check for `unchanged` saves and saving nothing on failure.
5. Update the user guide's troubleshooting if the save-time messages change what users see.

## Validation

- A Gmail app password connects a personal Gmail account. The inbox loads, messages open, and a brief reply sends, threads in Gmail, and shows Gmail's quote with the quoted part collapsed.
- A Zoho connection behaves exactly as before, including byte-identical reply quoting.
- Switching Zoho to Gmail (or back) requires a new password and confirmation, and never reuses the other provider's password.
- The migration applies cleanly to a database with existing Zoho rows, and the checks reject a Gmail row with hosts and a Zoho row without them.
- With a revoked Gmail app password, the inbox shows the Gmail rejected-password message. A Zoho connection with a wrong password shows the Zoho message, and a network failure still shows the generic one.
- After slice 4, a wrong Gmail app password or Zoho password is rejected on save with a specific message, and nothing is saved.
