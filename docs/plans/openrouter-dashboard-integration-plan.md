# Add dashboard OpenRouter integration

## Goal

Give dashboard server code a configured OpenRouter model through AI SDK and add
one explicit, billable smoke command that demonstrates a minimal text-generation
call. Keep the integration inside `apps/dashboard` until product features reveal
shared behavior worth extracting.

This plan does not create `@inbox-triage/ai`, a InboxTriage-owned generation API, or
any product feature.

## Context

InboxTriage currently has one application that will use AI. The earlier plan
proposed a workspace package with package-owned request, result, metadata, and
error contracts before the first consuming workflow existed. That package would
have copied concepts already owned by AI SDK and the OpenRouter provider.

Use the libraries directly for the initial integration. A server-only dashboard
module will bind the OpenRouter API key and model slug. Future feature code can
import AI SDK operations from `ai` and the configured model from that module.
Reconsider a workspace package after multiple consumers repeat stable
InboxTriage-owned behavior.

The branch for this plan does not contain the earlier `packages/ai` implementation
commit. Keep `packages/ai` absent and install the dependencies in the dashboard.

## Scope

This plan includes:

- AI SDK and the OpenRouter AI SDK provider as dashboard dependencies;
- required dashboard environment variables for the API key and model slug;
- a server-only `apps/dashboard/src/server/ai.ts` module;
- one guarded smoke command with a small text prompt;
- environment documentation and CI build placeholders;
- repository validation without automatic or unconfirmed billable calls.

This plan excludes:

- email evaluation, request rating, reply drafting, or other feature behavior;
- UI, server actions, use cases, schemas, persistence, and background jobs;
- a shared AI workspace package or provider-neutral wrapper;
- InboxTriage-owned request, result, metadata, or error types;
- structured output, streaming, messages, tools, agents, MCP, embeddings, and
  media generation;
- reasoning configuration, model selection UI, model discovery, and model
  comparisons;
- application retries, queues, caching, idempotency, budgets, quotas, and usage
  persistence.

## Technical design

### Dependencies

Add compatible AI SDK v7 and OpenRouter provider v3 dependencies to
`apps/dashboard/package.json` with pnpm. Confirm the exact supported versions
against the repository's Node.js 24 and ESM configuration during implementation.
Keep all lockfile changes in the root `pnpm-lock.yaml`.

Do not create `packages/ai`, add a workspace dependency, or extend
`transpilePackages`. Dashboard code imports `generateText` and other future AI SDK
operations from `ai` directly. It imports OpenRouter types from
`@openrouter/ai-sdk-provider` when provider-specific configuration requires them.

This deliberately defers reusable-package structure. The production application
has one known consumer, and there is no stable InboxTriage-owned AI contract to
share yet.

### Environment configuration

Add two required values to `apps/dashboard/src/server/env.ts`:

```text
OPENROUTER_API_KEY
OPENROUTER_MODEL
```

Both values must be non-empty. Use OpenRouter's model slug without trying to
validate it against a local allowlist or remote model catalog.

Document both values in `apps/dashboard/.env.example` with obvious non-secret
placeholders. Add placeholders to the CI Build step because `next build` may
evaluate server modules. Never commit a real API key. Development, preview, and
production should use separate keys so operators can revoke and budget them
independently.

Do not add reasoning effort or other model parameters to environment
configuration. A consuming feature should establish that need first.

### Server model binding

Create `apps/dashboard/src/server/ai.ts`:

```ts
import 'server-only';

import { createOpenRouter } from '@openrouter/ai-sdk-provider';

import { env } from './env';

const openrouter = createOpenRouter({
  apiKey: env.OPENROUTER_API_KEY,
  compatibility: 'strict',
});

export const aiModel = openrouter(env.OPENROUTER_MODEL);
```

The exact exported name may change during implementation if a more specific name
reads better at call sites. Export the configured AI SDK model, not the API key,
raw configuration, or a InboxTriage-owned generation wrapper.

Creating the provider and model must not make a network request. Importing the
module during a build must therefore remain non-billable.

Future feature code should use native AI SDK operations:

```ts
import { generateText } from 'ai';

import { aiModel } from '@/server/ai';

const result = await generateText({
  model: aiModel,
  prompt: 'Write one short sentence welcoming a photographer to InboxTriage.',
});
```

This snippet documents the intended imports. Do not add it as dormant production
feature code. The smoke script provides the executable example.

### Guarded smoke command

Add a dashboard-owned script under `apps/dashboard/scripts/` and expose it as a
package script such as:

```text
pnpm --filter @inbox-triage/dashboard smoke:openrouter
```

The script must:

1. refuse to run unless `OPENROUTER_ALLOW_BILLABLE_REQUESTS=true`;
2. load the configured model through `apps/dashboard/src/server/ai.ts`;
3. announce before generation that the command makes one billable request;
4. call AI SDK `generateText` with one short, non-sensitive prompt;
5. set `maxRetries: 0` so the command cannot create an automatic second billable
   request;
6. apply a finite timeout suitable for a manual compatibility check;
7. print the generated text and AI SDK's normalized usage information;
8. return a non-zero exit status when configuration or generation fails.

Run the TypeScript script with tooling and export conditions that allow the
`server-only` marker to resolve outside Next.js. Declare any required runner as a
dashboard development dependency rather than relying on a transitive package.
Load the dashboard's Next.js environment files before dynamically importing
`src/server/ai.ts`, so the standalone command uses the same configuration as the
application and does not depend on the caller exporting every variable manually.

The prompt is an integration example, not a product prompt. It must contain no
mailbox content, customer information, credentials, or other production data.

Keep the smoke command separate from tests, Git hooks, CI, builds, development
startup, and application startup. Automated commands must never set the billing
guard.

## Security and operational rules

- Keep the API key in server environment configuration and out of client bundles,
  logs, errors, and command output.
- Do not log prompts or generated output in shared application infrastructure.
  The explicit local smoke command may print its fixed prompt result.
- Leave AI SDK telemetry disabled and OpenRouter provider debugging disabled.
- Use OpenRouter account and routing defaults for the smoke check.
- Review OpenRouter retention and provider data-policy controls before any feature
  sends real email or customer data.
- Do not infer that a failed request was unbilled. The smoke command performs no
  automatic retries.

## Implementation steps

### 1. Keep the integration in the dashboard

Confirm that the branch contains no tracked `packages/ai` source, workspace
dependency, package importer in the lockfile, or completed package slice in
`PROGRESS.md`.

Complete when the plan and repository no longer describe an implemented or
planned `@inbox-triage/ai` package.

### 2. Install the libraries in the dashboard

Add AI SDK v7 and OpenRouter provider v3 to the dashboard with pnpm. Review the
root lockfile for the expected dashboard importer and compatible peer versions.

Complete when dashboard code can import both libraries and the root dependency
graph remains consistent.

### 3. Bind dashboard configuration to a server-only model

Add the required environment validation, `.env.example` entries, CI Build
placeholders, and `src/server/ai.ts`. Confirm that importing the module creates no
request and that client code cannot import it through a supported path.

Complete when dashboard server code can import one configured AI SDK model and a
production build succeeds with non-secret placeholders.

### 4. Add the guarded example request

Add the dashboard smoke command with one simple `generateText` call. Require the
explicit billing guard, disable retries, apply a timeout, and keep all automatic
validation offline.

Complete when the command refuses an unconfirmed run and is ready for a developer
to execute manually with a funded key. A live run is optional and is not required
to complete implementation.

## Validation

Run from the repository root:

```text
pnpm format:check
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Also verify:

- `packages/ai` has no tracked files;
- only the root `pnpm-lock.yaml` changes;
- the dashboard declares the AI dependencies directly;
- missing or empty OpenRouter environment values fail with actionable messages;
- CI placeholders contain no usable credential;
- server-only AI configuration does not enter a client bundle;
- tests, builds, hooks, and startup make no OpenRouter requests;
- the smoke command exits before generation when its billing guard is absent;
- the smoke command does not print the API key or raw provider response.

Do not mock AI SDK to test its own argument handling or result types. Add an
automated test only if implementation introduces InboxTriage-owned branching worth
protecting, such as the billing guard. Never place a live OpenRouter call in the
automated test suite.

## Revisit the package decision

Consider extracting `packages/ai` after implementation provides evidence for a
shared contract. Useful signals include a second application or worker, repeated
provider construction, repeated safe metadata handling, or a stable call policy
used by several features.

If extraction becomes justified, move working code and preserve native AI SDK and
OpenRouter types where they remain appropriate. Do not create a provider-neutral
API solely to hide the selected libraries.

## References

- [AI SDK text generation](https://ai-sdk.dev/docs/ai-sdk-core/generating-text)
- [AI SDK `generateText`](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text)
- [OpenRouter AI SDK provider](https://github.com/OpenRouterTeam/ai-sdk-provider)
- [OpenRouter provider routing](https://openrouter.ai/docs/guides/routing/provider-selection)
