# Authenticated Application Shell Plan

## Status

Complete.

Local implementation, automated checks, and interactive verification are done.
Full UI testing infrastructure remains in `FUTURE_WORK.md`.

## Objective

Replace the dashboard scaffold with a stable authenticated InboxTriage application
shell and five truthful placeholder routes:

```text
Clerk-protected route group
  -> shared shadcn Sidebar and content frame
  -> shared page shell and page header
  -> route-specific empty state
```

The shell will establish the navigation, responsive layout, metadata, loading,
error, confirmation, status, and toast conventions that later business features
reuse. This slice will not add business data, database work, fake records, or
feature mutations.

## Agreed decisions

- Use **InboxTriage** as the visible application name and in document titles.
- Keep `/sign-in` outside the authenticated shell.
- Move the existing `/account` route into the authenticated route group without
  changing its URL so account management shares the application frame.
- Preserve Clerk's supported account behavior by placing the existing
  `@inbox-triage/auth` `UserButton` in the sidebar footer. Do not build a second
  profile adapter, duplicate Clerk profile data, or require separately rendered
  name and email fields for this slice.
- Continue using the existing Clerk proxy and `requireUser()` boundary. Do not
  introduce roles, permissions, organizations, or another auth abstraction.
- Use the configured shadcn **Base UI / Nova** preset, Lucide icons, Tailwind 4,
  and existing semantic theme tokens.
- Use the current shadcn Base UI `toast` registry component rather than the
  legacy `sonner` item. `sonner` would introduce both Sonner and `next-themes`,
  while interactive theme switching is intentionally deferred. The application
  still gets one toaster and one notification convention.
- Do not introduce React Testing Library, a browser DOM environment,
  accessibility test tooling, or Playwright in this PR. Add only focused tests
  that fit the existing Node-based Vitest setup; record full UI testing as future
  work.

## Deliberate adaptations

The production application takes priority over reproducing every suggested
implementation detail:

- The sidebar user area delegates avatar fallback, account actions, and sign-out
  behavior to Clerk's existing `UserButton`. InboxTriage will not reconstruct
  Clerk's menu merely to render profile text alongside it.
- The configured Base UI toast primitive replaces Sonner while preserving the
  requested product behavior and avoiding a second theme/provider dependency.
- Component, responsive, keyboard, automated accessibility, and end-to-end tests
  are deferred with the user's approval. This PR will use pure unit tests and
  manual verification for the interactive UI. The deferred test stack will be a
  general repository capability rather than shell-specific test scaffolding.
- Next.js 16.3 calls the route error recovery callback `retry()`, not `reset`.
  Use the installed framework contract.

These choices defer some template-level testing completeness and exact visual
profile composition, but keep the authenticated product shell within the
project's established Clerk and shadcn boundaries.

## Scope

### In scope

- Create an authenticated App Router route group without changing public URLs.
- Add the shared sidebar shell, skip link, main content target, and responsive
  sidebar trigger.
- Add typed navigation for Dashboard, Clients, New Inquiry, Delivery Timeline,
  and Agreements in the specified order.
- Add the five routes with common page composition and truthful empty states.
- Move the existing account page into the protected group and render it within
  the shell.
- Add reusable dashboard-level page shell, page header, empty state, inline
  error, destructive confirmation, status badge, and loading skeleton
  compositions.
- Add route-group loading and unexpected-error boundaries.
- Mount one toast provider at the authenticated application root.
- Replace scaffold metadata with InboxTriage title conventions.
- Add the required shadcn registry components to the reusable UI package and
  export their public APIs.
- Add focused Node-based unit tests for route classification, navigation URLs,
  and active-route matching.
- Manually verify interactive, responsive, auth, and accessibility behavior that
  the current automated stack cannot exercise.
- Run all repository quality gates and update progress after implementation.

### Out of scope

- Business workflows, queries, mutations, schemas, migrations, or fake records.
- Additional navigation destinations or a mobile bottom navigation.
- Custom Clerk profile/account/sign-out UI or duplicated Clerk profile fields.
- A new logo asset; the sidebar uses the InboxTriage text name as its brand and
  fallback.
- Roles, permissions, teams, invitations, or settings.
- Theme switching, a new preset, new typography, or bespoke shell colors.
- A second toast system or theme provider.
- Full UI component testing, browser automation, visual regression testing, and
  automated accessibility testing.
- Changes related to the absent PR-sequence document from the source repository.

## Proposed architecture

### Route ownership

Keep the root layout responsible for the HTML document, global styles,
`AuthProvider`, fonts, and application-wide metadata defaults. Place the private
application beneath one route group:

```text
apps/dashboard/src/app/
├── layout.tsx
├── sign-in/[[...sign-in]]/page.tsx
└── (app)/
    ├── layout.tsx
    ├── loading.tsx
    ├── error.tsx
    ├── page.tsx
    ├── account/[[...account]]/page.tsx
    ├── clients/page.tsx
    ├── inquiries/new/page.tsx
    ├── timeline/page.tsx
    └── agreements/page.tsx
```

The group name is organizational and must not enter any URL. Preserve the
private-by-default proxy policy. The `(app)` layout calls `requireUser()` before
rendering the shell, and protected pages that access authenticated or future
business resources continue to enforce `requireUser()` at that resource
boundary. Moving `/account` must preserve its existing direct protection.

Because a segment's `loading.tsx` does not wrap its sibling layout, initial auth
validation may complete before the shell renders. After the authenticated layout
is mounted, navigation loading and error states render inside the persistent
shell as intended.

### Component and package boundaries

Keep generated, reusable registry primitives in
`packages/ui/src/components`. Add them from `apps/dashboard` with the explicit
`@shadcn` registry, previewing `--dry-run` and `--diff` before application.
Review generated Base UI source and update named exports in
`packages/ui/src/index.ts`.

Expected direct registry items are:

- `sidebar`;
- `breadcrumb`;
- `skeleton`;
- `empty`;
- `alert`;
- `alert-dialog`;
- `badge`;
- `toast`.

Allow the CLI to add reviewed transitive primitives such as Sheet, Separator,
Tooltip, or input/button dependencies. Do not install Avatar or Dropdown Menu
solely for the sidebar footer because Clerk already owns that interaction.

The reviewed dry run currently creates `src/hooks/use-mobile.ts` in the
dashboard even though the generated Sidebar lives in `packages/ui`. Treat that
as a required monorepo compatibility fix: place the reusable hook at
`packages/ui/src/hooks/use-mobile.ts` and update Sidebar to import it through
`@inbox-triage/ui/hooks/use-mobile`. The UI package must not depend backward on a
dashboard alias. The same dry run proposes overwriting the existing Button;
inspect its per-file diff and preserve local changes instead of accepting an
unreviewed overwrite.

Put InboxTriage compositions and behavior in `apps/dashboard/src/components`:

```text
components/
├── app-sidebar.tsx
├── confirm-action-dialog.tsx
├── empty-state.tsx
├── inline-error.tsx
├── page-header.tsx
├── page-loading-skeleton.tsx
├── page-shell.tsx
├── route-placeholder.tsx
└── status-badge.tsx
```

The exact split may be adjusted during implementation to keep one primary
utility per file and avoid empty abstractions. Do not move product composition
into `@inbox-triage/ui` merely to make it reusable.

### Server and client boundaries

Keep static pages, `PageShell`, `PageHeader`, route placeholders, and the shell's
server composition as Server Components. Limit `"use client"` to the pieces
that need it:

- pathname-aware navigation and closing the mobile sidebar;
- the existing Clerk `UserButton` wrapper;
- the route error boundary and its retry action;
- destructive confirmation state;
- toast provider/manager behavior inherited from the registry component.

Do not turn the entire authenticated layout into a Client Component. Pass only
serializable data across server/client boundaries.

### Navigation contract

Define the five entries once in typed dashboard configuration. Each entry owns
its label, URL, Lucide icon component, and active matching policy. Render the
same data through shadcn `SidebarMenu` primitives.

Active matching rules are:

| Entry             | Active paths                                   |
| ----------------- | ---------------------------------------------- |
| Dashboard         | `/` only                                       |
| Clients           | `/clients` and `/clients/...`                  |
| New Inquiry       | `/inquiries/new` and `/inquiries/new/...` only |
| Delivery Timeline | `/timeline` and `/timeline/...`                |
| Agreements        | `/agreements` and `/agreements/...`            |

Implement matching in a pure helper with segment-safe exact/prefix checks so
`/clientship` does not activate Clients. Apply `isActive` to
`SidebarMenuButton`, add `aria-current="page"` to the active link, and mark icons
decorative. On navigation selection, close the mobile off-canvas state through
the Sidebar context without collapsing the persistent desktop sidebar.

The sidebar header shows a text link labeled `InboxTriage`. The footer embeds the
existing Clerk `UserButton`, preserving its navigation to `/account`, account
management, and sign-out behavior without a parallel dashboard-owned menu.

### Application shell and accessibility

Compose the authenticated layout with `SidebarProvider`, `AppSidebar`, and
`SidebarInset` using the installed component's default dimensions and
off-canvas behavior. Do not transplant prototype widths or colors.

The shell will:

- keep the desktop sidebar visible while the content region scrolls;
- expose `SidebarTrigger` in a compact content header for small viewports;
- render a keyboard-visible skip link targeting a stable `main-content` ID;
- use a semantic `<main>` region that can receive programmatic focus;
- prevent horizontal overflow and allow page header actions to wrap;
- mount exactly one authenticated toast provider;
- rely on existing semantic background, foreground, sidebar, border, and focus
  tokens;
- add no custom page transitions or entrance animation.

Use `prefers-reduced-motion` behavior already supplied by the primitives and do
not add motion that needs a new override.

### Page composition and metadata

`PageShell` owns responsive gutters, vertical spacing, and width. Its public
width option supports `standard`, `wide`, and `full`; `standard` caps content at
approximately 1200 px and is the default.

`PageHeader` accepts a title, optional description, optional breadcrumb items,
and an optional action slot. It renders exactly one visible `h1`; actions sit
opposite the title at larger widths and wrap beneath it when space is limited.
Use one current-page breadcrumb for non-root placeholders and omit breadcrumbs
from Dashboard.

Replace the scaffold metadata with a root title template equivalent to
`%s | InboxTriage` and a `InboxTriage` default. Each protected page exports static
metadata using its specified page title. Give sign-in and account management
truthful titles without placing sign-in inside the shell.

Each priority page composes `PageShell`, `PageHeader`, and `RoutePlaceholder`
with the approved copy:

| Route            | Page title        | Empty-state title               |
| ---------------- | ----------------- | ------------------------------- |
| `/`              | Dashboard         | No dashboard data yet           |
| `/clients`       | Clients           | No clients yet                  |
| `/inquiries/new` | New Inquiry       | Inquiry creation is coming next |
| `/timeline`      | Delivery Timeline | No delivery timelines yet       |
| `/agreements`    | Agreements        | No agreements yet               |

Use the complete supplied descriptions and no enabled actions. Use conventional
Lucide icons as decorative empty-state media; do not add illustrations or mock
content.

### Shared state conventions

#### Loading

Add one route-group `loading.tsx` using `PageLoadingSkeleton`. Compose shadcn
`Skeleton` blocks that approximate one page header and one content surface,
remain hidden from assistive technology as decorative placeholders, and avoid a
large layout shift. Do not use a spinner for initial page loading.

#### Empty state

Build `EmptyState` around the complete shadcn Empty composition. Require a title
and description, accept optional icon/illustration media and optional primary and
secondary action slots, and keep its API domain-neutral. `RoutePlaceholder`
specializes it only by pairing the five route messages with appropriate icons.

#### Unexpected and inline errors

Add `(app)/error.tsx` as the required Client Component. Log the received error
with `console.error` because no external reporting integration exists, render a
plain message through the common page composition, and call Next.js 16.3's
`retry()` callback from a `Try again` button. Never display the raw error message,
stack, or digest.

Build `InlineError` around destructive shadcn `Alert`, with required title and
description and an optional retry action. Blocking/recoverable errors remain in
context rather than being represented only by a toast.

#### Destructive confirmation

Build `ConfirmActionDialog` around the complete Base UI-backed Alert Dialog
composition, retaining its title and description primitives. Require explicit
action/cancel labels and an async-or-sync confirm callback; accept either a
normal trigger slot or controlled `open`/`onOpenChange` props for programmatic
use.

Use the destructive action treatment, let the cancel control receive initial
focus through the installed primitive's supported focus API, and keep the dialog
open while confirmation is pending. Pending state disables both actions,
prevents escape/outside dismissal races, and ensures one invocation. Do not add
a fake destructive action to a placeholder route.

#### Status badges

Expose `StatusBadge({ tone, children })` with the stable tones `neutral`, `info`,
`warning`, `success`, and `destructive`. Centralize the mapping from these tones
to the configured Badge variants rather than exposing raw classes to consumers.
Use only supported variants and semantic theme tokens. Visible status text is
required, so meaning never depends on color alone; domain enum mappings remain
owned by later features.

#### Toasts

Install and mount one shadcn Base UI `Toaster` in the authenticated layout and
export/use its registry manager rather than inventing an application notification
bus. Establish the convention that completed mutations use specific action-led
success messages and brief non-blocking failures may use error toasts. A toast is
never the only destructive confirmation or blocking validation message.

## Implementation phases

### Phase 1: Add and review shared shadcn primitives

#### Work

1. From `apps/dashboard`, refresh shadcn project info and confirm Base UI,
   base-nova, Lucide, RSC, aliases, and installed components.
2. Inspect installed component files before adding anything.
3. Preview every required `@shadcn` registry addition with `--dry-run` and
   `--diff`; review the dependency/file list before applying it.
4. Add only the required direct items and their CLI-resolved dependencies.
5. Relocate the generated responsive hook from the dashboard destination to
   `packages/ui/src/hooks/use-mobile.ts` and fix Sidebar's import. Document this
   as the required compatibility deviation from generated source.
6. Review the proposed Button overwrite with its per-file diff and merge only
   actual upstream compatibility changes; never use an unreviewed overwrite.
7. Review all generated source for Base UI `render` APIs, accessible titles,
   grouped menu items, icon imports, and monorepo aliases.
8. Add named public exports to `packages/ui/src/index.ts` while preserving the
   wildcard component subpath export.
9. Confirm dependency changes affect the intended workspace and only the root
   lockfile; reject duplicate or mismatched React versions.

#### Exit criteria

- All required primitives exist in `@inbox-triage/ui` and compile with the current
  Base UI preset.
- The Sidebar imports its responsive hook from `@inbox-triage/ui`; no shared source
  imports a dashboard-owned alias.
- No generated component is modified except for the documented hook/import fix
  or a reviewed Button compatibility merge.
- No product-specific shell code enters `packages/ui`.
- Sonner and `next-themes` are not introduced by this slice.

### Phase 2: Establish route grouping, metadata, and shell frame

#### Work

1. Replace create-next-app metadata with InboxTriage defaults and a page-title
   template.
2. Create `(app)/layout.tsx`, enforce `requireUser()`, and compose the Sidebar
   provider, sidebar, inset, skip link, main target, trigger, and toaster.
3. Move the root page and account route into `(app)` without changing their URLs;
   keep sign-in outside the group.
4. Replace the account page's temporary `Back to home` header with normal shell
   composition while preserving the existing Clerk `UserProfile` route and
   direct `requireUser()` protection.
5. Add typed navigation data and the segment-safe active-match helper.
6. Implement the pathname-aware sidebar with exact item order, active semantics,
   mobile close-on-selection behavior, InboxTriage text brand, and Clerk
   `UserButton` footer.
7. Keep client boundaries limited to active/mobile interaction and existing auth
   UI.

#### Exit criteria

- `/sign-in` renders without the application shell.
- `/`, `/account`, and later protected routes render inside one shell for an
  authenticated user and remain blocked for an unauthenticated request.
- Desktop and mobile sidebar behavior comes from the configured primitive.
- The footer preserves Clerk's existing account and sign-out behavior.
- All document titles use InboxTriage rather than create-next-app branding.

### Phase 3: Add common page and feedback compositions

#### Work

1. Implement `PageShell` with standard, wide, and full width options.
2. Implement `PageHeader` with breadcrumbs, title, description, and wrapping
   actions.
3. Implement domain-neutral `EmptyState` and placeholder specialization.
4. Implement `PageLoadingSkeleton` and the route-group loading boundary.
5. Implement the route error boundary and domain-neutral `InlineError`.
6. Implement the controlled/uncontrolled destructive confirmation composition
   with safe pending behavior.
7. Implement semantic `StatusBadge` tones over supported Badge variants.
8. Document the toast usage convention through the authenticated provider and
   component/API naming; do not add fake toast triggers to production pages.

#### Exit criteria

- Later pages can reuse each composition without importing a business domain.
- Overlay structure and focus behavior use the installed Base UI APIs.
- Loading, errors, badges, and confirmation do not depend on raw colors or
  custom animation.
- No demonstration-only controls appear on production routes.

### Phase 4: Add the five placeholder routes

#### Work

1. Add Clients, New Inquiry, Delivery Timeline, and Agreements pages and replace
   the root scaffold with Dashboard.
2. Export static page metadata for every route.
3. Compose every route through the same page shell, page header, and empty-state
   convention.
4. Apply the approved titles and descriptions without actions or fabricated
   records.
5. Confirm every route is present once and is reachable through centralized
   navigation.

#### Exit criteria

- All five URLs render the correct page title and empty-state copy.
- Each route contains exactly one visible `h1`.
- New Inquiry is active only for its creation-flow path, not all inquiries.
- No route introduces business behavior, data access, or fake metrics.

### Phase 5: Verify within the existing test boundary

#### Automated work

1. Add colocated Node/Vitest tests for navigation entry order, labels, URLs, and
   the exact/prefix active matching matrix, including false-positive paths.
2. Extend the public-path policy tests to show that each priority path and
   `/account` is private while `/sign-in` remains public.
3. Test any non-visual status-tone mapping helper if it exists naturally; do not
   change a product API solely to make this possible.
4. Run:

   ```bash
   pnpm format:check
   pnpm lint
   pnpm test
   pnpm typecheck
   pnpm build
   ```

#### Manual work

1. Verify authenticated and unauthenticated direct requests, safe sign-in return,
   account management, and sign-out.
2. Visit all five routes and `/account`; verify labels, metadata, empty copy,
   active navigation, and shell persistence.
3. At desktop widths, verify the sidebar remains visible, content scrolls, the
   standard width cap is consistent, and horizontal overflow is absent.
4. At a small viewport, open the off-canvas sidebar, navigate to every route,
   confirm it closes after selection, and check page-header wrapping.
5. Keyboard-check the skip link, sidebar trigger, navigation, Clerk user button,
   account flow, error retry, and an isolated development rendering of the
   destructive dialog.
6. Verify cancel receives initial focus, pending confirmation cannot repeat or
   dismiss, and visible focus is retained.
7. Inspect light and existing dark token rendering for the shell, statuses,
   errors, dialog, and toast provider without adding a theme switcher.
8. Update this plan to Complete and move its `PROGRESS.md` entry from Planned to
   Completed only when implementation and verification finish.

#### Exit criteria

- Existing automated repository checks pass.
- Pure navigation and route-protection policy have regression coverage.
- The agreed manual checks cover interactive requirements deferred from
  automation.
- `PROGRESS.md` accurately reflects implementation status.

## Expected files

### Add

- `docs/plans/authenticated-app-shell-plan.md`
- `packages/ui/src/components/{sidebar,breadcrumb,skeleton,empty,alert,alert-dialog,badge,toast}.tsx`
- additional CLI-resolved shared primitive files as required
- `packages/ui/src/hooks/use-mobile.ts`
- `apps/dashboard/src/app/(app)/layout.tsx`
- `apps/dashboard/src/app/(app)/loading.tsx`
- `apps/dashboard/src/app/(app)/error.tsx`
- `apps/dashboard/src/app/(app)/page.tsx`
- `apps/dashboard/src/app/(app)/clients/page.tsx`
- `apps/dashboard/src/app/(app)/inquiries/new/page.tsx`
- `apps/dashboard/src/app/(app)/timeline/page.tsx`
- `apps/dashboard/src/app/(app)/agreements/page.tsx`
- `apps/dashboard/src/app/(app)/account/[[...account]]/page.tsx`
- `apps/dashboard/src/components/*` shell and shared state compositions
- `apps/dashboard/src/config/navigation.ts`
- `apps/dashboard/src/config/navigation.test.ts`

### Move or remove

- move `apps/dashboard/src/app/page.tsx` into the authenticated route group and
  replace its scaffold content
- move `apps/dashboard/src/app/account/[[...account]]/page.tsx` into the group
  without changing the URL

### Modify

- `apps/dashboard/src/app/layout.tsx`
- `apps/dashboard/src/server/is-public-path.test.ts`
- `apps/dashboard/package.json` if CLI-resolved component dependencies require it
- `packages/ui/package.json`
- `packages/ui/src/index.ts`
- `pnpm-lock.yaml`
- `FUTURE_WORK.md`
- `PROGRESS.md`

The implementation may adjust exact generated dependency files after reviewing
the CLI dry run. It must not create duplicate versions of these files or add
application components to the UI registry directory.

## Risks and mitigations

- **The shell weakens the auth boundary:** preserve proxy protection, validate the
  route group with `requireUser()`, and keep resource-level checks where protected
  data or Clerk account UI is accessed.
- **A broad client boundary increases hydration work:** isolate pathname, mobile,
  dialog, toast, and Clerk interactions; keep static composition on the server.
- **Navigation matching activates lookalike paths:** use segment-aware matching
  and table-driven unit tests.
- **Mobile navigation stays open after selection:** close only the Sidebar's
  mobile state in the link-selection handler and verify all routes manually.
- **Generated shadcn code conflicts with monorepo aliases or Base UI APIs:** use
  the dashboard CLI configuration, relocate the responsive hook into the UI
  package, inspect the Button overwrite, and review every generated source file
  before accepting it.
- **Legacy Sonner introduces a theme dependency:** use the configured Base UI
  toast registry item and mount exactly one provider.
- **Status tones become a second color system:** keep mappings inside the
  application composition and use supported Badge variants plus semantic tokens.
- **Pending confirmation fires twice or closes early:** centralize pending state,
  disable both actions, suppress dismissal while pending, and manually exercise
  rapid activation and Escape/outside interaction.
- **UI regressions escape the Node-only test suite:** complete the manual matrix
  for this PR and prioritize the general UI testing task recorded in
  `FUTURE_WORK.md`.

## Completion checklist

- [x] Required shadcn primitives are reviewed, installed, and exported.
- [x] InboxTriage metadata replaces scaffold branding.
- [x] The private route group owns the shared application shell.
- [x] Sign-in remains outside the shell and account management remains protected.
- [x] Centralized navigation has correct order, destinations, and active rules.
- [x] Desktop and small-viewport navigation work without horizontal overflow.
- [x] Page shell, header, loading, empty, error, confirmation, badge, and toast
      conventions exist at the correct package boundary.
- [x] All five placeholder routes render truthful copy and no fake actions/data.
- [x] Clerk's existing user button retains account and sign-out behavior.
- [x] Pure navigation and route privacy tests pass in the existing Vitest setup.
- [x] Deferred full UI testing is recorded in `FUTURE_WORK.md`.
- [x] Formatting, linting, tests, typechecking, and production build pass.
- [x] `PROGRESS.md` records completion only after implementation verification.
