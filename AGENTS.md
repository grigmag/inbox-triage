## Stack

- Next.js 16, React 19, TypeScript, and Tailwind CSS 4.
- Use pnpm for dependencies, the lockfile, and package scripts.

## Guidelines

- Use Conventional Commits for commit messages.
- Prefer one primary utility per file with a colocated test; group related helpers when clearer.
- Use kebab-case for file and directory names, including React component files; use PascalCase for component and export identifiers. Preserve Next.js reserved filenames such as `page.tsx` and `layout.tsx`.
- Prefer named exports over default exports.
- Avoid changing product APIs only to make tests easier. Prefer mocks and fake timers in tests.
- Include `createdAt` and `updatedAt` lifecycle timestamps on application-owned database tables by default. Document intentional exceptions.
- When adding a required environment variable, also add a placeholder for it on the CI Build step in `.github/workflows/ci.yml`. `next build` evaluates server modules and needs those values; CI should not use real secrets or a live database.

## Project documents

- PROGRESS.md records completed implementation work. Consult it to determine what has already been delivered, and update it when completing a planned slice of work.
- docs/plans contains the detailed implementation plans for each feature (*-plan.md files).
- When creating a plan in `docs/plans/`, update `PROGRESS.md` in the same change. Record it as planned, not completed.

## shadcn component workflow

- Run shadcn CLI commands from `apps/dashboard`, using an explicit registry.
- Preview component updates with `--dry-run` and `--diff` before applying them.
- Review all generated source; do not accept CLI output blindly.
- For public UI components, update named exports in `packages/ui/src/index.ts`.
- After changes, run `pnpm typecheck`, `pnpm lint`, and `pnpm build` from the repository root.
- Confirm dependency changes affect only the root `pnpm-lock.yaml` and do not introduce duplicate or mismatched React versions.

## Git workflow

- Never skip Git hooks (e.g. with `--no-verify` or `HUSKY=0`) unless the user explicitly asks. If a hook fails, fix the cause and create a new commit.
- Never commit or push directly to `main` branch.
- Never use gh command directly to interact with github, use the available tooling you have.
- When asked to create a new branch, use the following format: `<type>/<kebab-case-description>`, e.g. `feat/new-feature`, `fix/bug-fix`, etc.
- When asked to open a pull request:
  - open a draft PR by default, unless instructed otherwise.
  - PR title should follow the Conventional Commits format: `<type>(<optional-scope>): <summary>`.
  - add concise description.
- Never merge PRs yourself.
- Never modify GitHub branch protection, repository settings, secrets, CI
  permissions, or production credentials.
