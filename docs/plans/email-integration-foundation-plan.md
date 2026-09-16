# Email Integration Foundation Plan

## Status

Slices 1 through 4 are implemented. Slice 1 adds connection persistence and
credential encryption. Slice 2 adds the server-only email package and Zoho IMAP
adapter. Slice 3 adds Settings. Slice 4 adds authenticated mailbox actions,
newer-than listing, the protected `/offer-emails` route and sidebar destination,
and the inbox reader.

The inbox uses a page-local hook and pure reducer. It loads summaries without
automatic selection, deduplicates newer and older batches, preserves selection
and pagination on failures, and ignores stale full-message responses, including
when the user selects the same message again. The desktop panels scroll
independently. The detail panel renders only parsed plain text.

Slice 4 verification passed migration consistency checking, formatting,
monorepo linting, typechecking, and all 273 tests, including eight new reducer
tests. No production build was run, following the repository instruction to run
builds only when explicitly requested. Authenticated browser review remains
outstanding because this session has no browser tooling. The generated Slice 1
migration remains unapplied.

Slice 5 implementation and automated verification are complete. It adds a
per-connection IMAP host, Settings input, and stored-host client configuration.
Authenticated browser review remains pending because this session has no browser
tooling. Its migration is generated but unapplied.

## Outcome

Each authenticated InboxTriage user can save credentials for one Zoho mailbox in
Settings. Server-side dashboard code can use those credentials through a new
`@inbox-triage/email` package to read inbox messages on demand.

This foundation is intended to support a later workflow in which the user
selects an email and asks AI to evaluate the offer it contains. The AI workflow
is not designed by this draft.

## Source contract

This plan records the project-specific decisions for the feature. The earlier
[email integration architecture](../brainstorming/email-integration-architecture.md)
remains useful background, but this plan takes precedence where the documents
conflict.

## Agreed decisions

- Mailbox connections belong to individual InboxTriage users, not to the studio as
  a whole.
- Each user can have at most one mailbox connection in the first version.
- Zoho Mail is the only supported provider in the first version.
- Each connection stores its own IMAP host. New and existing connections default
  to `imap.zoho.com`; port 993 and implicit TLS remain fixed.
- The user revised the original allowlist request to accept any trimmed,
  non-empty host string, preserving case. There is no hostname-format validation.
- The database still records the provider so adding another email provider does
  not require treating every existing row as implicitly Zoho.
- Zoho authentication uses an IMAP username and password. There is no
  authentication-method field yet.
- The username is stored as plaintext. Password encryption and HMAC use two
  independent application secrets from the environment.
- The first version does not support encryption-key rotation.
- A saved connection is treated as active. There is no status, provider account
  ID, or verification timestamp.
- InboxTriage reads emails from the provider on demand. It does not store email
  messages, maintain a synchronization cursor, poll in the background, or run
  an email ingestion job.
- The first inbox view reads the inbox folder only. It loads 20 messages at a
  time and offers a Load more action. It has no search, folder selection, or
  attachment support.
- The dashboard exposes the inbox at `/offer-emails`. Its main-sidebar label is
  `Offer emails`, but page copy and implementation names use `Emails` and
  ordinary email terminology.
- Mailbox summaries and the selected message live in browser memory for the
  current page visit. InboxTriage does not persist them between navigations.
- Refresh asks Zoho for every summary newer than the newest summary already in
  memory, then prepends the result without replacing older loaded messages or
  changing the current selection.
- The message reader displays only the parsed `text/plain` body. It does not
  render or convert HTML.
- The reusable email code lives in a new `@inbox-triage/email` workspace package.
- The email package uses ImapFlow for IMAP communication and PostalMime for MIME
  parsing.
- The dashboard owns user authorization, credential persistence and encryption,
  Settings behavior, and UI.
- The package owns provider communication and normalized email data. It does not
  depend on Clerk, Drizzle, the dashboard, or AI behavior.
- Slice 2 has a recommended package structure that keeps the public API,
  provider configuration, IMAP transport, and MIME parsing separate. The
  implementing agent may adjust individual files when the resulting code is
  clearer, while preserving those boundaries.

## Scope

### In scope

- an application-owned email connection for each local user;
- encrypted storage of the Zoho password;
- a server-only `@inbox-triage/email` package that connects to Zoho over IMAP;
- listing inbox messages on demand in pages of 20;
- fetching one message body and parsing it into package-owned types;
- a protected `/settings/email` page for saving, updating, and removing the
  current user's connection;
- an Email destination in the existing Settings navigation;
- a protected `/offer-emails` page for browsing and reading the connected
  inbox;
- safe package-level errors that do not expose IMAP library objects.

### Out of scope

- Gmail, Outlook, OAuth, or multiple authentication methods;
- multiple mailbox connections per user;
- sending email or changing mailbox state;
- connection status, health checks, last-verification timestamps, or testing the
  connection when credentials are saved;
- stored emails, synchronization state, cursors, background polling, queues, or
  workers;
- inbox search, folder selection, and attachments;
- inbox unread filtering, message-state changes, HTML rendering, and HTML to
  plain-text conversion;
- the AI prompt, evaluation result, evaluation persistence, and review UI;
- provider-specific database tables or a generic table shared by unrelated
  integrations;
- encryption-key rotation or a credential-management service.

## Data contract

### `email_connections`

Add one table in `packages/db`:

| Column               | PostgreSQL type          | Null | Notes                                 |
| -------------------- | ------------------------ | ---- | ------------------------------------- |
| `id`                 | `uuid`                   | No   | Primary key with a generated default  |
| `user_id`            | `uuid`                   | No   | Foreign key to `users.id`             |
| `provider`           | `text`                   | No   | `zoho` in the first version           |
| `username`           | `text`                   | No   | Trimmed Zoho IMAP username            |
| `imap_host`          | `text`                   | No   | Trimmed host, default `imap.zoho.com` |
| `encrypted_password` | `text`                   | No   | Encrypted Zoho password               |
| `created_at`         | timestamp with time zone | No   | Shared lifecycle timestamp            |
| `updated_at`         | timestamp with time zone | No   | Shared lifecycle timestamp            |

The table has these constraints:

- `user_id` references `users.id` with `ON DELETE CASCADE`;
- `user_id` is unique, which enforces one connection per user;
- `provider` accepts only `zoho` until another provider is implemented;
- `username` is trimmed and non-empty;
- `imap_host` is trimmed and non-empty;
- `encrypted_password` is non-empty.

Export the table as `emailConnections` and its selected-row type as
`EmailConnection`, following the existing database package naming.

Do not add a separate credentials table or provider-specific child table in this
version. A future provider can use this table if its stored data fits. Otherwise,
the migration that introduces that provider can add the schema it needs.

## Credential encryption

The dashboard reads two required server-only environment variables:

```text
APP_ENCRYPTION_KEY
APP_HASHING_KEY
```

Both keys are independent random 32-byte values encoded as 64 hex characters.
The existing `CryptoService` uses AES-256-CBC with a random 16-byte IV and
HMAC-SHA256 over the hex ciphertext. It stores `iv:ciphertext:signature`, with all
parts hex encoded. The user chose to retain this implementation, including its
ciphertext-only HMAC. There is no key rotation. Do not trim or otherwise normalize
the password before encryption.

Both keys must have placeholders in `apps/dashboard/.env.example` and
the CI Build environment. Never return the encrypted or decrypted password in a
DTO, action result, log, or rendered page.

Encryption and decryption belong to server-only dashboard code because they
protect application persistence. The email package receives the decrypted
username and password when the dashboard creates a client.

## Responsibility split

### `@inbox-triage/email`

The new package owns:

- the provider-neutral client contract;
- the Zoho IMAP implementation;
- IMAP connection lifecycle;
- inbox listing and single-message retrieval;
- MIME parsing and normalized message types;
- translation of expected transport failures into package-owned errors.

It must not import from `@inbox-triage/db`, `@inbox-triage/auth`, or the dashboard. It
must not read environment variables or encrypt credentials. The caller passes
validated configuration to it.

### Slice 2 library decisions

Use these direct package dependencies for the initial implementation:

```text
imapflow: ^1.7.8
postal-mime: ^3.0.0
server-only: ^0.0.1
```

Use ImapFlow's promise-based API for connection lifecycle, mailbox locking,
UID-based fetches, inbox iteration, and bounded message downloads. Disable its
logger so credentials, server responses, and message data do not reach the
default logger. Disable automatic IDLE because InboxTriage opens short-lived
connections for on-demand reads and does not listen for mailbox changes.

Stay on ImapFlow 1.x for this slice. Version 2.0 was released while this slice
was being planned and has not been evaluated against InboxTriage. Review its
migration notes and behavior in a separate dependency update before accepting
that major version.

Use PostalMime to parse complete RFC 822 messages, then map its results into
package-owned types. PostalMime types must not appear in public exports. Limit
each complete message source to 10 MiB. Check the size reported by IMAP before
download and enforce the same byte limit while reading. Do not pass a truncated
message to PostalMime.

Continue using the repository's current TypeScript and Vitest versions. Test
the IMAP adapter through an internal fake transport and parse checked-in email
fixtures. Slice 2 does not add a live IMAP test server or another test library.

Do not add MailParser. Its streaming parser remains a fallback if a later
requirement says InboxTriage must extract a small body from a message whose total
size exceeds the chosen limit.

### Slice 2 public contract

The package exports this initial provider-neutral API:

```ts
export interface EmailClient {
  listInbox(options?: ListInboxOptions): Promise<EmailPage>;
  listInboxNewerThan(ref: MessageRef): Promise<EmailSummary[]>;
  getMessage(ref: MessageRef): Promise<EmailMessage>;
  close(): Promise<void>;
}

export interface ListInboxOptions {
  /**
   * Continuation token returned by listInbox(). Pass it unchanged to the next
   * listInbox() call. Do not construct or depend on its internal format.
   */
  pageToken?: string;
  limit?: number;
}

export interface EmailPage {
  messages: EmailSummary[];
  nextPageToken: string | null;
}

export interface EmailSummary {
  ref: MessageRef;
  from: EmailAddress[];
  subject: string | null;
  receivedAt: Date;
  isRead: boolean;
  sizeBytes: number;
}

export interface EmailMessage extends EmailSummary {
  messageId: string | null;
  to: EmailAddress[];
  cc: EmailAddress[];
  replyTo: EmailAddress[];
  sentAt: Date | null;
  text: string | null;
  html: string | null;
}

export interface EmailAddress {
  name: string | null;
  address: string;
}

/**
 * A package-generated reference to one message in the connected mailbox.
 * Pass it back unchanged to getMessage(). Do not create or inspect this value.
 */
export type MessageRef = string;

export interface EmailClientConfig {
  provider: 'zoho';
  imapHost: string;
  credentials: {
    username: string;
    password: string;
  };
}

export function createEmailClient(config: EmailClientConfig): EmailClient;
```

`listInbox()` returns summary data only. It must not download the complete body,
HTML, full headers, or attachment contents. The default and maximum `limit` are 20. Results are ordered from newest to oldest. The result does not include a
total message count.

`listInboxNewerThan()` returns every inbox summary whose IMAP UID is greater
than the UID in the supplied message reference. Results are ordered from newest
to oldest. The operation takes one snapshot of the matching UIDs so mail that
arrives during the request belongs to the next refresh. It has no public page
size or continuation token. The transport may fetch a large result in internal
batches, but callers receive one complete array. It must not download message
bodies, HTML, full headers, or attachment contents.

The package parses and validates the message reference and keeps its UID details
private. Dashboard code must not inspect the reference to construct a provider
query.

`nextPageToken` is `null` when no older messages remain. Otherwise the dashboard
passes it back as `pageToken` for the Load more action. New mail arriving between
requests must not cause an older page to repeat or skip messages. The package
owns the token format and validates every token at runtime. The implementation
will likely use IMAP UIDs and UID validity internally. The implementing agent may
change the internal representation or IMAP query if ImapFlow requires it, as
long as the public behavior remains the same and no mailbox state is stored in
the database.

`MessageRef` connects an inbox summary to `getMessage()`. The package creates it
from identifiers returned by the connected IMAP mailbox, likely the mailbox UID,
UID validity, and mailbox name. It is not Zoho's web identifier or the email's
`Message-ID` header. The dashboard may pass it through a server boundary but
must not parse or construct it. The package validates every reference at runtime.
Slice 2 does not use TypeScript unique-symbol branding for references or page
tokens.

`getMessage()` checks the reported message size, downloads no more than the 10
MiB limit, parses the complete source with PostalMime, and returns normalized
package types. It uses a non-mutating IMAP fetch so reading through InboxTriage
does not mark the message as read. `html` is untrusted email HTML; callers must
sanitize it before rendering. Slice 4 does not render it or convert it to plain
text. Slice 2 does not return or process attachments for application use.
Because attachments are part of the complete RFC 822 source, their bytes can
still be downloaded and count toward the size limit.

`close()` is terminal and idempotent. It releases any held mailbox lock and logs
out or force-closes the IMAP connection. Calling it before connection, after an
operation failure, or more than once succeeds. Mailbox operations attempted
after `close()` fail as a programming error. A disconnect failure must not hide
an earlier mailbox-operation error after the package has force-closed the
underlying connection.

Expected provider failures become package-owned errors with safe messages. The
initial error codes are:

```ts
export type EmailClientErrorCode =
  | 'AUTHENTICATION_FAILED'
  | 'CONNECTION_FAILED'
  | 'INVALID_PAGE_TOKEN'
  | 'INVALID_MESSAGE_REF'
  | 'MESSAGE_NOT_FOUND'
  | 'MESSAGE_TOO_LARGE'
  | 'UNKNOWN';

export class EmailClientError extends Error {
  readonly code: EmailClientErrorCode;
}
```

The implementing agent may refine these codes after inspecting the concrete
ImapFlow failures, but must keep the categories useful to dashboard callers and
update this plan before changing the public exports. Error messages and fields
must not expose credentials, raw server responses, message content, or ImapFlow
objects. A stale page token maps to `INVALID_PAGE_TOKEN`; a missing or stale
message reference maps to `MESSAGE_NOT_FOUND` when its format is otherwise valid.

### Slice 2 package structure

Use this structure as the implementation baseline:

```text
packages/email/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── test-fixtures/
│   ├── html-and-text.eml
│   ├── plain-text.eml
│   └── missing-fields.eml
└── src/
    ├── index.ts
    ├── email-client.types.ts
    ├── email-message.types.ts
    ├── email-client-error.ts
    ├── create-email-client.ts
    ├── mime/
    │   ├── parse-email-message.ts
    │   └── parse-email-message.test.ts
    ├── imap/
    │   ├── imap-email-client.ts
    │   ├── imap-email-client.test.ts
    │   ├── imap-transport.types.ts
    │   ├── imapflow-transport.ts
    │   ├── normalize-email-summary.ts
    │   ├── normalize-email-summary.test.ts
    │   ├── message-ref.ts
    │   ├── message-ref.test.ts
    │   ├── page-token.ts
    │   ├── page-token.test.ts
    │   ├── translate-imap-error.ts
    │   └── translate-imap-error.test.ts
    └── zoho/
        └── create-zoho-email-client.ts
```

Use the `.types.ts` suffix for files that contain only types. Runtime modules
keep ordinary `.ts` names. Group related public types together rather than
creating one file for every interface.

`src/index.ts` is the only public package entry point. It imports `server-only`
and exports the approved client, message, configuration, and error contracts.
The package manifest exposes only `.` and does not expose the `imap`, `mime`, or
`zoho` directories as subpaths.

`create-email-client.ts` selects the implementation from `config.provider`.
`create-zoho-email-client.ts` receives the caller-supplied host and owns the
fixed port 993 and implicit TLS settings, then creates the IMAP client with the
credentials supplied by the caller. Do not
add a provider registry, abstract base class, or plugin mechanism for the single
supported provider.

`imap-email-client.ts` implements `EmailClient`. It coordinates connection,
inbox locking, listing, message retrieval, size enforcement, normalization,
error translation, and cleanup. `imapflow-transport.ts` is the only file that
imports ImapFlow. Its internal contract in `imap-transport.types.ts` includes
only the operations InboxTriage needs and must not reproduce the full ImapFlow
API. Tests inject a fake implementation of this contract. Keep the fake inside
the consuming test file unless more than one test needs it.

`parse-email-message.ts` is the only module that uses PostalMime types. It maps
parsed data into `EmailMessage` before returning. The message-reference,
page-token, summary-normalization, and error-translation modules are small pure
helpers with colocated tests. Checked-in `.eml` fixtures live outside `src` so
production code cannot import them accidentally.

The implementing agent may combine a small helper with its only caller, split a
file that gains more than one responsibility, or adjust fixture names. Any such
change must preserve the single public entry point, private provider and IMAP
code, isolated ImapFlow and PostalMime imports, and the fakeable transport
boundary.

### Dashboard

The dashboard owns:

- authentication through the existing `requireUser()` boundary;
- reads and writes scoped to the returned local `user.id`;
- validation for the Settings form;
- password encryption before persistence and decryption before client creation;
- the bound composition that creates and closes an email client;
- the Settings page and its actions;
- composition for any later feature that consumes the email package.

The expected composition is:

```ts
const connection = await emailConnectionRepository.getForUser(user.id);

const client = createEmailClient({
  provider: connection.provider,
  imapHost: connection.imapHost,
  credentials: {
    username: connection.username,
    password: decrypt(connection.encryptedPassword),
  },
});

try {
  return await client.listInbox({ limit: 20 });
} finally {
  await client.close();
}
```

Keep this code server-only. The decrypted password should exist only while a
mailbox operation is running.

## Settings contract

Add `/settings/email` and an Email item to the existing Settings navigation.
Place product code under:

```text
apps/dashboard/src/features/settings/email-integration/
```

Use only the feature-layer directories needed by the implementation. Do not fix
an internal folder tree in this draft.

When the current user has no connection, show username, IMAP host, and password
fields with a Save action. Prefill the host with `imap.zoho.com`.

When a connection exists:

- show an editable username and stored IMAP host;
- show an empty password field and explain that an empty value keeps the saved
  password;
- allow the user to save username, host, or password changes together or separately;
- provide a Disconnect action that deletes the connection after explicit
  confirmation.

Do not show connection status, a provider selector, a last-verified value, or a
manual verification action. Saving credentials does not connect to Zoho. The
first mailbox read reports invalid credentials or connection failure if needed.

Pages, actions, and data-access boundaries follow the existing server-side
authentication conventions. Repository operations must scope every read,
update, and delete to `user.id`; possession of a connection ID is not sufficient.

## Initial implementation outline

### Slice 1: Connection persistence

1. Add and export `email_connections` with the exact columns, constraints, and
   lifecycle timestamps in this plan.
2. Add server-only password encryption and decryption using the existing crypto
   service and both environment keys.
3. Add repository operations to find, save, and delete a connection by local
   user ID.
4. Add both environment placeholders to the dashboard example and CI Build step.
5. Generate, review, and check the forward-only migration without applying it.
6. Run the Slice 1 tests and repository checks.

### Slice 2: Email package

1. Create `@inbox-triage/email` with explicit package exports and server-only
   dependencies.
2. Define the minimum normalized summary, message, reference, and error types.
3. Implement Zoho IMAP connection, bounded inbox listing, message retrieval, and
   cleanup.
4. Add focused tests around normalization and connection cleanup.

### Slice 3: Settings

1. Add the Email settings route and navigation destination.
2. Load and save the current user's credentials. A blank password keeps the
   saved password when editing an existing connection.
3. Let the user remove saved credentials after confirmation.
4. Verify the Settings flow in the browser and confirm that no password appears
   in page data or action results.

### Slice 4: On-demand mailbox composition

1. Extend `@inbox-triage/email` with `listInboxNewerThan()` and the required private
   UID-range transport support.
2. Add server-only dashboard functions that load the current user's connection,
   decrypt the password, create the email client, run one mailbox operation, and
   always close the client. Implemented as individual actions in
   `features/emails/actions/`, with authentication, DTO mapping, and safe failure
   results in each action. The server-only `features/emails/server/read-mailbox.ts`
   utility loads credentials and manages client cleanup. The route and UI remain
   for later steps.
3. Add `/offer-emails` and its `Offer emails` main-sidebar destination directly
   above Settings.
4. Add the two-panel inbox UI and a standalone in-memory email state manager.
5. Verify initial listing, older pagination, incremental refresh, selection,
   plain-text message reading, connection states, and safe failures.
6. Run formatting, linting, typechecking, tests.

## Slice 1 implementation contract

Slice 1 establishes persistence and encryption only. It does not create
`@inbox-triage/email`, a route, a server action, or Settings UI.

### Schema

Create `packages/db/src/schema/email-connections.ts` and export it from the
existing schema entry point. Follow the current schema style by using a `text`
column with a database check for the provider instead of creating a PostgreSQL
enum for one value. The TypeScript provider type for this slice is the literal
`'zoho'`; do not add a new domain module for it.

Use named database constraints for:

- the unique `user_id`;
- the `zoho` provider value;
- a trimmed, non-empty username;
- a non-empty encrypted password.

Use the shared `timestamps()` helper. An upsert must advance `updated_at`. Do not
apply the generated migration.

### Repository

Add a server-only dashboard repository under the email integration settings
feature. Its minimum operations are:

```ts
findForUser(userId: string): Promise<EmailConnection | null>

saveForUser(input: {
  userId: string;
  provider: 'zoho';
  username: string;
  encryptedPassword: string;
}): Promise<EmailConnection>

deleteForUser(userId: string): Promise<void>
```

`saveForUser` uses `user_id` as the upsert conflict target. Repository methods
do not accept a connection ID because every operation in this feature is scoped
to the authenticated local user. The repository may return the encrypted
password to server-only callers, but no later DTO or action result may include
it.

Slice 1 does not implement the blank-password update rule. The Settings action
in Slice 3 will load the existing row and pass a complete encrypted password to
the repository.

### Encryption

The shared server-only service lives in `apps/dashboard/src/lib/crypto/crypto.service.ts`.
The feature's `saveEmailConnectionUseCase` accepts validated credentials and the
authenticated local user ID, encrypts the password, then calls the repository.
It returns no credentials. The repository continues to accept `encryptedPassword`.
The Settings action will own authentication, validation, and blank-password
updates. Decryption through the crypto service belongs in the later server-side
mailbox composition. Keep keys and credential values out of logs and action results.

### Expected Slice 1 files

Add:

- `packages/db/src/schema/email-connections.ts`;
- one generated migration and its Drizzle metadata changes;
- the server-only email connection repository;
- server-only password encryption code and its focused tests, with exact files
  chosen during implementation.

Modify:

- `packages/db/src/schema/index.ts`;
- `apps/dashboard/src/server/env.ts`;
- `apps/dashboard/.env.example`;
- `.github/workflows/ci.yml`.

Keep feature code under `apps/dashboard/src/features/settings/email-integration/`
and shared crypto code under `apps/dashboard/src/lib/crypto/`. Use kebab-case.

### Slice 1 verification

Run:

```text
pnpm db:generate
pnpm db:check
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
```

Review the generated SQL for the foreign key, cascade behavior, unique user
constraint, checks, and lifecycle columns. Do not run `pnpm db:migrate`.

Local commands that evaluate dashboard server modules require a valid
`APP_ENCRYPTION_KEY` and `APP_HASHING_KEY`. The repository must not create or commit a
real key. The developer or operator supplies the local value.

## Slice 3 implementation contract

Slice 3 manages stored Zoho credentials. It does not connect to Zoho, read mail,
decrypt a password, or report connection health.

### Behavior

- Add `/settings/email` and place Email after Rates in Settings navigation.
- Show empty Email and Password fields when no connection exists.
- Show the saved email and an empty Password field for an existing connection.
- Use one Save action for both new and existing connections. There is no separate
  update action.
- Keep the saved password when an existing connection is saved with an empty
  Password field.
- Disable Save until the form is valid and differs from its saved state.
- Clear the Password field after a successful save.
- Let the user Disconnect after confirmation. This deletes the saved credentials
  and resets the form. Repeated deletes remain successful.
- Use English copy. Label the fields `Email`, `IMAP host`, and `Password`. Use
  `Use the password Zoho accepts for IMAP.` as password help text.
- Omit provider selection, connection status, verification, password visibility,
  and Test connection.

### Validation and security

- Share one Zod schema between the client and server.
- Trim and lowercase the email, validate its format, and limit it to 254
  characters.
- Preserve passwords exactly. An empty string keeps an existing password;
  whitespace-only passwords count as non-empty.
- Authenticate the page and both actions with `requireUser()`.
- Scope every read, save, and delete to `user.id`.
- Pass only `null` or `{ username, imapHost }` from the page to the Client Component.
- Keep IDs, provider, timestamps, plaintext passwords, and encrypted passwords
  out of page data, action results, logs, and messages.
- Return a password field error when a new connection has no password.
- Return generic messages for repository and encryption failures.

### Server actions

- `saveEmailConnectionAction` handles create and update, then revalidates the
  route. Extend the existing use case to:
  - encrypt a non-empty password;
  - reuse existing ciphertext for an empty password;
  - skip the write when the email and host are unchanged and the password is empty.
- `disconnectEmailConnectionAction` deletes by `user.id`, revalidates the route,
  and returns no row data.

### Planned file changes

Expected file changes (feel free to override if needed)

Add:

```text
apps/dashboard/src/app/(app)/settings/email/loading.tsx
apps/dashboard/src/app/(app)/settings/email/page.tsx
apps/dashboard/src/features/settings/email-integration/actions/disconnect-email-connection.action.test.ts
apps/dashboard/src/features/settings/email-integration/actions/disconnect-email-connection.action.ts
apps/dashboard/src/features/settings/email-integration/actions/save-email-connection.action.test.ts
apps/dashboard/src/features/settings/email-integration/actions/save-email-connection.action.ts
apps/dashboard/src/features/settings/email-integration/components/disconnect-email-connection-dialog.tsx
apps/dashboard/src/features/settings/email-integration/components/email-connection-form.tsx
apps/dashboard/src/features/settings/email-integration/dto/email-connection-settings.dto.ts
apps/dashboard/src/features/settings/email-integration/validation/email-connection-input.schema.test.ts
apps/dashboard/src/features/settings/email-integration/validation/email-connection-input.schema.ts
```

Modify:

```text
PROGRESS.md
apps/dashboard/src/config/navigation.test.ts
apps/dashboard/src/config/routes.ts
apps/dashboard/src/features/settings/components/settings-navigation.tsx
apps/dashboard/src/features/settings/email-integration/use-cases/save-email-connection.use-case.test.ts
apps/dashboard/src/features/settings/email-integration/use-cases/save-email-connection.use-case.ts
docs/plans/email-integration-foundation-plan.md
```

The needed Card, Field, Input, Alert, AlertDialog, Button, Spinner, Skeleton, and
toast components already exist in `@inbox-triage/ui`. Slice 3 should not change the
shared UI package or dependencies.

### Verification

- Test email normalization and validation, password preservation, blank-password
  updates, no-op saves, authenticated user scoping, safe results, and idempotent
  disconnects.
- Use mocks for authentication, repositories, and encryption. Do not add a
  database test setup or component tests that repeat markup.
- In the browser, review the empty and saved forms, save, disconnect, validation,
  and failure handling.
- Confirm in browser developer tools that page data and action responses contain
  no passwords.
- Update this plan and `PROGRESS.md` when the slice is complete.

Run from the repository root:

```text
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
```

No schema or migration change belongs in Slice 3. Do not apply the Slice 1
migration.

## Slice 4 implementation contract

Slice 4 adds an on-demand inbox reader. It does not store email metadata or
message bodies, synchronize in the background, change message state in Zoho, or
implement offer analysis.

### Route and navigation

- Add the protected `/offer-emails` route.
- Add `Offer emails` to the main sidebar directly above Settings.
- Use `Emails` as the page heading and ordinary email terminology everywhere
  except the route and sidebar label. Feature directories, components, hooks,
  actions, and types must not use `offer email` as their domain name.
- Use English for buttons, labels, empty states, errors, and status messages.

### Server composition

Authenticate every mailbox operation with `requireUser()`. Load the connection
by the returned local `user.id`, decrypt the stored password, create the email
client, and close it in a `finally` block. Do not return the connection row,
username, plaintext password, encrypted password, or provider errors to the
browser.

Expose only these dashboard operations to the page:

- load the newest 20 inbox summaries;
- load the next page of 20 older summaries using an opaque page token;
- load all summaries newer than an opaque message reference;
- load one full message using an opaque message reference.

When no connection exists, show an empty state with a link to `/settings/email`.
Mailbox authentication and provider connection failures keep the page available
and offer Retry and Email settings actions. A failure to load one full message
must not remove or disable the summary list. A refresh failure leaves the
current list and selection unchanged.

Map package messages to dashboard DTOs before returning them to the browser.
The full-message DTO includes the fields needed by the detail panel and excludes
`html`, `messageId`, and other unused package data.

### In-memory email state

Keep mailbox state in a standalone `use-emails.ts` custom hook. Back the hook
with a small pure reducer in `email-state.ts` so ordering and error transitions
can be tested independently. Do not add a global state dependency.

The state uses one newest-first `EmailSummary[]`. It prepends newer summaries
and appends older summaries. Deduplicate incoming batches by `MessageRef` before
merging them. Array copying during prepend and append is acceptable for the
number of summaries a user can load during one page visit.

The state also owns the opaque older-page token, selected reference, currently
selected full message, and operation-specific loading and error states. Retain
only the current full message. Selecting a different summary fetches its full
content, including when that message was opened earlier in the same visit.
Discard all state when the user navigates away.

### Listing, selection, and refresh

- Load the newest 20 summaries when the page opens. Do not load a message body
  or select the first message automatically.
- Show sender display name with the address as fallback. Use `No subject` when
  the subject is missing. Each row also shows the received date or time, unread
  indication, and selected state. Do not show preview snippets.
- `Load more` appends the next page of 20 older summaries and disappears when
  `nextPageToken` is `null`.
- `Refresh` calls `listInboxNewerThan()` with the first summary's reference and
  prepends the returned summaries in one state transition. It preserves the
  selected message, open detail, loaded older summaries, and both panel scroll
  positions.
- Show a `No new emails` toast when refresh returns an empty array. Do not show a
  last-refreshed time.
- Reading through InboxTriage remains non-mutating and does not mark the message as
  read in Zoho. Do not add unread or all filters.

### Message detail

Before selection, show `Select an email to view its contents.` in the detail
panel. After selection, show:

- sender display name and full address;
- To recipients;
- CC and Reply-To only when present;
- subject with a `No subject` fallback;
- sent date when available, otherwise received date;
- the parsed plain-text body.

Render the body as plain text while preserving its line breaks. Never place the
message's `html` value in the DOM. Do not sanitize, convert, or otherwise render
HTML in this slice. If a message has no `text/plain` body, show a plain-text
content unavailable state. Do not show attachments or an offer-analysis action.

Format detail dates in the user's local timezone as `DD/MM/YYYY HH:mm`. Summary
rows show `HH:mm` for messages received today and a short `DD/MM/YYYY` date for
older messages.

### Layout

Use two independently scrolling desktop panels. The left panel contains the
toolbar and summary list. The right panel contains the selected message card.
Keep both within the available application viewport.

Mobile-specific list-to-detail navigation is not part of this slice. A minimum
desktop content width with horizontal scrolling is acceptable on narrow
viewports. Do not add substantial responsive state or navigation solely for
mobile.

### Planned file boundaries

Keep product-specific UI and behavior in the dashboard, not in `@inbox-triage/ui`.
Use a feature root under:

```text
apps/dashboard/src/features/emails/
```

Expected dashboard additions include the route, server mailbox composition,
server actions or equivalent boundaries, email list and detail components,
`hooks/use-emails.ts`, and `state/email-state.ts`. Exact component file names may
follow the implementation.

Extend `@inbox-triage/email` only with the public newer-than operation and the
private IMAP range-query support it requires. Do not add HTML-to-text or client
state dependencies.

### Verification

Add focused tests for:

- newer-than UID range selection, newest-first ordering, reference validation,
  summary-only fetching, and connection cleanup;
- authenticated user scoping and safe dashboard results for every mailbox
  operation;
- reducer ordering and deduplication when newer and older batches arrive;
- preserving the current list and selection after refresh and message failures;
- ignoring an outdated full-message response when the user selects another row
  before the first request completes.

Use mocks for authentication, persistence, crypto, and the email client. Do not
add component tests that restate UI copy or markup. Review initial loading,
selection, Load more, Refresh, empty states, plain-text-only messages, HTML-only
messages, and failure states in the browser.

Run from the repository root:

```text
pnpm db:check
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
```

Do not apply the Slice 1 migration.

## Testing boundary

Automated tests should cover behavior whose failure would expose credentials or
another user's connection:

- encryption and decryption behavior without logging or returning plaintext;
- rejection of invalid encryption input without including secret input in
  errors, according to the chosen implementation;
- the database-owned one-connection-per-user constraint, verified through the
  generated SQL and `pnpm db:check` in Slice 1;
- repository ownership when Settings behavior is added in Slice 3;
- keeping the saved password when the update form leaves the password blank;
- closing the email client after successful and failed mailbox operations;
- stable Load more behavior when new mail arrives between pages;
- complete, newest-first newer-than listing for incremental refresh;
- message-reference and page-token validation;
- the 10 MiB message limit before and during download;
- normalized address, summary, and MIME message mapping;
- safe error translation without provider objects or sensitive values.

Do not add a database-backed test environment only for this slice. Do not add
component tests that restate the Settings copy or markup.

## Open questions for later slices

No product question blocks Slice 4.

The email integration plan remains independent of the AI feature. Define the AI
input, output, persistence, and review workflow in its own later plan.

## Slice 5: Configurable IMAP hosts

### Contract

- Store `imapHost` per user connection as non-null `imap_host` text with a
  database default of `imap.zoho.com` and trimmed/non-empty checks.
- Add a forward migration. The column default backfills existing rows with
  `imap.zoho.com`, preserving passwords and lifecycle timestamps. Keep earlier
  migrations unchanged and leave migration application to the user.
- Extend repository insert and conflict-update operations with the host. A
  host-only change retains the saved ciphertext when Password is empty. Only
  skip writes when normalized username and host both match and Password is empty.
- Require top-level `imapHost: string` in `EmailClientConfig`. The dashboard
  passes the stored host to the package, factory, adapter, and transport.
  The adapter retains port 993 and implicit TLS. No host environment variable
  or package-side default is needed.
- Share client/server Zod validation. Require a string, trim it, and reject
  an empty result with `Enter an IMAP host.`. Accept every other string without
  lowercase conversion, URL parsing, hostname validation, or an allowlist.
  This explicitly replaces the user's initial allowlist requirement.
- Extend Settings page data to `{ username, imapHost }`. Passwords and remaining
  row fields stay server-only. Add a text field between Email and Password,
  initialize it from the saved connection or `imap.zoho.com`, and include it in
  dirty-state detection, validation focus, action submission, and save state.
- On successful save, show the normalized host and clear Password. On failure,
  preserve edits. Disconnect resets the host to `imap.zoho.com`.
- Explain how to find the incoming server in Zoho Mail Settings, Mail Accounts,
  the user's mailbox, then Server Configuration Details. Link to the
  [Zoho IMAP guide](https://www.zoho.com/mail/help/imap-access.html), which explains
  that server details depend on account type and data center. State that
  InboxTriage uses port 993 with TLS.
- Saving performs no network verification. Subsequent reads use the entered
  address and existing safe provider-error handling. Client cleanup and
  authenticated user scoping remain required for all mailbox operations.

### Completion

- [x] Implement connection storage, migration generation, and repository writes.
- [x] Implement shared validation, Settings behavior, and saved-host client creation.
- [x] Add focused automated coverage for validation, save behavior, actions,
      and transport configuration.
- [x] Review generated SQL and pass database consistency, formatting, lint,
      typecheck, and test checks.
- [ ] Review authenticated Settings behavior and an authorized `.eu` mailbox read
      in the browser.

### Verification

`pnpm db:check`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, and
`pnpm test` passed. The reviewed forward migration is
`packages/db/migrations/0003_add-email-imap-host.sql`. It adds the host with a
default and non-null constraint, backfilling existing rows without changing
credentials or lifecycle timestamps, then adds trimmed/non-empty checks.
No build or migration application was run.

- Test trimming and case preservation, arbitrary non-empty text, and rejection
  of missing, non-string, empty, and whitespace-only hosts.
- Test creation, host-only changes preserving ciphertext, normalized no-op
  saves, password replacement, authenticated scoping, and safe action results.
- Verify every mailbox read passes the saved host to client creation. Mock the
  transport to verify `.eu` and arbitrary supplied text use port 993 and TLS.
- Review SQL for the backfill, default, checks, and preservation of existing
  rows. Do not add a live database or IMAP server only for this feature.
- Manually review initial/saved forms, host-only updates, validation, failure
  retention, disconnect reset, and an authorized `.eu` mailbox read. Do not add
  component tests that restate markup or copy.
- Run `pnpm db:check`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, and
  `pnpm test` from the root. Run `pnpm db:generate` after schema changes and
  review its SQL. Do not build or apply migrations without an explicit request.

## Deferred and future work

Additional providers, mailbox verification, and encryption-key rotation remain
outside this change.
