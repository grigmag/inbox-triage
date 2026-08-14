## Stack

- Next.js 16, React 19, TypeScript, and Tailwind CSS 4.
- Use pnpm for dependencies, the lockfile, and package scripts.

## Guidelines

- Use Conventional Commits for commit messages.
- Prefer one primary utility per file with a colocated test; group related helpers when clearer.
- Use kebab-case for file and directory names, including React component files; use PascalCase for component and export identifiers. Preserve Next.js reserved filenames such as `page.tsx` and `layout.tsx`.
- Prefer named exports over default exports.
- Avoid changing product APIs only to make tests easier. Prefer mocks and fake timers in tests.

## Project documents

- PROGRESS.md records completed implementation work. Consult it to determine what has already been delivered, and update it when completing a planned slice of work.
- docs/plans contains the detailed implementation plans for each feature (*-plan.md files).
- When creating a plan in `docs/plans/`, update `PROGRESS.md` in the same change. Record it as planned, not completed.
