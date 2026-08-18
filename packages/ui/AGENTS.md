# Shared UI package

- Preserve the `./components/*` package export used by CLI-generated component
  imports.
- The dashboard shadcn CLI aliases hooks to `@/hooks`, but Sidebar lives in this
  package. Keep `use-mobile` at `src/hooks/use-mobile.ts` and import it as
  `@inbox-triage/ui/hooks/use-mobile`. Do not reintroduce a dashboard-owned hook
  alias in generated UI source. This is a required monorepo compatibility
  deviation from upstream shadcn output.
