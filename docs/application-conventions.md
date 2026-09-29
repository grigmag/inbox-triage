# Application Conventions

This document records durable, cross-cutting product conventions. Feature-specific
decisions belong in the relevant implementation plan.

## Feature organization

Product code lives in `apps/dashboard/src/features`, grouped by business
capability. An umbrella feature may contain subfeatures that evolve
independently. Each subfeature follows these rules recursively.

```text
apps/dashboard/src/
├── features/emails/
│   ├── actions/            server actions
│   ├── use-cases/
│   ├── repositories/
│   ├── server/             server-only integrations with external services, e.g. read-mailbox.ts
│   ├── dto/
│   ├── validation/
│   ├── errors/
│   ├── brief-review/       capability module: prompt, schemas, config, errors, evals
│   ├── shared/             only for code sibling capabilities share with no clear owner
│   ├── components/
│   │   ├── success-badge.tsx          feature building block
│   │   └── email-detail/              component folder
│   │       ├── email-detail.tsx       entry file, the only file imported from outside
│   │       ├── use-brief-reply.ts     private code, flat, any client layer
│   │       ├── reply-composer/        nested sub-unit, the deepest allowed level
│   │       └── review-panel/
│   ├── hooks/              client hooks
│   ├── state/              reducers and their state types
│   └── lib/                pure helpers, e.g. format-email-addresses.ts
├── hooks/                  feature-independent helpers, e.g. use-scroll-into-view-on-mount.ts
└── lib/
```

Create only the directories a feature needs, never empty ones for symmetry.
Layers mix only inside capability modules and component folders.

### Layers

- Imports are one-way. `components` may import `actions`. `actions` may import
  `use-cases` or `repositories`. `use-cases` may import `repositories`.
- `dto`, `validation`, and `errors` may import one another, and any
  operational layer may import them. They never import an operational layer.
- Actions own framework concerns, use cases own multi-step orchestration, and
  repositories own persistence.
- Keep application errors framework-independent.
- Mark server-only modules with `server-only` and server actions with
  `use server`.

### Files and exports

- Colocate tests with the code they cover.
- Name a file after its primary export, in kebab-case: `getSenderInitials`
  lives in `get-sender-initials.ts`.
- Export only what another module imports. A colocated test counts as an
  importer. Lint limits component files to one exported component plus its
  types.
- Share repeated style, labels, or markup as a component, as `SuccessBadge`
  does, not as an exported constant.
- Don't use barrel files, except a compound component's entry file. Import
  from the module that defines the value or type.

### Where shared code goes

- Keep code with the capability that owns it.
- Put code several modules share in the closest folder containing all of them,
  in a module named for what it holds, such as `rate-catalog-table.types.ts` or
  `gap-status-labels.consts.ts`. When a consumer outside that folder appears,
  move the module up to the new closest folder.
- Feature building blocks stay at the feature level even when only one
  component folder uses them. These are presentation components meant for
  reuse across the feature, like `SuccessBadge` in `components`, and helpers
  for the feature's own data, like `formatEmailAddresses` in `lib`.
- Put helpers that don't depend on the feature in `apps/dashboard/src/hooks` or
  `apps/dashboard/src/lib`, even when only one feature uses them.

### Component folders

- Give a UI unit its own folder when one component is the only entry point to
  components, hooks, and helpers nothing else imports. Name the folder and entry
  file after that component. Outside code imports only the entry file.
- Nest a sub-unit folder only when it has its own private code and a single
  entry. Keep other components flat in the parent. Nest at most two levels
  below `components`.
- Inside a top-level component folder, nested folders included, import its
  files by relative path, such as `../use-brief-reply` from `reply-composer/`.
  Import everything else through `@/`.
- Component folders hold client UI code only. Server code and the `dto`,
  `validation`, and `errors` modules stay in their layer directories.

### Compound components and context

- Follow the `vercel-composition-patterns` skill for composition, with the
  constraints below.
- A component folder's entry file exports either one component, the default,
  or a compound component: a namespace object such as
  `Composer = { Frame, Input, Submit }`. Make it compound only when two or
  more callers arrange the parts differently. Outside code still imports only
  the entry file.
- Keep each part in its own file. The entry is a `.ts` file that imports the
  parts and exports only the namespace object. This is the one allowed
  aggregation module, and the shape the Fast Refresh lint rule accepts.
- Keep shared state in a context file and a provider file, flat in the
  folder, using the `state`/`actions`/`meta` shape, as `email-detail` does.
- Context types stay concrete. Extract a generic interface only once a second
  provider exists.

## Code style

- Write comments that describe a declaration, such as a function, type,
  property, or exported constant, as `/** ... */` doc comments so the IDE shows
  them on hover. Keep `//` for comments about the implementation inside a
  function body:

  ```ts
  type BriefReplyState = {
    /** Set after a successful send. The draft stays locked from then on. */
    sent: SentBriefReplyDto | null;
  };
  ```

- Do not write `return await ...` or place `await` inside a returned
  expression. Assign the awaited value to a named constant, then return it:

  ```ts
  const data = await runOnce(config, operation);
  return data;
  ```

- When a function has several parameters of the same type, prefer one
  destructured object parameter to positional arguments, so call sites cannot
  silently swap values:

  ```ts
  sendBriefReplyAction({ messageRef, body });
  ```

- Handle errors from awaited calls with `try`/`catch` blocks, not promise
  `.catch()` callbacks. When a later step needs the awaited value, declare it
  before the block and assign it inside:

  ```ts
  let parent: EmailMessage;

  try {
    const mailbox = await readMailbox(userId, (reader) =>
      reader.getMessage(messageRef),
    );

    if (mailbox.status === 'noConnection') {
      return mailbox;
    }

    parent = mailbox.data;
  } catch {
    throw new BriefReplyMailboxError();
  }
  ```

## Authentication boundaries

- The authenticated route-group layout calls `requireUser()` before rendering
  the application shell.
- Every protected page also calls `requireUser()`, including pages whose current
  content is static. Route handlers, server actions, and data-access boundaries
  repeat the check where they access authenticated behavior or resources. This
  repetition is intentional: each boundary remains secure if it is moved or
  reused outside the current layout hierarchy.
- Authentication checks remain server-side. The application shell and
  client-side redirects are not authorization boundaries.

## Routes

- Dashboard code imports paths from `apps/dashboard/src/config/routes.ts`
  instead of hardcoding them in links, redirects, cache invalidation, or
  navigation configuration.

## User feedback

- Completed mutations use specific, action-led success messages.
- Brief, non-blocking failures may use error toasts.
- A toast is never the only confirmation for a destructive action or the only
  presentation of blocking validation and recoverable errors.
- Destructive actions require an explicit confirmation surface before the
  mutation begins.
- Irreversible outward-facing actions, such as sending an email, also require
  a confirmation. It shows what the user should check, such as recipients and
  any open warnings, and uses the default rather than destructive action style.

## Theming

- `packages/ui/src/styles/globals.css` keeps the stock shadcn tokens so the
  `ui` package stays reusable. Do not add project tokens or brand values
  there.
- `apps/dashboard/src/app/globals.css` is the app's only stylesheet entry. It
  imports the `ui` stylesheet first, then defines project tokens and the
  InboxTriage theme, so its values override the shadcn defaults.
- The app uses the dark "Darkroom" theme: warm charcoal surfaces with an amber
  primary. The root layout sets the `dark` class, so theme values live in the
  `.dark` block and shadcn `dark:` variants apply.
- Components use theme tokens, such as `bg-card` and `text-muted-foreground`,
  rather than fixed palette colors, such as `bg-zinc-100`. Clerk components
  read the same tokens through `packages/auth/src/client/clerk-appearance.ts`.
- Status colors use theme tokens. `destructive` marks errors and blocking
  states. `warning` marks states that need attention but do not block, such as
  missing or ambiguous information. `success` marks completed or positive
  states, such as a complete brief, clear details, or a sent reply. `warning`
  and `success` are project additions to the shadcn theme.

## Validated server actions

- Shared serializable action-result types live in `apps/dashboard/src/lib/actions`.
  Feature modules define their own field unions and result aliases from those
  shared types.
- Validated mutations return `MutationActionResult`. Other actions define their
  own result union beside the action.
- Validated mutations use explicit procedural control flow: authenticate and
  authorize, parse untrusted input with the feature's Zod schema, return field
  errors, perform the mutation, and translate expected or generic failures.
  Repeating this small sequence is intentional so each action's behavior and
  ordering remain visible.
- Cache invalidation, redirects, `notFound()`, announcements, and safe fallback
  copy remain explicit in the action that owns them.
- Small pure utilities may normalize Zod field errors or translate shared domain
  errors. Do not extract the action's overall control flow into a generic
  executor.
- Action success data must be an explicit DTO that can cross the server-action
  serialization boundary.
