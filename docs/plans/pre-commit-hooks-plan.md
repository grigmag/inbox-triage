# Pre-commit Hooks Plan

## Status

Complete.

## Objective

Add repository-owned Git hooks that provide fast, consistent feedback before a
commit is created:

```text
pre-commit -> format and lint staged files -> typecheck the whole monorepo
commit-msg -> validate the commit message against Conventional Commits
```

The hook toolchain and policy will live at the repository root because Git has
one hooks directory for the entire repository and the existing Prettier, ESLint,
and typecheck entry points are already root-owned.

## Agreed decisions

- Defer Vitest and related-test execution until the repository has an intentional
  test setup, test scripts, and tests to run.
- Run the existing root `pnpm typecheck` on every commit. This recursively checks
  every workspace that provides a `typecheck` script and catches failures across
  workspace boundaries.
- Automatically format and lint-fix matching staged files before committing.
- Reject ESLint warnings as well as errors.
- Add a `commit-msg` hook so the repository's Conventional Commits guideline is
  enforced locally.
- Keep CI workflow changes out of this slice. Local hooks provide early feedback
  but remain bypassable and are not a substitute for CI enforcement.

## Scope

### In scope

- Add Husky and lint-staged as root development dependencies.
- Install Git hooks through the root package's `prepare` lifecycle script.
- Add one root lint-staged configuration covering files anywhere under `apps`,
  `packages`, and the repository root.
- Run Prettier and ESLint only against matching staged files.
- Run the existing whole-repository typecheck after staged-file checks succeed.
- Add commitlint and its Conventional Commits configuration at the root.
- Reject invalid commit messages through a `commit-msg` hook.
- Verify hook installation, staged-file mutation, failure behavior, partial
  staging safety, monorepo coverage, and commit-message validation.
- Document the hooks and update `PROGRESS.md` after implementation is complete.

### Out of scope

- Adding Vitest, test configuration, test scripts, or tests.
- Running related tests from the pre-commit hook.
- Adding or changing CI workflows.
- Adding a pre-push hook.
- Introducing Turborepo or another affected-workspace task orchestrator.
- Customizing Conventional Commit types or scopes beyond the standard
  `@commitlint/config-conventional` policy.
- Preventing deliberate use of `git commit --no-verify` or `HUSKY=0`.

## Proposed architecture

### Root ownership

Install and configure all hook tooling in the root package:

- Husky owns the checked-in `.husky/` hook entry points.
- lint-staged receives staged paths from the entire Git repository and invokes
  the existing root-owned Prettier and ESLint installations.
- The root `pnpm typecheck` remains the authoritative monorepo typecheck command.
- commitlint validates messages once for the repository; commit conventions do
  not vary by workspace.

Do not add per-workspace Husky installations or lint-staged configurations. The
current workspaces share the same formatting and lint policy, so nested configs
would duplicate policy and can cause a file to use only its nearest config rather
than inheriting the root config.

### Configuration files

Use explicit root configuration files rather than expanding `package.json` with
tool policy:

- `lint-staged.config.mjs` for staged-file patterns and ordered tasks;
- `commitlint.config.mjs` extending `@commitlint/config-conventional`.

The dedicated files keep package metadata concise, make each policy easy to find,
and allow future path-aware logic without relocating the configuration.

### Hook sequence

The `pre-commit` hook will execute the equivalent of:

```sh
pnpm exec lint-staged --concurrent false && pnpm typecheck
```

The explicit fail-fast relationship is required: typechecking must run only if
lint-staged succeeds, and neither command's failure may be hidden by a later
successful command.

The `commit-msg` hook will pass Git's commit-message file to commitlint using a
quoted positional argument:

```sh
pnpm exec commitlint --edit "$1"
```

Keep hook files POSIX-compatible so they work across supported developer
environments.

### Staged-file policy

Configure lint-staged with non-overlapping source and document/config patterns:

| Staged file type                          | Ordered action                                           |
| ----------------------------------------- | -------------------------------------------------------- |
| `*.{js,jsx,mjs,cjs,ts,tsx}`               | `prettier --write`, then `eslint --fix --max-warnings=0` |
| `*.{json,jsonc,md,mdx,css,scss,yml,yaml}` | `prettier --write`                                       |

lint-staged will supply only matched staged paths to these commands and update the
Git index with successful formatter and linter changes. Prettier will continue to
honor `.prettierignore`, including the existing `pnpm-lock.yaml` exclusion.

Use `--concurrent false` to keep matching groups deterministic and avoid future
write races if patterns evolve. Tasks within each pattern remain explicitly
ordered.

### Typechecking policy

Always invoke the root `pnpm typecheck` after lint-staged, including for commits
that contain only documentation or configuration changes. This favors a simple,
predictable invariant while the repository is small:

```text
every normal commit -> every workspace typechecks
```

Revisit affected-workspace typechecking only if measured hook duration becomes a
regular source of friction. Any optimization must preserve dependency-aware
checks—for example, a shared UI change must still validate dashboard consumers.

### Test policy

Do not install Vitest merely to reproduce the reference setup. Add related-test
execution in a later testing slice after the repository defines:

- which workspaces own tests and Vitest configuration;
- root and workspace test scripts;
- how cross-workspace dependencies affect related-test selection;
- acceptable hook runtime and fallback behavior for changes to shared config.

## Proposed dependencies

Add compatible current versions to the root `devDependencies` using pnpm:

- `husky`;
- `lint-staged`;
- `@commitlint/cli`;
- `@commitlint/config-conventional`.

Keep all four dependencies out of workspace manifests. Run installation from the
repository root and confirm that only the root `pnpm-lock.yaml` is updated.

## Phase 1: Establish root hook ownership

### Work

1. Install the proposed development dependencies from the repository root.
2. Add `"prepare": "husky"` to the root scripts without changing workspace
   package scripts.
3. Initialize Husky at the repository root so `.husky/` is associated with the
   repository's existing `.git` directory.
4. Review generated files and retain only the intentional hook setup; do not
   accept placeholder commands from initialization.
5. Run the prepare script directly and verify Git's hooks path points to Husky's
   managed directory.

### Exit criteria

- Hook dependencies have one owner in the root manifest.
- A root `pnpm install` or `pnpm prepare` installs the checked-in hooks.
- No package has its own `.husky` directory or hook dependencies.
- Only the root lockfile changes.

## Phase 2: Add staged formatting and linting

### Work

1. Add `lint-staged.config.mjs` at the repository root.
2. Define one source-code pattern that runs Prettier before ESLint so ESLint sees
   the final formatted source.
3. Define one document/config pattern that runs Prettier.
4. Include JavaScript and JSX extensions even though most current source is
   TypeScript, because the root ESLint configuration supports repository config
   files and future JavaScript source.
5. Configure ESLint fixes with `--max-warnings=0` so warnings block commits.
6. Add `.husky/pre-commit` with lint-staged followed by the root typecheck, using
   fail-fast shell semantics.
7. Do not add Vitest commands or placeholder test steps.

### Exit criteria

- Only matching staged files are passed to Prettier and ESLint.
- Successful formatter and safe ESLint fixes are reflected in the staged content.
- A lint-staged failure prevents typechecking and aborts the commit.
- A typecheck failure aborts the commit after staged-file checks pass.
- Files in both `apps/dashboard` and `packages/ui` use the same root policy.

## Phase 3: Enforce Conventional Commit messages

### Work

1. Add `commitlint.config.mjs` extending
   `@commitlint/config-conventional` without project-specific overrides.
2. Add `.husky/commit-msg` and pass its quoted message-file argument to
   commitlint.
3. Confirm standard Conventional Commit forms work, including optional scopes
   and breaking-change syntax.
4. Rely on commitlint's standard handling for generated merge, revert, and
   version messages rather than adding ad hoc exceptions.
5. Document that local hooks can be bypassed and that authoritative enforcement
   would require a future CI check.

### Exit criteria

- A valid message such as `chore: verify git hooks` succeeds.
- A valid scoped message such as `feat(ui): add component` succeeds.
- An invalid type or malformed header fails with an actionable diagnostic.
- Merge and revert workflows retain commitlint's standard behavior.

## Phase 4: Validate behavior and safety

### Work

1. Run the normal repository checks:

   ```bash
   pnpm format:check
   pnpm lint
   pnpm typecheck
   pnpm build
   ```

2. Verify successful staged formatting with a deliberately misformatted file in
   the repository root and one workspace; confirm only staged matching content is
   committed.
3. Verify an auto-fixed source file is re-staged by lint-staged.
4. Verify representative failure paths without retaining temporary changes:
   - an unfixable ESLint error;
   - an ESLint warning;
   - a TypeScript error;
   - an invalid commit message.
5. Verify partially staged files retain their unstaged changes when lint-staged
   succeeds and when a task fails.
6. Verify a documentation-only commit runs formatting and the whole-repo
   typecheck but does not invoke ESLint.
7. Verify a commit with no lint-staged matches still runs the whole-repo
   typecheck.
8. Run `pnpm prepare` from a clean hook state and confirm the checked-in hook
   definitions are installed reproducibly.
9. Remove all temporary validation changes and confirm the worktree contains only
   the intended implementation.
10. Update this plan to complete and move its `PROGRESS.md` entry from planned to
    completed only after every exit criterion passes.

### Exit criteria

- Root formatting, linting, typechecking, and build checks pass.
- Hook success and failure paths behave as designed.
- Partial staging does not lose or accidentally include unstaged work.
- Both workspaces and root-level files are covered.
- Valid commit messages pass and invalid messages fail.
- No temporary test commits or validation changes remain.

## Expected files

### Add

- `.husky/pre-commit`
- `.husky/commit-msg`
- `lint-staged.config.mjs`
- `commitlint.config.mjs`
- `docs/plans/pre-commit-hooks-plan.md`

### Modify

- `package.json`
- `pnpm-lock.yaml`
- `PROGRESS.md`

No workspace manifest is expected to change.

## Risks and mitigations

- **Hooks appear installed but are not active:** use the root `prepare` script,
  inspect Git's hooks path, and test both hooks through real temporary commits.
- **A failed first command is masked by a successful later command:** use explicit
  fail-fast semantics between lint-staged and typecheck.
- **Formatters alter unstaged work in partially staged files:** keep lint-staged's
  default backup and restoration behavior and validate both success and failure
  cases before completion.
- **Overlapping patterns mutate the same source concurrently:** use non-overlapping
  file groups, ordered task arrays, and `--concurrent false`.
- **Monorepo files resolve the wrong config or binary:** keep one root config and
  execute the hook from the Git root using root-owned dependencies.
- **Whole-repo typechecking makes commits slow:** measure actual hook duration;
  optimize only after it becomes material and preserve dependency-aware checks.
- **GUI Git clients cannot find pnpm or Node:** document Husky's supported startup
  configuration if this occurs rather than embedding machine-specific version
  manager paths in repository hooks.
- **Production-only dependency installation cannot run `prepare`:** this repository
  is private and the hooks are development tooling; if a deployment installs
  production dependencies while running lifecycle scripts, add a CI-aware Husky
  installer in a follow-up based on the deployment environment.
- **Developers assume hooks are authoritative:** document `--no-verify` and
  `HUSKY=0` bypasses and leave CI enforcement as an explicit future decision.
- **Commitlint rejects an intentional project convention:** start with the standard
  preset and add overrides only after a concrete convention is agreed and tested.

## Completion checklist

- [x] Husky, lint-staged, and commitlint are root-owned dependencies.
- [x] The root `prepare` script installs Husky hooks reproducibly.
- [x] One root lint-staged config covers root files and every workspace.
- [x] Staged source is formatted, lint-fixed, and rejected on warnings.
- [x] Staged documents and configuration files are formatted.
- [x] `pnpm-lock.yaml` remains excluded from Prettier.
- [x] The whole monorepo typechecks after staged-file tasks succeed.
- [x] Vitest and related tests remain deferred.
- [x] Conventional Commit messages are enforced through `commit-msg`.
- [x] Hook commands use fail-fast and POSIX-compatible syntax.
- [x] Partial staging is validated without data loss or accidental inclusion.
- [x] Success and representative failure cases are verified in both workspaces.
- [x] Formatting, linting, typechecking, and build checks pass.
- [x] Documentation describes behavior, bypasses, and deferred CI enforcement.
- [x] `PROGRESS.md` records completion only after all exit criteria pass.
