# Clerk Authentication Plan

## Status

Complete.

Local implementation and verification are done. Clerk production-instance
setup, Vercel environment configuration, and production verification are
deferred until production exists. See `FUTURE_WORK.md`.

## Objective

Add invite-only email/password authentication to the dashboard with Clerk while
keeping the application's user identity and authorization boundary explicit:

```text
Clerk credentials and session -> requireUser() -> local users row -> application work
```

Clerk will own credential storage, sign-in, account recovery, session management,
and account UI. Inbox Triage will own a minimal `users` table and a server-only
`requireUser()` API that maps an authenticated Clerk identity to the application's
stable user ID.

All admitted users will have equal access to the same studio data. This slice will
not introduce roles, permissions, organizations, public signup, social login, or
per-user data ownership.

## Agreed decisions

- Use Clerk rather than a self-hosted credentials implementation.
- Enable email/password authentication only; do not enable Google, Microsoft, or
  other social providers in this slice.
- Configure the Clerk production instance in Restricted mode so users can join
  only through Clerk dashboard invitations or manual creation.
- Use Clerk's prebuilt sign-in, user button, and account-management UI.
- Let Clerk deliver invitation, verification, and password-recovery messages;
  Inbox Triage will not add an email provider or email-sending code.
- Create a local `users` table. Use the neutral application terms `user`, `users`,
  and `requireUser()` rather than studio-member terminology.
- Give every authenticated, admitted user the same application access. Do not add
  roles, permissions, or Clerk Organizations.
- Protect the application by default. The sign-in route and Clerk-required
  internal requests are public; future public endpoints, including webhooks, must
  be added intentionally and enforce their own verification.
- Deploy the dashboard to Vercel with separate Clerk development and production
  configuration.
- Create a private, source-based `@inbox-triage/auth` workspace package with a small,
  intentional public API.
- Keep framework convention files, runtime environment ownership, the configured
  database singleton, and page composition in `apps/dashboard`.
- Keep the `users` schema and generated migration in `@inbox-triage/db`.
- Establish the database convention that application-owned tables include
  `createdAt` and `updatedAt` lifecycle timestamps by default. Require an explicit
  reason for exceptions.
- Create the local user row lazily on the first authenticated application request.
  Do not add Clerk webhooks solely to synchronize an otherwise unused profile.

## Package-boundary decision

Create `packages/auth` because authentication is a genuine cross-cutting boundary
and because this repository intentionally uses workspaces as independently
understandable units. The package should make Clerk replaceable at the application
call sites, but it should not build a speculative provider-neutral authentication
framework.

The boundary is:

```text
apps/dashboard
  - owns Clerk/Vercel environment values
  - owns proxy.ts and Next.js routes
  - owns the configured Drizzle client
  - binds the DB client to the auth package
  - composes auth UI into dashboard pages

@inbox-triage/auth
  - owns direct @clerk/nextjs imports
  - exposes the supported auth UI wrappers
  - validates the current Clerk session
  - maps Clerk subjects to local users
  - exposes requireUser() and the local User contract

@inbox-triage/db
  - owns the users table and migration
  - owns the Drizzle client type consumed by the auth factory
```

This is a source boundary, not an attempt to hide all implementation facts. The
package may be Clerk-specific internally. Its value comes from a narrow export map,
tests around the contract, and a rule that feature code does not import Clerk
directly.

Do not move `proxy.ts`, `layout.tsx`, route files, environment parsing, or the
configured database singleton into the package. Those are application and
framework composition concerns. Do not let the package read environment variables
or import from `apps/dashboard`.

## Scope

### In scope

- Add the private `@inbox-triage/auth` workspace package.
- Add Clerk's Next.js SDK behind intentional auth-package entry points.
- Add the local `users` table, inferred user type, and generated Drizzle migration.
- Add a DB-bound `requireUser()` implementation that validates the Clerk session
  and returns the corresponding local user.
- Make first-access local-user creation idempotent and safe under concurrent
  requests.
- Add a dedicated Clerk sign-in page.
- Add Clerk's account-management UI and a user button/sign-out entry point.
- Configure `ClerkProvider` and Next.js 16 `proxy.ts`.
- Use an explicit public-route policy while retaining resource-level checks.
- Configure and document Clerk Restricted mode and email/password-only settings.
- Configure development and Vercel production environment variables.
- Test the package boundary, user mapping, public-route policy, and protected
  resources.
- Run formatting, migration checks, tests, typechecking, linting, and a production
  build.

### Out of scope

- Public signup or an in-application invitation/user-administration screen.
- A custom sign-in, signup, password-reset, or account-management UI.
- Application-owned email delivery.
- Social login, passkeys, phone authentication, MFA, or enterprise SSO.
- Clerk Organizations, roles, permissions, or multiple studios/tenants.
- Per-user ownership rules for existing or future studio data.
- Google Calendar, Gmail, Microsoft Calendar, or email integration scopes.
- Reusing Clerk social-provider tokens for external integrations.
- Clerk webhooks or duplicated local profile fields such as email, name, or image.
- Automatic deletion of orphaned local user rows when a Clerk account is removed.
- A generic adapter system for swapping between Clerk, Better Auth, and other
  identity providers.
- Vercel Deployment Protection as a substitute for application authentication.

## Proposed architecture

### Package layout

Use explicit subpath exports and omit a broad package-root export:

```text
packages/auth/
├── src/
│   ├── client/
│   │   ├── auth-provider.tsx
│   │   ├── sign-in.tsx
│   │   ├── user-button.tsx
│   │   └── user-profile.tsx
│   ├── server/
│   │   ├── create-auth.ts
│   │   ├── require-user.ts
│   │   └── require-user.test.ts
│   ├── client.ts
│   └── server.ts
├── package.json
└── tsconfig.json
```

The exact internal file split may be adjusted during implementation to keep one
primary utility per file. The public surface should remain limited to:

| Import                      | Contents                                                        |
| --------------------------- | --------------------------------------------------------------- |
| `@inbox-triage/auth/client` | Reviewed Clerk UI/provider wrappers                             |
| `@inbox-triage/auth/server` | Auth factory returning a bound `requireUser`, and related types |

`src/client.ts` and `src/server.ts` are intentionally small public entry-point
barrels, not configured client instances or implementation modules. `client.ts`
marks the client boundary and re-exports the supported components implemented in
`src/client/`. `server.ts` marks the server-only boundary and re-exports
`createAuth` and its public types from `src/server/`. Keep Clerk integration logic
and local-user mapping in the corresponding implementation files rather than in
the entry-point barrels.

Do not add wildcard exports. Dashboard feature code must use these entry points or
the dashboard's bound server module rather than importing `@clerk/nextjs`
directly. The thin Next.js `proxy.ts` is the only acceptable dashboard-level
exception if Clerk's framework export cannot be wrapped without obscuring the
required convention; prefer exporting the configured middleware helper from the
auth package when the API remains clear.

### Local users table

Add `packages/db/src/schema/users.ts` and export it through the existing schema
barrel. The initial table needs only identity-mapping fields:

| Column        | Purpose                                             |
| ------------- | --------------------------------------------------- |
| `id`          | Application-owned UUID primary key                  |
| `clerkUserId` | Unique, non-null Clerk user subject                 |
| `createdAt`   | Timestamp recording first successful app admission  |
| `updatedAt`   | Timestamp recording the latest application mutation |

Add the timestamps through a shared DB schema helper so `users` establishes the
default for future application-owned tables. Use non-null, timezone-aware
timestamps initialized by the database. `createdAt` remains unchanged after
insertion; application updates must advance `updatedAt`. The initial user mapping
is immutable, so both timestamps may remain equal until the table gains mutable
fields.

Do not copy email, name, avatar, password data, session data, or role fields into
the table. Clerk remains authoritative for account profile and credential data.
Add local fields later only when application behavior needs them and define an
explicit synchronization strategy at that time.

The Clerk subject is an external identity, not the application's domain primary
key. Future per-user records, such as personal integration connections, should
reference `users.id`.

### Auth factory and `requireUser()`

The auth package must not construct a database or read `DATABASE_URL`. Expose a
factory that accepts the existing `Db` instance and returns bound request-time
operations. The dashboard will instantiate it once in a server-only module:

```text
apps/dashboard/src/server/db.ts
           |
           v
createAuth({ db })
           |
           v
apps/dashboard/src/server/auth.ts -> requireUser()
```

The package does not export a globally configured, independently usable
`requireUser`. Instead, `createAuth({ db })` returns the bound `requireUser`
operation, and `apps/dashboard/src/server/auth.ts` exports that configured
operation for dashboard feature code. `src/server/require-user.ts` remains an
internal implementation module and focused test seam.

`requireUser()` will:

1. Ask Clerk for the current request's authenticated session.
2. Reject an unauthenticated request before reading or writing application data.
3. Look up the local row by the Clerk user ID.
4. Return the existing local user when present.
5. Insert the local row when this is the user's first authenticated request.
6. Resolve a concurrent unique-key conflict by reading and returning the row
   created by the competing request.
7. Return the local application user contract, including `users.id`, rather than
   exposing Clerk's complete session object to feature code.

Use Clerk's server-side session validation, not a client hook or the mere presence
of a cookie. Implement `requireUser()` on Clerk's `auth.protect()` so Clerk applies
its supported request-aware behavior: redirect an unauthenticated document to the
configured sign-in page and reject unauthenticated Server Actions or Route Handler
requests without running application work. Do not invent a second session-error
protocol in the package.

Do not call Clerk's user-profile API during every request. The local mapping does
not require email or name, so session validation plus the Clerk subject is enough.

### Route and resource protection

Add `apps/dashboard/src/proxy.ts` using the Next.js 16 filename and Clerk's
supported matcher for dynamic, API, and Clerk frontend requests. Proxy provides
Clerk request context and may perform an early redirect for non-public document
requests, but it is not the authoritative authorization boundary.

The public application allowlist initially contains only:

- `/sign-in` and its optional catch-all segments;
- static assets and Next.js internals excluded by the proxy matcher;
- Clerk frontend/internal paths required by the SDK.

The account page, root application page, Route Handlers, and Server Actions are
protected resources. Each resource that reads or mutates protected data must call
`requireUser()` directly or call through a data-access function that does. A layout
check may improve navigation behavior but must not replace resource-level checks,
because layouts are not re-evaluated on every client navigation.

Future public endpoints must be explicit. For example, a Clerk webhook would be
public at the session layer but would require signature verification before doing
work. No webhook is added in this slice.

### Auth UI

Wrap the root application with the auth package's `AuthProvider`, backed by
Clerk's provider.

Add:

- `/sign-in/[[...sign-in]]` using the prebuilt sign-in component;
- `/account/[[...account]]` using the prebuilt user-profile component;
- a visible user button in the authenticated application shell, providing access
  to account management and sign-out.

Use path routing for the embedded components and explicit sign-in, account, home,
and after-sign-out URLs. Apply only minimal appearance integration needed to fit
the shared semantic colors. Do not create custom shadcn auth forms or depend on
experimental Clerk UI composition APIs.

### Clerk dashboard configuration

Treat Clerk dashboard configuration as part of the deliverable and document it in
the repository:

1. Create separate Clerk development and production instances.
2. Enable email address plus password authentication.
3. Disable social connections and unused authentication strategies.
4. Enable Restricted mode; do not use the premium Allowlist feature as a
   substitute.
5. Configure invitation, verification, and password-recovery email behavior.
6. Configure the application URLs for sign-in, home, account management, and
   sign-out redirects.
7. Create or invite the initial user through Clerk rather than through an
   application setup endpoint.
8. Verify that an uninvited address cannot create an account.

Configuration that cannot be represented in source must have a checklist with
development and production verification steps.

### Environment and Vercel

Extend dashboard-owned environment validation and `.env.example` for the Clerk
publishable key and secret key. Sign-in, sign-up, and fallback redirect URLs are
owned in source (`@inbox-triage/auth` routes plus `proxy.ts`), not environment
variables. Keep the secret server-only and ensure no non-public variable uses a
`NEXT_PUBLIC_` prefix.

Use development-instance keys locally and configure production-instance keys in
the Vercel Production environment. Decide explicitly which Clerk instance Preview
deployments use, register the necessary domains/redirects, and never commit real
keys.

Document the Vercel setup without adding Vercel Deployment Protection. Preview
and production deployments must both rely on the application auth boundary.

## Proposed dependencies

Add to `packages/auth`:

- `@clerk/nextjs` as the Clerk integration;
- `@inbox-triage/db` as a workspace dependency for `Db`, schema, and user types;
- `server-only` for server entry-point enforcement where applicable;
- React and Next.js as peer dependencies if required by the exported wrappers;
- TypeScript and relevant React/Node types as development dependencies.

Add `@inbox-triage/auth` to the dashboard as a workspace dependency. Avoid declaring
`@clerk/nextjs` directly in the dashboard unless a required Next.js convention
cannot consume the auth package wrapper cleanly. If a direct dependency is needed,
document the exception while keeping feature code behind the package API.

Add Vitest as the auth package's focused test runner, with package-owned
configuration and scripts. Wire it into the existing recursive root `pnpm test`
command and do not introduce a second root test orchestrator or unrelated package
test setup.

Install through pnpm from the repository root. Confirm dependency changes affect
only the root `pnpm-lock.yaml` and do not introduce duplicate or mismatched React
or Next.js versions.

## Phase 1: Add the local user schema

### Work

1. Add a shared schema helper for non-null, timezone-aware `createdAt` and
   `updatedAt` columns with database defaults.
2. Add the `users` table in a dedicated kebab-case schema module.
3. Add the application UUID, unique Clerk subject, and shared lifecycle
   timestamps.
4. Export the table and inferred row type through `@inbox-triage/db/schema`.
5. Generate and review the first Drizzle SQL migration.
6. Run `pnpm db:check` and inspect migration metadata for a reproducible schema
   history.
7. Apply the migration manually to the local development database and verify the
   resulting table and unique constraint.

### Exit criteria

- The application has one provider-independent local user ID.
- Clerk profile and credential data are not duplicated.
- The table has database-initialized `createdAt` and `updatedAt` columns following
  the reusable lifecycle-timestamp convention.
- Concurrent inserts for one Clerk subject cannot create duplicate users.
- The migration is generated, reviewed, committed, and accepted by Drizzle Kit.
- Migration application remains an explicit operation rather than an app-startup
  side effect.

## Phase 2: Create `@inbox-triage/auth`

### Work

1. Add the private, source-based workspace with ESM semantics, strict no-emit
   typechecking, explicit subpath exports, and no build output.
2. Add the Clerk SDK and workspace dependencies with correct peer ownership.
3. Add reviewed wrappers for the provider, sign-in, user button, and user profile.
4. Add the DB-bound auth factory and server-only `requireUser()` implementation.
5. Implement first-access user insertion with unique-conflict recovery.
6. Export only the intended client and server contracts.
7. Add tests for unauthenticated rejection, existing-user lookup, first-access
   insertion, and concurrent/idempotent creation behavior.
8. Add a path-scoped root ESLint restriction preventing dashboard feature code
   from importing Clerk directly; all dashboard code must use the auth package or
   its bound server module.

### Exit criteria

- Auth implementation details are reachable through two intentional subpaths.
- The package reads no environment variables and constructs no global DB client.
- `requireUser()` returns a local user and never trusts an unvalidated cookie.
- Repeated and concurrent requests map one Clerk identity to one local row.
- Client Components cannot import the server entry point.
- Package tests and typechecking pass through root scripts.

## Phase 3: Integrate Clerk with the dashboard

### Work

1. Add `@inbox-triage/auth` as a dashboard dependency and configure source-package
   transpilation if required by Next.js.
2. Extend the dashboard environment module and `.env.example` with Clerk settings.
3. Add `src/server/auth.ts`, bind the configured `db`, and export `requireUser()`
   for dashboard server code.
4. Wrap the root layout with the auth provider.
5. Add Next.js 16 `src/proxy.ts` with Clerk's supported matcher and the explicit
   public-route policy.
6. Add the optional catch-all sign-in route with Clerk's prebuilt UI.
7. Add the protected optional catch-all account route with Clerk's prebuilt user
   profile.
8. Protect the root page through `requireUser()` and add the user button/sign-out
   entry point without designing the final dashboard shell prematurely.
9. Ensure every new Route Handler or Server Action introduced by this slice has a
   resource-level auth check.

### Exit criteria

- An unauthenticated document request reaches the sign-in flow rather than app
  content.
- An unauthenticated API or action request cannot read or mutate protected data.
- An authenticated Clerk user receives the same local user on every request.
- Sign-in, account management, password change/recovery, and sign-out use Clerk's
  supported UI and flows.
- No dashboard feature module imports Clerk directly.

## Phase 4: Configure Clerk and Vercel

### Work

1. Create and configure the Clerk development instance with email/password only
   and Restricted mode.
2. Invite or create the initial development user through Clerk.
3. Add local development keys and verify they remain ignored by Git.
4. Create/configure the Clerk production instance with matching restrictions.
   Deferred until production exists.
5. Add production keys and route variables to Vercel's Production environment.
   Deferred until production exists.
6. Configure Preview environment behavior and authorized domains explicitly.
   Deferred until production exists.
7. Deploy a preview, test the full flow, then verify production configuration
   independently. Deferred until production exists.
8. Record the external dashboard checklist in the project README. Production
   and Vercel steps remain future work.

### Exit criteria

- Public signup is unavailable in the Clerk development instance.
- Only invited or manually created accounts can sign in.
- Local development uses the intended Clerk development instance and URLs.
  Preview and Production remain deferred until those environments exist.
- Secrets are absent from source, logs, and client bundles.
- A newly invited user can authenticate and receives exactly one local row.

## Phase 5: Validate and document

### Work

1. Run:

   ```bash
   pnpm format:check
   pnpm lint
   pnpm test
   pnpm typecheck
   pnpm db:check
   pnpm build
   ```

2. Verify an unauthenticated visitor cannot reach the root page, account page,
   protected Route Handlers, or protected Server Actions.
3. Verify the sign-in page and required Clerk internal requests remain reachable.
4. Verify a valid user can sign in, refresh, navigate, manage their password, and
   sign out.
5. Verify password recovery is delivered by Clerk without Inbox Triage email code.
6. Verify an uninvited email cannot register or gain an application session.
7. Verify first access creates one local row and repeated/concurrent access does
   not create duplicates.
8. Verify deleting or disabling the Clerk account prevents future authenticated
   access even if the harmless local mapping row remains.
9. Inspect the production client bundle/environment exposure for the absence of
   the Clerk secret. Deferred until production exists.
10. Update this plan to Complete and move its `PROGRESS.md` entry from Planned to
    Completed after local implementation and verification finish.

### Exit criteria

- Automated repository checks pass.
- Authentication is enforced at each protected resource, not only in Proxy or a
  shared layout.
- Restricted onboarding and account recovery work in local development.
  Deployed-environment verification is deferred until production exists.
- The auth package is the documented boundary for application code.
- External Clerk development configuration is reproducible from project
  documentation. Vercel production configuration remains future work.
- `PROGRESS.md` accurately reflects completion status.

## Expected files

### Add

- `packages/auth/package.json`
- `packages/auth/tsconfig.json`
- `packages/auth/src/client.ts`
- `packages/auth/src/server.ts`
- `packages/auth/src/client/*`
- `packages/auth/src/server/*`
- `packages/db/src/schema/timestamps.ts`
- `packages/db/src/schema/users.ts`
- `packages/db/migrations/*`
- `apps/dashboard/src/server/auth.ts`
- `apps/dashboard/src/proxy.ts`
- `apps/dashboard/src/app/sign-in/[[...sign-in]]/page.tsx`
- `apps/dashboard/src/app/account/[[...account]]/page.tsx`
- focused auth tests and test configuration as required
- `docs/plans/clerk-auth-plan.md`

### Modify

- `packages/db/src/schema/index.ts`
- `apps/dashboard/package.json`
- `apps/dashboard/.env.example`
- `apps/dashboard/src/server/env.ts`
- `apps/dashboard/src/app/layout.tsx`
- `apps/dashboard/src/app/page.tsx`
- `apps/dashboard/next.config.ts` if source transpilation configuration is needed
- `eslint.config.mjs`
- `pnpm-lock.yaml`
- `README.md`
- `PROGRESS.md`

Configure the user button to navigate to the dedicated account route rather than
also exposing a duplicate modal profile flow.

## Risks and mitigations

- **A package adds indirection without a stable boundary:** keep only explicit
  client/server exports, prohibit deep imports, and avoid generic provider
  abstractions.
- **Clerk leaks throughout feature code:** centralize SDK imports in
  `@inbox-triage/auth` and keep the dashboard binding in one server-only module.
- **Proxy is mistaken for complete authorization:** require resource-level checks
  in pages, Route Handlers, Server Actions, and data access; test direct requests.
- **A future route is accidentally public:** document private-by-default routing,
  keep the public allowlist small, and add route-level auth tests as protected
  surfaces grow.
- **Restricted mode is misconfigured externally:** maintain a reproducible
  dashboard checklist and verify uninvited signup in development and production.
- **Lazy creation duplicates users under concurrency:** enforce a database unique
  constraint and recover by selecting the winning row.
- **Lazy creation admits a user after accidental public Clerk signup:** treat
  Restricted mode as required production configuration and add a future local
  status/provisioning layer if external configuration alone is no longer an
  acceptable admission boundary.
- **Local and Clerk profile data drift:** do not duplicate profile fields until a
  consumer and synchronization mechanism exist.
- **Clerk deletion leaves an orphaned local row:** rely on Clerk session validation
  to deny access; add signed webhooks later if cleanup or auditing becomes useful.
- **Vercel Preview uses incorrect keys or redirect domains:** configure Preview
  explicitly and test it separately from Production.
- **Secret values enter the client bundle:** validate variable naming, keep server
  imports guarded, and inspect build output/configuration.
- **Clerk availability or pricing changes:** keep application identity references
  on local `users.id` and provider calls behind the auth package boundary.
- **Auth SDK upgrades change Next.js conventions:** pin reviewed compatible
  versions and consult the installed Next.js and Clerk documentation during
  implementation.

## Completion checklist

- [x] `@inbox-triage/auth` exists with narrow client and server entry points.
- [x] Clerk direct imports are contained at the intended boundary.
- [x] The local `users` table and reviewed migration exist.
- [x] `users` establishes the shared `createdAt`/`updatedAt` table convention.
- [x] `requireUser()` validates Clerk and returns one stable local user.
- [x] First-access creation is idempotent and concurrency-safe.
- [x] Email/password is the only enabled authentication strategy.
- [x] Clerk Restricted mode prevents public signup.
- [x] Sign-in, account management, recovery, and sign-out work.
- [x] All users have equal application data access.
- [x] Protected resources enforce auth close to data and actions.
- [x] Local Clerk development configuration is in place and verified.
- [ ] Vercel Preview and Vercel Production Clerk configuration is deferred
      until production exists.
- [x] Formatting, linting, tests, typechecking, migration checks, and build pass.
- [x] `PROGRESS.md` records completion after local implementation and
      verification. Production deployment remains future work.
