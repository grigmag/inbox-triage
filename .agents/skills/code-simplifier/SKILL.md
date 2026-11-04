---
name: code-simplifier
description: Simplify recently changed code for clarity and consistency without changing behavior.
disable-model-invocation: true
---

<!--
Modified from Anthropic's code-simplifier agent:
https://github.com/anthropics/claude-plugins-official/blob/main/plugins/code-simplifier/agents/code-simplifier.md
Licensed under the Apache License 2.0. See THIRD_PARTY_NOTICES.md at the
repository root.
-->

# Code Simplifier

Simplify code for clarity, consistency, and maintainability while preserving exact behavior. Prefer readable, explicit code over compact code.

## Scope

Pick the first that applies:

1. The files, directories, or changes named in the request.
2. Uncommitted changes, staged and unstaged: `git diff HEAD` plus untracked files from `git status --short`.
3. Changes on the current branch against `main`: `git diff main...HEAD`.

State the scope you chose before editing. Only refine code inside it.

## Refinement Principles

### 1. Preserve Functionality

Never change what the code does, only how it does it. All original features, outputs, and behaviors must remain intact.

### 2. Apply Project Standards

Read `AGENTS.md` and `docs/application-conventions.md` before editing. They define the project's standards; follow them over any general preference in this skill.

### 3. Enhance Clarity

Simplify code structure by:

- Reducing unnecessary complexity and nesting
- Eliminating redundant code and abstractions
- Improving readability through clear variable and function names
- Consolidating related logic
- Removing unnecessary comments that restate obvious code
- **Avoiding nested ternary operators**: prefer switch statements or if/else chains for multiple conditions
- Choosing clarity over brevity: explicit code is often better than overly compact code

### 4. Maintain Balance

Avoid over-simplification that could:

- Reduce code clarity or maintainability
- Create overly clever solutions that are hard to understand
- Combine too many concerns into single functions or components
- Remove helpful abstractions that improve code organization
- Prioritize "fewer lines" over readability (e.g., nested ternaries, dense one-liners)
- Make the code harder to debug or extend

### 5. Keep Intentional Repetition

Some repetition is deliberate. Do not merge or extract it:

- The authenticate → parse → mutate → translate sequence in each validated server action. Do not extract it into a generic executor.
- `requireUser()` calls on every protected page, route handler, server action, and data-access boundary, even when a parent layout already checks.
- Cache invalidation, redirects, `notFound()`, and announcements inside the action that owns them.

### 6. Leave Generated and Shared Files Alone

Do not edit these, even when they fall inside the scope:

- Generated shadcn components in `packages/ui/src/components`
- Drizzle migrations and generated SQL in `packages/db`
- `packages/ui/src/styles/globals.css`

## Refinement Process

1. **Identify** the code in scope
2. **Analyze** it for opportunities to improve clarity and consistency
3. **Apply** the project standards and the principles above
4. **Ensure** all functionality remains unchanged
5. **Verify** the refined code is simpler and more maintainable. Revert any change that is not.
6. **Validate** by running `pnpm typecheck`, `pnpm lint`, and the tests covering the changed code from the repository root. Do not run `pnpm build`. Fix any failures you introduced.
7. **Report** as described below

Leave changes unstaged. Do not change product APIs only to make tests easier.

## Report

End with a short list:

- **Changed**: each simplification, with its file and a one-line reason
- **Skipped**: candidates you left alone because a principle above or a project convention protects them, with the reason

## Examples

### Before: Nested Ternaries

```typescript
const status = isLoading ? 'loading' : hasError ? 'error' : isComplete ? 'complete' : 'idle';
```

### After: If/Else Chain

```typescript
function getStatus(isLoading: boolean, hasError: boolean, isComplete: boolean): string {
  if (isLoading) return 'loading';
  if (hasError) return 'error';
  if (isComplete) return 'complete';
  return 'idle';
}
```

### Before: Overly Compact

```typescript
const result = arr.filter(x => x > 0).map(x => x * 2).reduce((a, b) => a + b, 0);
```

### After: Clear Steps

```typescript
const positiveNumbers = arr.filter(x => x > 0);
const doubled = positiveNumbers.map(x => x * 2);
const sum = doubled.reduce((a, b) => a + b, 0);
```

### Before: Returned Await

```typescript
return await runOnce(config, operation);
```

### After: Named Result

```typescript
const data = await runOnce(config, operation);
return data;
```

### Before: Redundant Abstraction

```typescript
function isNotEmpty(arr: unknown[]): boolean {
  return arr.length > 0;
}

if (isNotEmpty(items)) {
  // ...
}
```

### After: Direct Check

```typescript
if (items.length > 0) {
  // ...
}
```
