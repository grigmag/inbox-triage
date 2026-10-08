## Project notes

- The project started as a rewrite of an older application. Its purpose is to help a small creative studio manage client emails and project briefs.
- A secondary purpose is to serve as a good example and reusable template for a production-ready Next.js monorepo.
- When product requirements and template reusability conflict, prioritize the production application. Tell the user when making that tradeoff and identify the reusability that is being deferred or omitted.

## Stack

- This is a pnpm workspace monorepo. Use pnpm for dependency management, lockfile changes, and package scripts. Read the root and workspace package manifests for exact supported versions.
- The application uses the Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui, Clerk, PostgreSQL, and Drizzle ORM.

## Guidelines

- Use Conventional Commits for commit messages.
- Prefer one primary utility per file with a colocated test; group related helpers when clearer.
- Use kebab-case for file and directory names, including React component files; use PascalCase for component and export identifiers. Preserve Next.js reserved filenames such as `page.tsx` and `layout.tsx`.
- Prefer named exports over default exports.
- Write TODO line comments as `// TODO ...`, without a colon after `TODO`.
- Avoid changing product APIs only to make tests easier. Prefer mocks and fake timers in tests.
- Test complex or load-bearing behavior whose regression would be costly. Do not add component or UI-copy tests merely to restate rendered markup; human review owns visual presentation and wording unless a feature has a stronger reason for automation.
- Include `createdAt` and `updatedAt` lifecycle timestamps on application-owned database tables by default. Document intentional exceptions.
- When adding a required environment variable, also add a placeholder for it on the CI Build step in `.github/workflows/ci.yml`. `next build` evaluates server modules and needs those values; CI should not use real secrets or a live database.
- Keep `packages/ui/src/components` limited to reusable shadcn registry components so the `ui` package can be reused by other projects with different design systems. Put product-specific component compositions, styling, and behavior in `apps/dashboard` or an appropriate feature package. Avoid modifying generated shadcn components except for required compatibility fixes, and document any such deviations.

## Project documents

- `PROGRESS.md` tracks features under Planned, In progress, and Completed. Consult it before implementation and update it as work advances. Keep one entry per feature: move it to In progress when implementation starts and include a brief note on what is implemented. Move it to Completed and check it off only when the whole feature is complete. Record individual slice completion in the feature plan, never as separate completed entries in `PROGRESS.md`.
- `docs/plans` contains the detailed implementation plans for each feature (`*-plan.md` files). Follow the relevant plan when implementing a feature.
- Do not read plans for features listed as Completed in `PROGRESS.md`, unless the user asks. They are historical records and may be outdated; use the code, `docs/application-conventions.md`, and the specs instead.
- When creating a plan in `docs/plans/`, update `PROGRESS.md` in the same change. Record it as planned, not completed.
- `docs/rewrite-specs` contains specifications that define and describe the intended product behavior, based on the legacy application. Use them as input when creating or refining plans, but do not treat them as immutable. During implementation, the relevant plan is the primary execution guide.
- `docs/application-conventions.md` records durable, cross-cutting application behavior that future features should follow. Where a skill conflicts with it, follow the conventions.
- `docs/user-guides` contains end-user setup guides written for non-technical readers. When a change alters a flow a guide describes, update the guide in the same change so it matches shipped behavior.

## Database workflow

- After schema changes, run `pnpm db:generate` and `pnpm db:check` as needed. Review generated SQL before committing.
- Never run `pnpm db:migrate` unless the user explicitly asks. Applying migrations mutates a database and is a manual step.
- Database rollback and migration-ledger repair are operator-only procedures. Agents may prepare or review instructions, but must never execute rollback SQL, drop database objects, reset database volumes, or modify `drizzle.__drizzle_migrations`; hand execution to the user.

## shadcn component workflow

- Run shadcn CLI commands from `apps/dashboard`, using an explicit registry.
- Preview component updates with `--dry-run` and `--diff` before applying them.
- Inspect the generated diff before keeping it. Reconcile package imports and aliases, preserve documented monorepo compatibility deviations, update public exports, and confirm that only intended dependencies and files changed.
- For public UI components, update named exports in `packages/ui/src/index.ts`.
- After changes, run `pnpm typecheck` and `pnpm lint` from the repository root. Do not run `pnpm build` unless explicitly instructed.
- Confirm dependency changes affect only the root `pnpm-lock.yaml` and do not introduce duplicate or mismatched React versions.

## Git workflow

- Leave changes unstaged. Stage files only when the user explicitly asks.
- Never skip Git hooks (e.g. with `--no-verify` or `HUSKY=0`) unless the user explicitly asks. If a hook fails, fix the cause and create a new commit.
- Before committing or pushing, verify the current branch. Never commit or push directly to `main`.
- Never use gh command directly to interact with github, use the available tooling you have.
- When asked to create a new branch, use the following format: `<type>/<kebab-case-description>`, e.g. `feat/new-feature`, `fix/bug-fix`, etc.
- When asked to open a pull request:
  - open a draft PR by default, unless instructed otherwise.
  - PR title should follow the Conventional Commits format: `<type>(<optional-scope>): <summary>`.
  - add concise description.
- Never merge PRs yourself.
- Never modify GitHub branch protection, repository settings, secrets, CI
  permissions, or production credentials.
