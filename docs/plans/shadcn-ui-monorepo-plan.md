# shadcn/ui Monorepo Setup Plan

## Status

Planned.

## Objective

Add shadcn/ui to the existing pnpm monorepo through a private shared package named
`@inbox-triage/ui`. Shared UI primitives, hooks, utilities, design tokens, and global
styles will live in `packages/ui`, while dashboard-specific compositions will remain
in `apps/dashboard`.

Dashboard code will support concise root imports:

```tsx
import { Button } from '@inbox-triage/ui';
```

The package will retain subpath exports such as
`@inbox-triage/ui/components/button` because shadcn's CLI uses those paths when it
generates or composes components.

## Scope

### In scope

- Consolidate pnpm workspace ownership at the repository root.
- Create and configure `packages/ui`.
- Configure shadcn's monorepo-aware aliases in both participating workspaces.
- Move the Tailwind CSS 4 entrypoint and shadcn theme tokens into the UI package.
- Integrate the source package with the Next.js dashboard.
- Provide root barrel exports in addition to shadcn-compatible subpath exports.
- Install one small component as an end-to-end routing and compilation check.
- Document the workflow for adding future shared components and app-level blocks.

### Out of scope

- Building product-specific screens or a complete dashboard design system.
- Adding Turborepo solely for this integration.
- Publishing `@inbox-triage/ui` to a registry.
- Migrating unrelated dashboard code.
- Installing a broad component set before individual components are needed.

## Proposed defaults

Unless changed before implementation, use:

- Package name: `@inbox-triage/ui`
- Primitive base: Base UI
- Style: Nova (`base-nova` in `components.json`)
- Base color: Neutral
- Icon library: Lucide
- TypeScript: enabled
- React Server Components: enabled
- Theme values: CSS variables
- Tailwind CSS: version 4 with no Tailwind configuration file
- Component layout: flat `packages/ui/src/components`

The primitive base, style, base color, icon library, and CSS-variable choice must be
confirmed before generating components. Changing these after components have been
customized may require regeneration and manual merging.

## Target structure

```text
apps/
└── dashboard/
    ├── components.json
    └── src/
        ├── app/
        ├── components/
        ├── hooks/
        └── lib/
packages/
└── ui/
    ├── components.json
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── components/
        ├── hooks/
        ├── lib/
        │   └── utils.ts
        ├── styles/
        │   └── globals.css
        └── index.ts
```

## Alias and ownership model

The aliases in `components.json` are CLI installation and import-routing targets.
They do not replace the package's `exports` configuration.

| Registry file category | Dashboard target | UI-package target |
| --- | --- | --- |
| `ui` | `@inbox-triage/ui/components` | `@inbox-triage/ui/components` |
| `components` | `@/components` | `@inbox-triage/ui/components` |
| `hooks` | `@/hooks` | `@inbox-triage/ui/hooks` |
| `lib` | `@/lib` | `@inbox-triage/ui/lib` |
| `utils` | `@inbox-triage/ui/lib/utils` | `@inbox-triage/ui/lib/utils` |

This means a registry block added from the dashboard can place shared primitives in
`packages/ui` and keep its app-specific composition in `apps/dashboard`.

## Phase 1: Normalize the pnpm workspace

### Work

1. Confirm Node 24 is active, matching `.nvmrc` and the root engine constraint.
2. Add the exact `packageManager` value to the root `package.json`.
3. Remove `apps/dashboard/pnpm-workspace.yaml` and
   `apps/dashboard/pnpm-lock.yaml` so the repository has one workspace definition
   and one lockfile.
4. Remove the dashboard-level `packageManager` field after the root owns it.
5. Run `pnpm install` from the repository root and review the lockfile changes.
6. Confirm `pnpm list -r --depth -1` recognizes the root and dashboard workspaces.

### Exit criteria

- There is one `pnpm-workspace.yaml` and one `pnpm-lock.yaml`.
- Root-level pnpm commands discover `@inbox-triage/dashboard`.
- Installation completes under Node 24 without an engine warning.

## Phase 2: Scaffold the shared UI package

### Work

1. Create `packages/ui/package.json` with:
   - package name `@inbox-triage/ui`;
   - `private: true` and `type: module`;
   - `lint` and `typecheck` scripts;
   - a root export for `src/index.ts`;
   - explicit exports for global CSS, components, hooks, and libraries.
2. Create `packages/ui/tsconfig.json` for strict, no-emit, bundler-based React
   TypeScript compilation.
3. Map `@inbox-triage/ui/*` to `./src/*` inside the package.
4. Create the component, hook, library, and style source directories.
5. Add the dashboard dependency on `@inbox-triage/ui` using `workspace:*`.
6. Keep React and React DOM versions aligned across the app and UI package.

### Planned package exports

```json
{
  "exports": {
    ".": "./src/index.ts",
    "./globals.css": "./src/styles/globals.css",
    "./components/*": "./src/components/*.tsx",
    "./hooks/*": "./src/hooks/*.ts",
    "./lib/*": "./src/lib/*.ts"
  }
}
```

### Exit criteria

- pnpm resolves `@inbox-triage/ui` as a workspace dependency.
- TypeScript can resolve both the root package and exported subpaths.
- The package has no build-output requirement; Next.js consumes its source files.

## Phase 3: Establish the shadcn configuration and theme

### Work

1. Confirm the proposed shadcn defaults before generating files.
2. Use the current shadcn CLI through `pnpm dlx shadcn@latest`.
3. Do not run `init --monorepo` in the repository because that command scaffolds a
   new monorepo. Generate or inspect a disposable reference scaffold if the current
   preset output is needed.
4. Add `components.json` to `apps/dashboard` with local aliases for app-level
   components, hooks, and libraries, and shared aliases for UI primitives and
   `utils`.
5. Add `components.json` to `packages/ui` with all generated UI-package file types
   routed into `@inbox-triage/ui`.
6. Keep `style`, `rsc`, `tsx`, `baseColor`, `cssVariables`, `iconLibrary`, RTL,
   menu-color, and menu-accent settings identical across both files.
7. Leave `tailwind.config` empty for Tailwind CSS 4.
8. Set the dashboard CSS path to
   `../../packages/ui/src/styles/globals.css` and the package CSS path to
   `src/styles/globals.css`.
9. Create the UI package's generated Tailwind entrypoint containing:
   - `tailwindcss`, `tw-animate-css`, and `shadcn/tailwind.css` imports;
   - the class-based dark-mode variant;
   - Tailwind `@source` directives covering the UI package and applications;
   - the selected semantic design tokens and base layer.
10. Add the generated `cn` utility under `packages/ui/src/lib/utils.ts`.
11. Ensure shadcn-owned dependencies are declared in `packages/ui`, not in the
    dashboard unless dashboard-local code imports them directly.

### Exit criteria

- Both `components.json` files resolve to the intended destinations.
- The selected preset and aliases match across the two workspaces.
- There is one authoritative shadcn/Tailwind theme stylesheet.
- `pnpm dlx shadcn@latest info --json` reports the expected monorepo paths when run
  from the dashboard.

## Phase 4: Integrate the UI package with Next.js

### Work

1. Add `@inbox-triage/ui/*` to the dashboard TypeScript paths while retaining the
   existing `@/*` alias.
2. Add `@inbox-triage/ui` to `transpilePackages` in
   `apps/dashboard/next.config.ts`.
3. Import `@inbox-triage/ui/globals.css` from the dashboard root layout.
4. Refactor the existing dashboard global stylesheet so it contains only
   app-specific overrides, or remove it if nothing remains.
5. Ensure Tailwind is imported only once and that the shared stylesheet scans both
   app and package source files.
6. Preserve the existing Geist font variables and connect them to the shared theme.
7. Decide whether to add `next-themes` now:
   - add it with a dashboard-local provider if class-based theme switching is part
     of this slice; or
   - defer interactive theme switching while retaining the generated dark tokens.

### Exit criteria

- Next.js compiles source components from `@inbox-triage/ui`.
- Shared semantic tokens work in dashboard files and UI-package files.
- There is no duplicate Tailwind entrypoint or conflicting global token definition.

## Phase 5: Add the public root import API

### Work

1. Create `packages/ui/src/index.ts` using named exports only.
2. Re-export the public API of each installed shared component.
3. Retain subpath exports for CLI-generated imports and explicit imports.
4. Treat the barrel as a curated public API rather than automatically exporting
   every internal helper.
5. Update the barrel whenever a newly installed component should be available from
   `@inbox-triage/ui`.
6. Document both supported forms:

```tsx
import { Button } from '@inbox-triage/ui';
import { Button } from '@inbox-triage/ui/components/button';
```

Application code should generally use the shorter root import. Generated shadcn
source may continue using subpath imports.

### Exit criteria

- `import { Button } from '@inbox-triage/ui'` type-checks and renders.
- The equivalent component subpath remains resolvable.
- The root barrel contains named exports and does not export global CSS.

## Phase 6: Prove CLI routing with one component

### Work

1. From `apps/dashboard`, preview a Button installation:

   ```bash
   pnpm dlx shadcn@latest add @shadcn/button --dry-run
   ```

2. Verify that the preview targets `packages/ui/src/components/button.tsx`, the UI
   package utility and stylesheet, and the UI package dependencies.
3. If any path points into the wrong workspace, correct aliases before writing.
4. Add the Button from the explicit `@shadcn` registry after the dry run is correct.
5. Read every generated or modified file and verify imports, primitive APIs, icon
   imports, semantic styling, and React Server Component directives.
6. Export `Button` and any intended companion exports from `src/index.ts`.
7. Render the component in a minimal dashboard location to verify the root import,
   styling, and server/client boundary.

### Exit criteria

- The CLI installs the primitive under `packages/ui`, not under the dashboard.
- Both root and subpath imports resolve.
- The component renders with the shared theme.
- The generated files have been reviewed rather than accepted blindly.

## Phase 7: Validate and document the workflow

### Work

1. Run from the repository root:

   ```bash
   pnpm typecheck
   pnpm lint
   pnpm build
   ```

2. Confirm the production build includes styles used by both app and package source.
3. Confirm that only the root lockfile changes when components add dependencies.
4. Check for duplicate React installations or version mismatches.
5. Document the ongoing component workflow:
   - run shadcn commands from the consuming app;
   - specify the registry explicitly;
   - preview updates with `--dry-run` and `--diff`;
   - review generated source;
   - add public components to `packages/ui/src/index.ts`;
   - run typecheck, lint, and build.
6. Update `PROGRESS.md` from planned to completed only after all exit criteria pass.

### Exit criteria

- Typecheck, lint, and production build pass.
- The package boundary and CLI workflow are documented.
- `PROGRESS.md` accurately reflects delivered work.

## Expected files

### Add

- `apps/dashboard/components.json`
- `packages/ui/components.json`
- `packages/ui/package.json`
- `packages/ui/tsconfig.json`
- `packages/ui/src/index.ts`
- `packages/ui/src/components/button.tsx`
- `packages/ui/src/lib/utils.ts`
- `packages/ui/src/styles/globals.css`

Additional generated support files may be added if required by the selected current
shadcn preset.

### Modify

- `package.json`
- `pnpm-lock.yaml`
- `apps/dashboard/package.json`
- `apps/dashboard/tsconfig.json`
- `apps/dashboard/next.config.ts`
- `apps/dashboard/src/app/layout.tsx`
- `apps/dashboard/src/app/globals.css`, if app-specific global CSS remains
- `PROGRESS.md`

### Remove

- `apps/dashboard/pnpm-lock.yaml`
- `apps/dashboard/pnpm-workspace.yaml`

## Risks and mitigations

- **CLI writes to the wrong workspace:** Always run `add --dry-run` and inspect every
  destination before installation.
- **Preset drift between workspaces:** Keep all preset-related fields identical and
  validate with `shadcn info`.
- **Missing Tailwind styles:** Keep one shared Tailwind entrypoint and include
  explicit `@source` coverage for applications and the UI package.
- **Barrel becomes stale:** Add barrel maintenance to the component-installation
  checklist; subpath imports remain available as a fallback.
- **Client/server boundary surprises:** Review generated `"use client"` directives
  and verify the root barrel through the Next.js production build.
- **Dependency duplication:** Keep component dependencies with the package that
  imports them and keep React versions aligned.
- **Accidental component overwrite:** Use `--dry-run` and `--diff`; never use
  `--overwrite` without explicit approval and a clean reviewed diff.

## Completion checklist

- [ ] The repository has one pnpm workspace and lockfile.
- [ ] `@inbox-triage/ui` is recognized as a workspace package.
- [ ] Both shadcn configuration files use consistent preset settings.
- [ ] CLI aliases route shared primitives and app compositions correctly.
- [ ] The shared Tailwind theme is the single design-token source.
- [ ] Next.js transpiles and consumes the UI source package.
- [ ] Root and subpath component imports both work.
- [ ] A Button installation proves end-to-end CLI routing.
- [ ] Typecheck, lint, and production build pass.
- [ ] The ongoing add/update workflow is documented.
- [ ] `PROGRESS.md` records the slice as completed only after validation.
