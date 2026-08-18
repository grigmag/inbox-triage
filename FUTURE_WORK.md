# Future Work

## Add full UI testing infrastructure

Introduce one intentional browser-capable testing strategy for reusable React
components and complete application flows. This should be a repository-level
capability rather than ad hoc test dependencies added by individual features.

- [ ] Choose and document ownership for component tests and end-to-end tests
      across the dashboard and shared UI package.
- [ ] Add React Testing Library, `user-event`, and a supported Vitest DOM
      environment for component behavior.
- [ ] Add automated accessibility assertions with a maintained axe integration.
- [ ] Add Playwright for authenticated routing, responsive shell behavior,
      keyboard interaction, and critical business workflows.
- [ ] Define a safe Clerk test strategy for local and CI runs without committing
      credentials or weakening production route protection.
- [ ] Add deterministic viewport, reduced-motion, and theme coverage where those
      states affect behavior.
- [ ] Integrate the suites into root scripts and CI with clear fast-test and
      browser-test entry points.
- [ ] Backfill UI coverage for the authenticated application shell, including
      active navigation, mobile sidebar dismissal, Clerk user-menu integration,
      loading and error states, destructive confirmation pending behavior,
      status badges, and toast rendering.

### Acceptance criteria

- Component tests render React under a documented DOM environment and support
  realistic user interaction.
- Automated accessibility checks cover shared interactive compositions while
  manual assistive-technology checks remain documented where appropriate.
- Browser tests verify unauthenticated and authenticated navigation using a safe,
  reproducible Clerk test setup.
- Responsive and keyboard-critical shell behavior has regression coverage.
- Root and CI commands run the intended suites without requiring production
  secrets or a live production database.

## Configure Clerk production and Vercel environments

Local Clerk authentication is complete. When production exists:

- [ ] Create and configure a Clerk production instance with email/password only
      and Restricted mode.
- [ ] Add production keys to Vercel's Production environment.
- [ ] Configure Preview environment behavior and authorized domains.
- [ ] Deploy a preview, test the full flow, then verify production independently.
- [ ] Record the production Clerk/Vercel checklist in the project README.
- [ ] Inspect the production client bundle for the absence of the Clerk secret.

### Acceptance criteria

- Public signup is unavailable in the Clerk production instance.
- Only invited or manually created accounts can sign in.
- Preview and Production use the intended Clerk instance and URLs.
- Secrets remain absent from source, logs, and client bundles.

## Add interactive theme switching with `next-themes`

- [ ] Add `next-themes` to `apps/dashboard` as a dashboard-level dependency.
- [ ] Create a client-side theme provider and wrap the dashboard application
      with it from the root layout.
- [ ] Configure class-based theme switching to match the shared shadcn theme's
      `.dark` variant and support light, dark, and system preferences.
- [ ] Add an accessible theme switcher using the shared UI components.
- [ ] Preserve the existing Geist font variables and shared semantic color
      tokens; do not introduce a second global theme stylesheet.
- [ ] Handle hydration and initial-theme behavior without a visible flash or
      hydration warning.

### Acceptance criteria

- Theme preference persists across dashboard visits.
- Light and dark semantic tokens render correctly in the dashboard and shared
  UI components.
- System preference is supported and can be overridden by the user.
- The implementation passes typecheck, lint, and production build validation.
