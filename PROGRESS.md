# Progress

## Completed

- [x] [Set up ESLint for the monorepo](docs/plans/eslint-monorepo-plan.md)
      — one root flat configuration for applications and packages, with Next.js
      rules scoped to the dashboard. ESLint ownership lives at the repository
      root, the nested dashboard config is gone, and representative checks
      confirmed coverage.

- [x] [Set up shadcn/ui as a shared monorepo package](docs/plans/shadcn-ui-monorepo-plan.md)
      — create `@inbox-triage/ui`, route shadcn CLI output across the dashboard and shared
      package, centralize Tailwind theme ownership, and support root and subpath imports.
