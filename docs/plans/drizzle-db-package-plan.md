# Drizzle Database Package Plan

## Status

Complete.

## Objective

Add a private, source-based `@inbox-triage/db` workspace package that owns the
PostgreSQL Drizzle schema, migration artifacts, Drizzle Kit configuration, and
database-related types. The dashboard will continue to own runtime configuration
and will create its database instance by passing a validated `DATABASE_URL` to
the package:

```text
apps/dashboard environment -> createDb(databaseUrl) -> configured Drizzle client
```

The first slice establishes the database boundary and tooling without inventing
an application schema or adding query, repository, service, or dependency
injection abstractions.

## Agreed decisions

- Create `packages/db` as the private `@inbox-triage/db` workspace package.
- Export TypeScript source directly and let Next.js transpile the package.
- Support PostgreSQL 17 locally and assume Neon as the likely initial hosted
  database without committing to a deployment provider.
- Use Postgres.js as the initial runtime driver and keep the adapter behind a
  `createDb(databaseUrl)` factory.
- Target the Next.js Node.js runtime initially. Revisit the driver before using
  an Edge runtime; a future Neon HTTP implementation should preserve the factory
  boundary where practical.
- Keep `DATABASE_URL` and all other secrets owned by `apps/dashboard`.
- Add a server-only dashboard environment module that validates
  `DATABASE_URL` without introducing a general-purpose validation dependency.
- Let `drizzle.config.ts` use `@next/env` to load the dashboard's `.env*` files
  for local Drizzle Kit commands. An already-defined process environment value
  takes precedence for CI and remote environments.
- Instantiate and export the configured database from
  `apps/dashboard/src/server/db.ts`.
- Expose only `@inbox-triage/db/client` and `@inbox-triage/db/schema`; do not add a
  package-root export.
- Add `db:generate`, `db:migrate`, `db:check`, and `db:studio` commands. Do not
  add `db:push` to the normal workflow.
- Do not create a table, generated migration, seed, or automatic migration step
  in this slice.
- Database integration and migration application remain manual for now.

## Scope

### In scope

- Add the private `@inbox-triage/db` workspace package and its TypeScript
  configuration.
- Add Drizzle ORM, Drizzle Kit, Postgres.js, and the environment-loading tooling
  needed by the package.
- Add an empty schema barrel organized for future table and relation modules.
- Add the migration output location without creating a fabricated initial
  migration.
- Add `drizzle.config.ts` for the PostgreSQL dialect, package schema, and package
  migration directory.
- Add `createDb(databaseUrl)` and its inferred database type.
- Add intentional package export-map entries for the client and schema.
- Add dashboard-owned environment validation and database initialization.
- Configure Next.js to transpile `@inbox-triage/db`.
- Add root convenience scripts that forward database commands to the DB
  workspace.
- Validate package boundaries, source transpilation, formatting, linting,
  typechecking, and the production build without connecting to a database.
- Update `PROGRESS.md` after implementation and verification are complete.

### Out of scope

- Defining application tables, enums, relations, indexes, or inferred row types.
- Generating an empty or placeholder SQL migration.
- Applying migrations to local PostgreSQL, Neon, or any other database.
- Starting or modifying the Docker Compose PostgreSQL service.
- Adding seeds, fixtures, reset commands, or destructive schema commands.
- Running migrations during application startup or deployment.
- Adding a repository, service, unit-of-work, or dependency injection layer.
- Moving business logic or application-specific queries into `@inbox-triage/db`.
- Supporting Edge runtimes or adding the Neon HTTP/WebSocket driver in this
  slice.
- Adding a test framework solely for the database factory.

## Proposed architecture

### Package layout

```text
packages/db/
├── migrations/
├── src/
│   ├── client.ts
│   └── schema/
│       └── index.ts
├── drizzle.config.ts
├── package.json
└── tsconfig.json

apps/dashboard/src/server/
├── db.ts
└── env.ts
```

Keep the schema as a directory from the beginning. Future schema modules can be
grouped by domain or table and re-exported from `src/schema/index.ts`; no empty
`types.ts`, relation module, or domain directory should be created before it has
real contents.

Because Git does not track empty directories, retain the migration output
directory with a minimal placeholder until Drizzle generates the first committed
migration. Remove the placeholder when real migration artifacts exist.

### Runtime factory

`src/client.ts` will create a fresh Postgres.js client for the supplied URL and
pass the complete schema namespace to Drizzle:

```ts
export function createDb(databaseUrl: string) {
  const client = postgres(databaseUrl);

  return drizzle(client, { schema });
}

export type Db = ReturnType<typeof createDb>;
```

The package must not read `process.env`, import dashboard code, or export a
configured singleton. Keeping construction behind this function allows the app
to own configuration and leaves room to change the underlying driver after the
deployment runtime is known.

Postgres.js is appropriate for the initial Node.js runtime because it can connect
to both the existing local PostgreSQL service and Neon through standard
PostgreSQL connection strings. Before adopting Neon pooling or an Edge runtime,
review connection-string choice, prepared-statement behavior, transaction needs,
and whether the driver should change to `neon-http` or `neon-serverless`.

### Intentional exports

The package export map will expose only:

| Import                 | Contents                                      |
| ---------------------- | --------------------------------------------- |
| `@inbox-triage/db/client` | `createDb` and the inferred `Db` type         |
| `@inbox-triage/db/schema` | Public schema objects and their related types |

Do not export `drizzle.config.ts`, migrations, internal driver helpers, or a
catch-all package root. Application queries will import the configured `db` from
the dashboard module and import schema objects only when a query requires them.

### Environment ownership

Runtime and tooling have separate configuration paths:

```text
Next.js runtime:
apps/dashboard/.env* -> apps/dashboard/src/server/env.ts
                     -> apps/dashboard/src/server/db.ts
                     -> createDb(env.DATABASE_URL)

Drizzle Kit:
apps/dashboard/.env* -> @next/env in packages/db/drizzle.config.ts
                     -> dbCredentials.url
```

`apps/dashboard/src/server/env.ts` will import `server-only`, read
`process.env.DATABASE_URL`, fail with an actionable error when it is absent, and
export a typed `env` object. This provides one app-owned validation boundary
without adding a schema-validation library for a single variable.

Drizzle Kit runs outside the Next.js runtime, so `drizzle.config.ts` will resolve
the dashboard directory relative to its own file and call `loadEnvConfig` from
`@next/env`. This gives local commands the same `.env*` loading behavior as the
dashboard without requiring developers to export the URL for every command.
Values already present in `process.env` remain authoritative for CI or remote
migration jobs. The config will fail clearly if no URL is available after loading
the environment.

The environment-loading dependency is tooling-only. Runtime package source must
remain independent of both `@next/env` and the dashboard file layout.

### Dashboard database instance

`apps/dashboard/src/server/db.ts` will import `server-only`, obtain the validated
URL from the app environment module, call `createDb`, and export `db` for server
application code.

Use an app-owned development cache if required to prevent Next.js hot reloads
from repeatedly constructing Postgres.js clients. The cache must live in the
dashboard rather than `@inbox-triage/db`, must not read configuration inside the DB
package, and must not change the public factory API. Production should continue
to rely on normal module initialization.

Client Components must never import the dashboard DB module or the DB package's
client entry point. The `server-only` marker provides an explicit guard at the
application boundary.

### Drizzle Kit workflow

Configure Drizzle Kit with:

- `dialect: 'postgresql'`;
- the package schema barrel or schema glob as its schema source;
- `packages/db/migrations` as its output;
- `DATABASE_URL` loaded through the dashboard environment for commands that
  connect to a database.

The command workflow will be:

```text
edit schema -> pnpm db:generate -> review and commit SQL -> pnpm db:check
                                                |
                                                +-> pnpm db:migrate (manual)
```

`db:studio` is an opt-in local inspection tool. Excluding `db:push` keeps
generated, reviewed, committed migrations as the intended schema-change path.

No migration is generated in this slice. The generate command becomes useful
after the first real schema object exists.

## Proposed dependencies

Declare runtime dependencies in `packages/db`:

- `drizzle-orm`;
- `postgres`.

Declare development dependencies in `packages/db`:

- `@next/env` for Drizzle Kit's app-owned environment loading;
- `drizzle-kit` for schema generation, checks, migrations, and Studio;
- `typescript` for the package typecheck.

Add `@inbox-triage/db` and the `server-only` marker package to the dashboard as
runtime dependencies. Use compatible current versions, install with pnpm from
the repository root, and confirm only the root `pnpm-lock.yaml` changes. Do not
install a Neon-specific driver until the runtime decision requires it.

## Phase 1: Create the source-based DB package

### Work

1. Add `packages/db/package.json` with the name `@inbox-triage/db`, `private: true`,
   ESM package semantics, and no build script.
2. Add explicit `./client` and `./schema` source exports; omit a `.` export and
   broad wildcard exports.
3. Add a strict, no-emit TypeScript configuration aligned with the other source
   packages in the monorepo.
4. Add the package `typecheck` script and the four agreed Drizzle Kit scripts.
5. Install the proposed runtime and development dependencies through pnpm.
6. Confirm dependency resolution changes only the root lockfile and does not
   duplicate unrelated framework dependencies.

### Exit criteria

- pnpm recognizes `@inbox-triage/db` as a private workspace.
- The package exports TypeScript directly and has no compiled output directory.
- Only the two intentional subpath imports resolve.
- The package typechecks through the root recursive typecheck command.

## Phase 2: Add the schema, client, and migration configuration

### Work

1. Add `src/schema/index.ts` as an empty schema barrel without placeholder tables
   or speculative domain types.
2. Add `src/client.ts` with `createDb(databaseUrl)` using Postgres.js and
   `drizzle-orm/postgres-js`.
3. Pass the full schema namespace to Drizzle so relational schema metadata is
   available automatically as real schema modules are added.
4. Export the factory and an inferred `Db` type from the client entry point.
5. Add the package migration output location without generating SQL.
6. Add `drizzle.config.ts` with PostgreSQL dialect, schema, output directory, and
   database credentials.
7. Load dashboard `.env*` files through `@next/env` using a path resolved relative
   to the config file, not the caller's current working directory.
8. Preserve an existing `process.env.DATABASE_URL` and throw an actionable error
   if no URL exists after environment loading.

### Exit criteria

- The factory accepts configuration only through its argument.
- No runtime source in `@inbox-triage/db` reads environment variables.
- The empty schema is accepted by TypeScript and is ready for future exports.
- Drizzle Kit resolves its config consistently when invoked through root or
  workspace scripts.
- Local tooling automatically sees dashboard env files, while an injected
  process variable can override them.
- No application table or migration has been invented.

## Phase 3: Integrate the dashboard

### Work

1. Add `@inbox-triage/db` as a workspace dependency of the dashboard.
2. Add `@inbox-triage/db` to `transpilePackages` alongside `@inbox-triage/ui` in the
   dashboard's Next.js configuration.
3. Add `src/server/env.ts` with `server-only`, focused `DATABASE_URL` validation,
   and a typed `env` export.
4. Add `src/server/db.ts` with `server-only` and the app-owned configured DB
   export.
5. Ensure development hot reload cannot accumulate unnecessary Postgres.js
   clients; keep any development cache app-owned and production-safe.
6. Do not add a sample page query or otherwise connect during build merely to
   demonstrate the integration.

### Exit criteria

- Dashboard server code can import one configured `db` instance.
- Database credentials remain owned and validated by the dashboard.
- Client-side imports of the configured DB module are rejected.
- The source-based package is transpiled by Next.js.
- The integration performs no query or migration as a side effect of import.

## Phase 4: Add command orchestration and documentation

### Work

1. Add package scripts for `db:generate`, `db:migrate`, `db:check`, and
   `db:studio`.
2. Add matching root convenience scripts that forward to `@inbox-triage/db`, so
   developers do not need to remember pnpm filter syntax.
3. Confirm the Drizzle config automatically loads the dashboard environment for
   all four commands.
4. Document the schema-change workflow, migration review expectation, local
   environment source, CI override behavior, and intentional omission of
   `db:push`.
5. Document that migration application is manual and is not part of application
   startup or this slice's automated validation.

### Exit criteria

- Each database command can be launched from the repository root.
- Local commands do not require manually exporting `DATABASE_URL` when it exists
  in a supported dashboard env file.
- CI and remote commands can inject `DATABASE_URL` without changing files.
- The intended generate-review-check-migrate workflow is discoverable.

## Phase 5: Validate without database side effects

### Work

1. Run dependency and workspace inspection to confirm the new package and its
   direct dependencies resolve from the intended manifests.
2. Run:

   ```bash
   pnpm typecheck
   pnpm lint
   pnpm format:check
   pnpm build
   ```

3. Verify both public subpath imports resolve in the dashboard and that an
   unlisted package-root or internal import does not become part of the public
   API.
4. Verify Drizzle Kit can load its configuration and recognize the empty schema
   layout without starting Studio or applying a migration.
5. Verify missing `DATABASE_URL` produces an actionable configuration error in a
   controlled check without modifying the developer's env files.
6. Confirm no test or build step opens a database connection, changes the local
   PostgreSQL service, or writes a migration.
7. Review the lockfile to ensure only the root lockfile changed and no duplicate
   or mismatched React versions were introduced.
8. Update `PROGRESS.md` from planned to completed only after all applicable exit
   criteria pass.

### Exit criteria

- Typecheck, lint, formatting, and production build pass.
- Next.js successfully transpiles the package's TypeScript source.
- Drizzle configuration and package exports behave as designed.
- Validation has no database or migration side effects.
- `PROGRESS.md` accurately reflects implementation status.

## Expected files

### Add

- `packages/db/package.json`
- `packages/db/tsconfig.json`
- `packages/db/drizzle.config.ts`
- `packages/db/src/client.ts`
- `packages/db/src/schema/index.ts`
- `packages/db/migrations/.gitkeep`
- `apps/dashboard/src/server/env.ts`
- `apps/dashboard/src/server/db.ts`
- `docs/plans/drizzle-db-package-plan.md`

### Modify

- `package.json`
- `pnpm-lock.yaml`
- `apps/dashboard/package.json`
- `apps/dashboard/next.config.ts`
- `PROGRESS.md`

## Risks and mitigations

- **Deployment runtime remains undecided:** Start with Postgres.js on Node.js and
  isolate it behind `createDb`; reassess before adopting Edge-specific code.
- **Local Drizzle commands and Next.js load different env values:** Use
  `@next/env` with the dashboard directory so both follow the same file-loading
  rules.
- **Tooling silently targets the wrong database:** Preserve explicitly injected
  values, fail when the URL is absent, and document which dashboard env file is
  loaded. Continue requiring manual review before migration application.
- **Hot reload creates excess clients:** Keep any development singleton cache in
  `apps/dashboard/src/server/db.ts`; never turn the package factory into a global
  singleton.
- **A source package leaks into client bundles:** Mark app environment and DB
  modules as server-only and avoid importing the client entry point from Client
  Components.
- **The empty schema encourages placeholder modeling:** Export an empty barrel and
  defer all table and row types until a real domain requirement exists.
- **An empty migration is mistaken for meaningful history:** Configure and track
  the output location but generate nothing until the first schema change.
- **Public API grows accidentally:** Use an explicit export map without a root or
  wildcard export.
- **Migration application becomes an application side effect:** Keep migration
  commands manual and do not import migrators from runtime application code.
- **Neon pooling behaves differently from local PostgreSQL:** Revisit pooled
  connection strings, prepared statements, and transaction requirements when the
  hosted environment is selected.

## Completion checklist

- [x] `@inbox-triage/db` exists as a private source-based workspace package.
- [x] Only `@inbox-triage/db/client` and `@inbox-triage/db/schema` are public.
- [x] `createDb(databaseUrl)` uses Postgres.js without reading runtime env state.
- [x] The empty schema layout and migration output location are ready for real
      schema work.
- [x] Drizzle Kit automatically loads dashboard env files through `@next/env`.
- [x] The dashboard validates `DATABASE_URL` in a server-only env module.
- [x] The dashboard owns its configured DB instance and development lifecycle.
- [x] Next.js transpiles the DB package's TypeScript source.
- [x] Generate, migrate, check, and Studio commands are available from the root.
- [x] No table, seed, empty migration, `db:push`, or repository abstraction is
      added.
- [x] No automated validation connects to or changes a database.
- [x] Typecheck, lint, formatting, and production build pass.
- [x] `PROGRESS.md` records completion only after implementation is verified.
