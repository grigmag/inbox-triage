# Application Conventions

This document records durable, cross-cutting product conventions. Feature-specific
decisions belong in the relevant implementation plan.

## Feature organization

- Organize product code by business capability under `apps/dashboard/src/features`.
  An umbrella feature may contain independently evolving subfeatures, and each
  subfeature follows the same conventions recursively.
- Within a feature or subfeature, use only the applicable technical layers:
  `actions`, `components`, `dto`, `errors`, `repositories`, `use-cases`, and
  `validation`. Do not create empty directories for symmetry.
- Keep tests colocated with the implementation they cover.
- Name a file that exports one primary function after that function, in
  kebab-case: `getBriefReplyStaleness` lives in `get-brief-reply-staleness.ts`.
  Put pure helper functions in `lib`.
- Keep code with the capability that owns it. Use a feature-level `shared`
  directory only when multiple sibling capabilities consume the code and none is
  its clear owner.
- Operational imports are one-way: `components` may import `actions`; `actions`
  may import `use-cases` or `repositories`; and `use-cases` may import
  `repositories`. Supporting `dto`, `validation`, and `errors` modules may import
  one another and be imported by any operational layer, but never import an
  operational layer. Actions own framework concerns, use cases own multi-step
  orchestration, and repositories own persistence.
- Keep application errors framework-independent.
- Mark server-only modules with `server-only` and server actions with `use server`.
- Avoid barrel files such as re-export-only `index.ts` modules in feature code.
  Import directly from the module that defines the value or type.

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
