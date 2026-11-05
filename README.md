# Inbox Triage

A personal portfolio project, still in progress.

Inbox Triage is an email dashboard for creative studios and freelancers. Client
project requests arrive by email, often missing the details needed to quote
them. The app reads your mailbox, uses an LLM to check each brief for the
information a quote needs, and drafts a reply asking the client for whatever is
missing.

The repo doubles as a reference structure and template for Next.js monorepos.

## Features

- **Mailbox connection.** Connect a Zoho or Gmail account over IMAP and SMTP.
  Gmail uses an app password, see the
  [setup guide](docs/user-guides/connect-gmail.md). The app encrypts stored
  credentials with a server-side key.
- **Email message view.** Browse inbox messages, with
  quoted history separated from the newest reply.
- **Brief review.** An LLM call through OpenRouter extracts project type,
  objective, deliverables, timeline, location, budget, intended use, creative
  direction, and talent from an email. It marks required fields that the client
  left out or left vague.
- **Reply drafts.** From a brief review, the app drafts a reply in the client's
  language that asks for the missing details. You edit it and send it through
  the connected mailbox.
- **Authentication.** Clerk handles sign-in. Each Clerk user maps to a local
  user record, and server code checks access at that boundary.

## Tech stack

- **App:** Next.js App Router, React, TypeScript
- **UI:** Tailwind CSS, shadcn/ui
- **Auth:** Clerk
- **Data:** PostgreSQL 17, Drizzle ORM, Zod
- **AI:** Vercel AI SDK, OpenRouter
- **Email:** ImapFlow, Nodemailer
- **Tooling:** pnpm workspaces, Vitest, ESLint, Prettier, Husky

## Repository structure

```text
apps/
  dashboard/     Next.js app: routes, feature modules, server actions
packages/
  auth/          Clerk integration and the local user boundary
  db/            Drizzle schema, migrations, and database CLI
  email/         IMAP reading and SMTP sending for Zoho and Gmail
  ui/            Reusable shadcn/ui components, kept free of product styling
docs/
  plans/         Implementation plans, one per feature
  user-guides/   Setup guides for non-technical users
```

Product code in `apps/dashboard/src/features` is grouped by business capability.
[docs/application-conventions.md](docs/application-conventions.md) describes
the layering and file conventions. [PROGRESS.md](PROGRESS.md) lists shipped and
planned features.

## Technical choices

### Monorepo with internal packages

Auth, database, email, shared rules, and UI each live in their own package.
This facilitates work with AI agents.

- ✅ **Smaller context.** An agent working in `packages/email` only needs that
  folder and its public types.
- ✅ **Contracts first.** We establish the package's exports and types first,
  then the agent implements them.
- ✅ **Enforced boundaries.** Packages export only their entry points, so an
  agent can't import another package's internals or couple it to the app.
- ✅ **Explicit dependencies.** `packages/email` has no dependency on Next.js,
  the database, or Clerk, and an agent can't quietly add one without a visible
  `package.json` change.
- ⚠️ **More config per package** (TypeScript, ESLint, Vitest).
- ⚠️ **Boundaries stop at package level.** Feature folders inside the app rely
  on written conventions.

### OpenRouter for LLM calls

Brief review and reply drafting call an LLM through OpenRouter, using the AI
SDK.

- ✅ **Model is config.** `OPENROUTER_MODEL` picks the model. The eval suites
  check a new model before switching.
- ✅ **Zero data retention.** Every request requires ZDR providers and denies
  data collection, since client emails go to the model.
- ✅ **Provider fallback.** When several providers serve a model, OpenRouter
  routes around one that is down.
- ✅ **Easy to undo.** The AI SDK keeps calls provider-agnostic, so moving to a
  direct provider is a small change.
- ⚠️ **Extra party in the data path.** Emails pass through OpenRouter as well as
  the model provider.
- ⚠️ **ZDR narrows the choice.** Only models with a zero-retention provider are
  available.
- ⚠️ **Extra cost.** OpenRouter charges a fee on credit purchases on top of
  model prices.

### LLM output as structured data

The brief review returns structured data that the UI renders directly, so the
app checks it before use.

- ✅ **Validated output.** A Zod schema checks every response. On failure, the
  app retries once and sends the model the specific errors.
- ✅ **Evals check structure, not prose.** Each sample email lists the expected
  field statuses, language, and blocking questions. The checks are
  deterministic, with no LLM judge.
- ⚠️ **Prose isn't evaluated.** I review the wording of reviews and reply
  drafts myself.

### Shortcuts for now

These choices got features working fast. Each one can be replaced later.

- **Gmail app passwords instead of OAuth.** Google recommends OAuth, but it
  needs a Google Cloud project and OAuth credentials, and a public app that
  reads Gmail generally needs Google's verification. App passwords work for
  most accounts with 2-Step Verification turned on.
- **Clerk for auth.** It handles sign-in, and its free tier covers this
  project. Each Clerk user maps to a local `users` row, and a lint rule blocks
  direct Clerk imports in the dashboard, so moving off Clerk stays contained.
- **No stored emails or reviews.** The app fetches mail from the mailbox on
  request, which is slow, and a brief review disappears once you leave the
  email. Storing emails and reviews comes next.

## Development

### Setup

You need Node.js 24, pnpm 11, and Docker.

Install dependencies and create the dashboard environment file:

```bash
pnpm install
cp apps/dashboard/.env.example apps/dashboard/.env
```

Fill in `apps/dashboard/.env`:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` come from a Clerk
  development instance.
- `APP_ENCRYPTION_KEY` and `APP_HASHING_KEY` must be two different keys. Generate
  each with `openssl rand -hex 32`.
- `OPENROUTER_API_KEY` comes from your OpenRouter account.

The default `DATABASE_URL` matches the Docker Compose database.

Start Postgres, apply the committed migrations, and run the dashboard:

```bash
docker compose -p inbox-triage up -d
pnpm db:migrate
pnpm dev
```

### Checks

```bash
pnpm lint
pnpm typecheck
pnpm test
```

The pre-commit hook runs lint-staged and a typecheck. Commitlint enforces
Conventional Commits on the message.

### Prompt evals

The eval suites run sample emails against the configured model. They make
billable OpenRouter requests, so each run needs an explicit opt-in:

```bash
OPENROUTER_ALLOW_BILLABLE_REQUESTS=true pnpm --filter @inbox-triage/dashboard eval:brief-review
OPENROUTER_ALLOW_BILLABLE_REQUESTS=true pnpm --filter @inbox-triage/dashboard eval:brief-reply
```

### Database

The schema and migrations live in `packages/db`. After a schema change, run
`pnpm db:generate` and `pnpm db:check`, review the generated SQL, then apply it
with `pnpm db:migrate`. [docs/database.md](docs/database.md) covers the full
workflow and how to revert a local migration by hand.

## License

MIT. See [LICENSE](LICENSE).

Some agent skills in `.agents/skills` come from other projects and keep their
original licenses. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
