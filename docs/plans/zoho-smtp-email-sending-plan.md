# Add Zoho SMTP email sending

## Status

Completed. All five slices are implemented. The inbox API uses the
`MailboxReader` vocabulary, parsed messages expose validated thread metadata,
and callers can submit new messages and threaded replies through the
provider-neutral `EmailSender`. Outbound validation runs before the lazy Zoho
SMTP transport is created, and each valid `send()` or `reply()` call makes one
submission attempt. Settings persists a trimmed SMTP host without exposing
credentials or replacing saved ciphertext during host-only updates.

Slice 5 verification (2026-09-24):

- `pnpm test`: all tests pass. `@inbox-triage/email` ran 110 tests,
  `@inbox-triage/auth` ran 5, and `@inbox-triage/dashboard` ran 337. The rerun
  followed a fix to the brief review use case and its test, which still used
  the old `createEmailClient` name and `client` callback parameter.
- `pnpm db:check` passes, and `pnpm db:generate` reports no schema changes.
- `pnpm format:check`, `pnpm lint`, and `pnpm typecheck` pass. No production
  build was run.
- Nodemailer `^10.0.10` is a direct runtime dependency of `@inbox-triage/email`
  only. The lockfile change adds only `nodemailer@10.0.10`, and React resolves
  to the single version 19.2.8.
- The package entry point is `server-only` and exports only package-owned
  names. Nodemailer, ImapFlow, and PostalMime imports stay in internal adapter
  and parser files. Sender errors use fixed messages and do not retain provider
  errors. The Settings DTO contains only `username`, `imapHost`, and
  `smtpHost`. The dashboard has no send action, route, or component. Old
  `EmailClient` names appear only in historical planning and brainstorming
  documents.

The generated migration is `packages/db/migrations/0004_add-email-smtp-host.sql`.
It adds the non-null `smtp_host` column with the `smtp.zoho.com` default and
the trimmed and non-empty checks. It was reviewed and remains unapplied. An
operator must still run `pnpm db:migrate` against each target database. A manual
send and reply against a real Zoho account has not been done, because this plan
adds no live Zoho test.

## Goal

Extend `@inbox-triage/email` with a Zoho SMTP sender that can submit new messages
and standards-compliant replies. Keep reading and sending as separate public
capabilities, and add only the persistence and Settings fields needed to
configure SMTP. This plan does not add a dashboard workflow that sends mail.

## Context

The completed email integration foundation gives each authenticated user one
Zoho connection containing a username, encrypted password, and configurable
IMAP host. `@inbox-triage/email` currently exposes a read-only `EmailClient`,
implemented with ImapFlow, for short-lived inbox reads. The dashboard owns the
connection row, encryption, authorization, and Settings UI; the package owns
provider communication, lifecycle, normalized email types, and safe errors.

The broad `EmailClient` name no longer describes a useful boundary once SMTP is
added. IMAP and SMTP have independent transports, configuration, lifecycle, and
failure modes. The existing reader will therefore become `MailboxReader`, while
SMTP uses a separate `EmailSender`. Both remain server-only and provider-neutral
at their public boundary even though Zoho is the only implemented provider.

The earlier email integration brainstorming document remains background. This
plan and the completed foundation plan define the implementation contract where
that document differs from the current code or the decisions below.

## Technical Design

### Data & Contracts

Add `smtp_host` to `email_connections` as a non-null text column with the
default `smtp.zoho.com`. Existing rows receive that default through a
forward-only migration. Apply the same database rules as `imap_host`: the value
is trimmed, non-empty, and otherwise unrestricted. Keep SMTP port 465 and
implicit TLS in the Zoho adapter rather than storing them. Do not add separate
SMTP credentials, authentication methods, status fields, or verification
timestamps.

The connection's existing normalized username and encrypted password serve both
IMAP and SMTP. The dashboard continues to own encryption and must never expose
the password through DTOs, actions, rendered pages, or logs. Extend the Settings
DTO, validation, repository upsert, unchanged-save detection, and form with an
SMTP host field. Saving remains a persistence operation and does not contact
Zoho. Update password help text so it no longer implies that the credential is
used only for IMAP.

Extend the normalized incoming message contract with parsed thread metadata:

```ts
export interface EmailMessage extends EmailSummary {
  messageId: string | null;
  inReplyTo: string[];
  references: string[];
  to: EmailAddress[];
  cc: EmailAddress[];
  replyTo: EmailAddress[];
  sentAt: Date | null;
  text: string | null;
  html: string | null;
}
```

Only valid RFC message identifiers enter `messageId`, `inReplyTo`, and
`references`. Invalid or absent values normalize to `null` or an empty array as
appropriate. Keep raw header strings and PostalMime types private.

Outbound messages have no attachment support. New-message input supports `to`,
`cc`, `bcc`, optional subject, text, HTML, and an optional `Reply-To`. The SMTP
`From` address is always the connected username, without a caller-supplied
alias or display name. Reply drafts support `cc`, `bcc`, text, and HTML; the
package derives the primary recipients, subject, and thread headers.

Validate outbound input before opening an SMTP connection:

- require at least one recipient across `to`, `cc`, and `bcc`;
- allow at most 50 total recipients;
- reject malformed addresses, header injection, and duplicate recipients across
  the three destination fields instead of silently rewriting them;
- preserve the spelling and case of accepted addresses;
- require at least one non-empty `text` or `html` body without trimming or
  rewriting message content;
- limit the combined UTF-8 byte length of `text` and `html` to 1 MiB;
- allow an absent or empty subject.

### Interfaces

Replace the existing reader names across the package and its dashboard
consumers:

```ts
export interface MailboxReader {
  listInbox(options?: ListInboxOptions): Promise<EmailPage>;
  listInboxNewerThan(ref: MessageRef): Promise<EmailSummary[]>;
  getMessage(ref: MessageRef): Promise<EmailMessage>;
  close(): Promise<void>;
}

export interface MailboxReaderConfig {
  provider: 'zoho';
  imapHost: string;
  credentials: EmailCredentials;
}

export function createMailboxReader(config: MailboxReaderConfig): MailboxReader;
```

Rename `EmailClientError` and its code type to `MailboxReaderError` and
`MailboxReaderErrorCode`. Preserve the existing reader codes and safe messages.
This is a coordinated monorepo rename rather than a deprecated alias because the
package is private and all current consumers are in this repository.

Add the sender contract:

```ts
export interface EmailCredentials {
  username: string;
  password: string;
}

export interface EmailSenderConfig {
  provider: 'zoho';
  smtpHost: string;
  credentials: EmailCredentials;
}

export interface SendEmailInput {
  to?: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject?: string;
  text?: string;
  html?: string;
  replyTo?: EmailAddress[];
}

export interface ReplyEmailInput {
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  text?: string;
  html?: string;
}

export interface SendEmailResult {
  messageId: string;
  acceptedRecipients: string[];
  rejectedRecipients: string[];
}

export interface EmailSender {
  send(input: SendEmailInput): Promise<SendEmailResult>;
  reply(parent: EmailMessage, input: ReplyEmailInput): Promise<SendEmailResult>;
  close(): Promise<void>;
}

export function createEmailSender(config: EmailSenderConfig): EmailSender;
```

`send()` resolves only after Zoho confirms final SMTP acceptance. A resolved
result always contains at least one accepted recipient. Rejected recipients may
be present in the same result when Zoho partially accepts the envelope. The
result exposes package-owned strings only, not Nodemailer response objects or
provider response text.

Add a distinct `EmailSenderError` and `EmailSenderErrorCode`. Keep its public
codes small and capability-specific:

```ts
export type EmailSenderErrorCode =
  | 'AUTHENTICATION_FAILED'
  | 'CONNECTION_FAILED'
  | 'INVALID_MESSAGE'
  | 'REPLY_MESSAGE_ID_MISSING'
  | 'REPLY_RECIPIENT_MISSING'
  | 'SEND_FAILED';
```

`INVALID_MESSAGE` covers local address, recipient-count, duplicate-recipient,
body, and size validation failures. Translate recognized authentication and
connection failures to their specific codes and all other unconfirmed SMTP
attempts to `SEND_FAILED`. An error does not prove that Zoho failed to accept
the message because a connection can disappear after transmission but before
the final reply. The package never retries automatically.

Both capabilities keep terminal, idempotent `close()` behavior. Operations
after closing fail without reconnecting. They throw a plain `Error` rather than
a capability error because use after close is a caller defect, not a provider
outcome; a closed sender has made no submission attempt.

### Structure

Keep protocol and library details behind narrow internal transports. The exact
file split may follow what reads most clearly, but the package should retain
this shape:

```text
packages/email/src/
  mailbox-reader.types.ts
  mailbox-reader-error.ts
  email-sender.types.ts
  email-sender-error.ts
  create-mailbox-reader.ts
  create-email-sender.ts
  imap/
    imap-mailbox-reader.ts
    ...
  smtp/
    smtp-email-sender.ts
    smtp-transport.types.ts
    nodemailer-smtp-transport.ts
    translate-smtp-error.ts
  mime/
    parse-email-message.ts
  zoho/
    create-zoho-mailbox-reader.ts
    create-zoho-email-sender.ts
```

`packages/email/src/index.ts` remains the only public entry point. Do not export
internal transport types, ImapFlow types, Nodemailer types, provider errors, or
MIME-library types.

### Behaviors & Flows

For a new message, `EmailSender.send()` validates and normalizes the
package-owned input, fixes both the visible sender and SMTP envelope sender to
the connected username, and submits it once. When both text and HTML are
present, Nodemailer creates the appropriate alternative MIME parts. The sender
does not queue, schedule, retry, persist, or claim recipient delivery.

For a reply, `EmailSender.reply()`:

1. requires a valid parent `messageId`; otherwise it throws
   `REPLY_MESSAGE_ID_MISSING` without contacting Zoho;
2. uses every parent `replyTo` address when present, otherwise every parent
   `from` address, and throws `REPLY_RECIPIENT_MISSING` if neither exists;
3. preserves an absent subject, preserves an existing leading `Re:` prefix
   case-insensitively, and otherwise prefixes the parent subject with `Re: `;
4. sets `In-Reply-To` to the parent's `Message-ID`;
5. builds `References` from the parent's references followed by its message ID;
   when references are absent but the parent has one `In-Reply-To` identifier,
   it uses that identifier followed by the parent message ID; otherwise it uses
   the parent message ID alone;
6. validates the derived message and submits it through the same one-attempt
   path as a new message.

This plan adds ordinary Reply behavior only. It does not copy the parent's `To`
or `Cc`, and it does not add Reply All. It also does not add an unthreaded
fallback when the parent lacks a usable message ID.

Zoho's SMTP service normally stores submitted messages in the account's Sent
folder according to the account's own SMTP setting. Do not append another copy
through IMAP. The package does not inspect or manage that provider setting.

### Technical Choices

Add Nodemailer as a direct runtime dependency of `@inbox-triage/email`. Use its
standard SMTP transport with the stored host, fixed port 465, implicit TLS,
authentication, normal certificate verification, and logging disabled. Keep
connection pooling disabled because expected volume is low and the package must
not introduce an internal queue or reconnection policy. Configure finite
connection, greeting, and socket timeouts appropriate for a server request;
transport-specific timeout values remain private implementation constants.

Model SMTP through a private `SmtpTransport`, as the IMAP implementation models
ImapFlow behind `ImapTransport`. Unit tests use a fake transport. Nodemailer
owns MIME construction and outgoing message-ID generation, while the package
owns validation, reply behavior, lifecycle, safe error translation, and result
normalization.

Do not add a live Zoho test, background worker, queue, delivery-status tracking,
bounce correlation, DSN support, read receipt, attachment handling, OAuth,
generic SMTP configuration, or another provider. Do not add a dashboard action,
route, or component that sends email.

## Implementation Slices

### Slice 1: Establish explicit mailbox-reader and thread contracts

This slice gives inbox reading an explicit name and supplies the normalized
thread metadata that replies need. It must not change inbox behavior.

1. Rename the public reader contract, config, factory, and error types to the
   `MailboxReader` vocabulary. Carry the rename through the IMAP implementation,
   Zoho factory, package tests, dashboard imports, and `readMailbox` callback.
   The package entry point must expose only the new reader names.
2. Extend `EmailMessage` with `inReplyTo` and `references`. Update MIME parsing
   so only valid RFC message identifiers reach those fields or `messageId`, with
   absent or invalid values producing `null` or empty arrays as defined above.
3. Add parser cases for valid, multiple, absent, and malformed thread headers.
   Keep PostalMime values private, and leave the dashboard DTO unchanged unless
   the compiler requires a mapping change.
4. Run the email package and affected dashboard tests. Search source and tests
   for the old public `EmailClient` symbols and resolve every remaining use.

The slice is complete when all existing mailbox operations pass through
`MailboxReader`, their behavior tests still pass, normalized thread fields cover
the parser cases above, and the old reader API is no longer exported or used.

### Slice 2: Add one-attempt Zoho SMTP sending

This slice adds new-message sending behind a provider-neutral package API. One
`send()` call performs at most one SMTP submission.

1. Add the public sender contracts, shared credentials type, capability-specific
   errors, and `createEmailSender()` factory. Export only package-owned types and
   values from the package entry point.
2. Implement outbound validation before transport creation or connection. Cover
   recipient presence and count, address syntax, header injection, duplicates,
   body presence, and the combined UTF-8 body limit without rewriting accepted
   addresses or message content.
3. Define the private `SmtpTransport` boundary and implement `EmailSender`
   against it. Force the visible and envelope sender to the connected username,
   submit once, normalize partial acceptance into package-owned strings, and
   make `close()` terminal and idempotent.
4. Add the Nodemailer adapter with the stored host, port 465, implicit TLS,
   authentication, certificate verification, disabled logging and pooling, and
   finite private timeouts. Translate recognized authentication and connection
   failures while keeping Nodemailer responses and provider text private.
5. Test the sender with a fake transport and test the adapter configuration at
   its boundary. Prove that invalid input makes no transport call, valid text,
   HTML, and alternative-body messages make one call, partial acceptance
   resolves, total rejection fails safely, and operations after close do not
   reconnect.

The slice is complete when callers can create a Zoho sender and submit every
supported new-message shape through one attempt, while validation, transport
details, provider errors, and cleanup obey the public boundary above.

### Slice 3: Add standards-compliant replies

This slice adds ordinary replies without creating a second submission path.

1. Derive the reply recipient, subject, `In-Reply-To`, and `References` from the
   parent according to the rules above. Preserve all parent `Reply-To` or `From`
   recipients in order, and append caller-supplied `cc` and `bcc` only in their
   destination fields.
2. Reject a missing parent message ID or missing derived recipient with the
   dedicated reply error before transport use. Feed every valid derived draft
   through the same address, duplicate, recipient-count, body, size, sender,
   submission, and result-normalization path as `send()`.
3. Test `Reply-To` precedence, `From` fallback, absent and existing `Re:`
   subjects, each `References` branch, extra recipients, partial acceptance, and
   terminal close behavior. Assert zero transport calls for every invalid parent
   and derived-message validation failure.

The slice is complete when `reply()` produces the specified envelope and thread
headers for every parent-metadata branch, and all failures before submission are
observable as package errors without an SMTP call.

### Slice 4: Persist and edit the SMTP host

This slice stores the SMTP endpoint and makes it editable beside the existing
IMAP host. Saving remains local persistence and never contacts Zoho.

1. Add non-null `smtpHost` storage with the default and database checks defined
   above. Generate the forward migration, then review its SQL and metadata for
   the existing-row backfill, default, constraints, and lack of unrelated schema
   changes. Leave migration application to the operator.
2. Thread `smtpHost` through the user-scoped repository, Settings DTO, shared
   validation, save action, and save use case. Normalize it once, include it in
   unchanged-save detection, and preserve the existing ciphertext during a
   host-only update.
3. Add the SMTP host field to the Settings form and its initial, dirty, error,
   successful-save, and disconnect-reset states. Update password and connection
   copy to cover incoming and outgoing mail without adding a verification
   control or sending workflow.
4. Extend focused validation, use-case, action, and repository tests for create,
   normalized no-op, SMTP-host-only update, password replacement, and rejected
   empty hosts. Confirm page data and action results still omit ciphertext and
   plaintext passwords.

The slice is complete when a user can save and reload a trimmed SMTP host,
host-only changes retain the encrypted password, unchanged values skip the
write, and the reviewed migration is ready but unapplied.

### Slice 5: Verify the integrated change

This slice checks the feature as one change and records completion only after
every earlier slice meets its bound.

1. Run the focused email-package and dashboard tests while implementing each
   slice, then run the full monorepo test suite after integration. Every sender,
   parser, persistence, and renamed-reader case in Validation must pass.
2. Run `pnpm db:check` and review the generated SQL once more against the schema
   contract. Record the migration path and leave it unapplied.
3. Run the root formatting check, lint, and typecheck. Resolve every failure
   caused by this change; do not run a production build.
4. Inspect the workspace manifests and lockfile. Nodemailer must be a direct
   runtime dependency only of `@inbox-triage/email`, with no duplicate or
   mismatched React versions or unrelated dependency changes.
5. Recheck the public email exports, server-only boundaries, safe error text,
   and absence of a send action or UI. Search for stale `EmailClient` names and
   for accidental exposure of credentials, Nodemailer types, or provider
   responses.
6. When every check passes, move this plan's single `PROGRESS.md` entry from
   Planned to Completed. Update Status with the commands and results, the
   generated migration path, and any remaining manual operator work.

The slice is complete when the full verification set passes, the dependency and
public-boundary reviews find no leaks, `PROGRESS.md` reflects the finished
feature, and the plan records that the migration still requires manual
application.

## Validation

Demonstrate that:

- existing inbox reads behave as before through the renamed reader API;
- incoming thread headers normalize without exposing raw PostalMime data;
- valid text-only, HTML-only, and multipart-alternative messages map to one SMTP
  attempt with the connected username as sender;
- invalid bodies, addresses, duplicates, oversized bodies, and recipient counts
  fail before transport use;
- partial acceptance returns clear accepted and rejected recipient arrays, while
  total rejection and transport failures produce safe sender errors;
- replies select `Reply-To` before `From`, add one `Re:` prefix when needed, and
  construct RFC thread headers correctly;
- replies without a valid parent message ID or recipient do not send;
- closing either capability is terminal and idempotent;
- Settings persists and reloads a trimmed SMTP host, preserves the existing
  password when left blank, and does not expose or verify credentials;
- the migration adds the non-null defaulted column and matching constraints
  without altering existing connection ownership or credentials.
