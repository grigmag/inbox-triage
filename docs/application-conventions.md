# Application Conventions

This document records durable, cross-cutting product conventions. Feature-specific
decisions belong in the relevant implementation plan.

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

## User feedback

- Completed mutations use specific, action-led success messages.
- Brief, non-blocking failures may use error toasts.
- A toast is never the only confirmation for a destructive action or the only
  presentation of blocking validation and recoverable errors.
- Destructive actions require an explicit confirmation surface before the
  mutation begins.
