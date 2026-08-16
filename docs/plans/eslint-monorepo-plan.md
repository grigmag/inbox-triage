# ESLint Monorepo Setup Plan

## Status

Planned.

## Objective

Establish one authoritative ESLint flat configuration at the repository root that
lints all application and package source without duplicating policy between
workspaces. General JavaScript, TypeScript, React, accessibility, and formatting
compatibility rules will be shared, while Next.js-specific rules will apply only to
`apps/dashboard`.

Linting and TypeScript compilation will remain separate checks:

```text
pnpm lint       -> ESLint diagnostics
pnpm typecheck  -> TypeScript diagnostics
```

## Scope

### In scope

- Add a root ESLint flat configuration.
- Centralize ESLint dependencies in the root manifest.
- Apply common JavaScript and TypeScript rules across the monorepo.
- Apply React Hooks and JSX accessibility rules to React source in the dashboard
  and shared UI package.
- Apply Next.js Core Web Vitals rules only to the dashboard.
- Configure Prettier compatibility without moving formatting into ESLint.
- Replace recursive workspace linting with one root-owned lint command.
- Remove redundant or misleading workspace lint configuration.
- Validate linting against both existing workspaces and representative failure
  cases.

### Out of scope

- Creating a publishable or private `packages/eslint-config` workspace.
- Adding type-aware ESLint rules that require TypeScript project services.
- Adding pre-commit hooks or staged-file linting.
- Changing Prettier formatting rules or adding Tailwind class sorting.
- Refactoring existing source except where required to satisfy the agreed rules.
- Adding Turborepo solely for lint orchestration.

## Proposed architecture

Use a single root `eslint.config.mjs`. The repository is currently small enough
that a separate configuration package would add manifests, exports, and dependency
ownership without improving reuse. The flat config can be extracted into
`packages/eslint-config` later if the repository gains several independently
linted workspaces or another repository needs the same policy.

Central ownership does not mean applying every rule everywhere. Configuration
objects will be scoped by file patterns:

| Configuration layer    | Files                                 | Purpose                                                                            |
| ---------------------- | ------------------------------------- | ---------------------------------------------------------------------------------- |
| Global ignores         | Entire repository                     | Ignore dependencies, build output, generated Next.js files, and coverage output.   |
| JavaScript base        | `**/*.{js,mjs,cjs}`                   | Apply ESLint's recommended JavaScript rules.                                       |
| TypeScript base        | `**/*.{ts,tsx}`                       | Apply recommended TypeScript rules without type-aware project services.            |
| React                  | Dashboard and UI `*.{jsx,tsx}`        | Apply React Hooks and JSX accessibility rules.                                     |
| Next.js                | `apps/dashboard/**/*.{js,jsx,ts,tsx}` | Apply Next.js Core Web Vitals rules with the dashboard root configured explicitly. |
| Prettier compatibility | Entire repository                     | Disable lint rules that conflict with Prettier.                                    |

Each configuration object should have a descriptive `name` so ESLint's config
inspector and diagnostics identify its source clearly.

## Proposed dependencies

Declare the lint toolchain in the root `devDependencies`:

- `@eslint/js`
- `eslint`
- `eslint-config-next`
- `eslint-config-prettier`
- `eslint-plugin-jsx-a11y`
- `eslint-plugin-react-hooks`
- `typescript-eslint`

Use compatible current versions and keep `eslint-config-next` aligned with the
installed Next.js major version. Remove `eslint` and `eslint-config-next` from the
dashboard after the root configuration owns them.

## Phase 1: Add the root flat configuration

### Work

1. Add `eslint.config.mjs` at the repository root using `defineConfig` and
   `globalIgnores` from `eslint/config`.
2. Define global ignores for at least:
   - `node_modules`;
   - `.next`;
   - `dist`, `build`, and `out`;
   - coverage output;
   - generated `next-env.d.ts` files.
3. Apply `@eslint/js` recommended rules to JavaScript configuration and source
   files.
4. Apply `typescript-eslint` recommended rules to TypeScript source without
   enabling type-aware linting.
5. Apply React Hooks and JSX accessibility recommended rules only to React source
   in `apps/dashboard` and `packages/ui`.
6. Apply `eslint-config-next/core-web-vitals` only to dashboard source.
7. Configure the Next.js plugin with `settings.next.rootDir` set to
   `apps/dashboard`.
8. Add `eslint-config-prettier/flat` last so formatting remains Prettier's
   responsibility.
9. Add project-specific rule overrides only when they encode an intentional team
   policy; do not copy generated overrides without reviewing them.

### Exit criteria

- ESLint resolves one root configuration for files in both workspaces.
- UI files receive TypeScript, React Hooks, and accessibility rules without
  receiving Next.js-specific rules.
- Dashboard files receive the common rules and Next.js Core Web Vitals rules.
- Generated and build-output files are ignored.
- ESLint and Prettier do not enforce conflicting formatting rules.

## Phase 2: Consolidate dependency and script ownership

### Work

1. Add the proposed ESLint dependencies to the root manifest.
2. Remove ESLint dependencies from `apps/dashboard/package.json` after the root
   toolchain is working.
3. Change the root lint script to run ESLint once over `apps` and `packages`:

   ```json
   {
     "lint": "eslint apps packages",
     "lint:fix": "eslint apps packages --fix"
   }
   ```

4. Remove the dashboard-local `lint` script if linting is exclusively root-owned.
5. Remove the UI package's `lint: "tsc --noEmit"` script so `lint` no longer
   duplicates `typecheck` or produces a misleading success.
6. Preserve workspace `typecheck` scripts and the root recursive typecheck command.
7. Run `pnpm install` from the root and confirm only the root lockfile changes.

### Exit criteria

- ESLint dependencies have one owner at the repository root.
- `pnpm lint` invokes ESLint once and covers both workspaces.
- `pnpm lint:fix` offers an explicit opt-in fix command.
- `pnpm typecheck` remains an independent TypeScript check.
- No workspace advertises a lint script that actually runs TypeScript instead.

## Phase 3: Remove redundant configuration

### Work

1. Remove `apps/dashboard/eslint.config.mjs` after the root configuration covers
   the dashboard equivalently.
2. Confirm there are no other nested ESLint configuration files that shadow the
   root policy.
3. Keep future workspace-specific exceptions in named, path-scoped objects inside
   the root config rather than introducing ad hoc nested configs.
4. Document the extraction threshold for a future shared configuration package:
   extract only when multiple workspaces require independently consumable presets
   or the policy must be shared across repositories.

### Exit criteria

- There is one ESLint configuration file in the repository.
- Workspace-specific behavior remains visible and explicit in the root config.
- Running ESLint from the repository root does not depend on a workspace-local
  configuration or dependency.

## Phase 4: Validate behavior

### Work

1. Run:

   ```bash
   pnpm lint
   pnpm typecheck
   pnpm format:check
   ```

2. Use `eslint --print-config` or the config inspector on one dashboard file and
   one UI file to verify rule scoping.
3. Temporarily introduce representative violations without committing them:
   - a general TypeScript lint violation in the UI package;
   - a React Hooks violation in React source;
   - a Next.js-specific violation in the dashboard.
4. Confirm each violation is reported in the intended workspace and that the
   Next.js-only violation is not applied to the UI package.
5. Revert the temporary validation changes.
6. Run the production build if any lint-driven source corrections were required.
7. Update `PROGRESS.md` from planned to completed only after all exit criteria pass.

### Exit criteria

- `pnpm lint`, `pnpm typecheck`, and `pnpm format:check` pass.
- Representative failures prove that UI files are genuinely linted.
- Next.js rules are scoped to the dashboard.
- No temporary validation code remains.
- `PROGRESS.md` accurately records the completed work.

## Expected files

### Add

- `eslint.config.mjs`

### Modify

- `package.json`
- `pnpm-lock.yaml`
- `apps/dashboard/package.json`
- `packages/ui/package.json`
- `PROGRESS.md`

### Remove

- `apps/dashboard/eslint.config.mjs`

## Risks and mitigations

- **Framework rules leak into shared packages:** Scope the Next.js configuration to
  `apps/dashboard` and verify both workspaces with `--print-config`.
- **Lint and typecheck become conflated:** Keep ESLint and TypeScript commands
  separate and remove the UI package's duplicate script.
- **Prettier conflicts with stylistic lint rules:** Load
  `eslint-config-prettier/flat` last and leave formatting to Prettier.
- **Root lint misses a new workspace:** Target the stable `apps` and `packages`
  directories rather than enumerating current workspace names.
- **Lint becomes unexpectedly slow:** Begin with non-type-aware TypeScript rules;
  introduce project-service rules only when their value justifies the cost.
- **Generated shadcn source fails rules unexpectedly:** Review violations rather
  than blanket-disabling rules; use a narrow, named override only when generated
  code has a repeatable incompatibility.
- **The root config becomes difficult to maintain:** Keep layers named and ordered;
  extract them into a configuration package only after genuine reuse appears.

## Completion checklist

- [ ] One root ESLint flat configuration covers applications and packages.
- [ ] General TypeScript rules apply to dashboard and UI source.
- [ ] React Hooks and accessibility rules apply to React source.
- [ ] Next.js Core Web Vitals rules apply only to the dashboard.
- [ ] Prettier compatibility is configured last.
- [ ] ESLint dependencies are owned at the root.
- [ ] Root linting runs once across `apps` and `packages`.
- [ ] Lint and typecheck remain separate checks.
- [ ] Nested redundant ESLint configuration is removed.
- [ ] Representative failure checks prove the intended rule coverage.
- [ ] Lint, typecheck, and formatting validation pass.
- [ ] `PROGRESS.md` records completion only after validation.
