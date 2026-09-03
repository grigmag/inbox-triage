---
name: create-implementation-plan
description: Create or revise an approval-ready implementation plan grounded in repository evidence.
disable-model-invocation: true
---

# Create Implementation Plan

Produce the plan artifact and any repository-required planning tracker update. Implementation begins only on a separate request.

## 1. Establish authority and targets

1. Read applicable repository instructions, planning conventions, progress records, and supplied requests, specifications, prototypes, issues, or existing plans.
2. Identify the plan path, whether the work creates or revises a plan, and every required companion update. Record new work as planned, not completed.
3. Establish precedence among the request, active repository instructions, the plan, durable conventions, and source material. Treat the finished plan as the primary execution guide.

This stage is complete when the artifact targets, governing inputs, and conflict precedence are explicit.

## 2. Build an evidence base

Inspect the relevant code, configuration, tests, dependencies, scripts, documentation, and prior plans. Trace the current ownership boundaries and conventions far enough to:

- ground every proposed path, symbol, interface, command, dependency, and migration workflow;
- expose conflicts, missing prerequisites, and behavior the plan must preserve;
- separate confirmed repository facts from open decisions, recommended choices, and discoveries deferred to implementation.

For each open decision, develop a defensible recommendation and the material tradeoffs or constraints behind it.

This stage is complete when each implementation-driving claim is confirmed by repository evidence or clearly marked as a decision or discovery.

## 3. Resolve open decisions with the user

Ask the user every currently knowable question whose answer would change the outcome, scope, contract, architecture, or acceptance boundary. Present the questions in one batch, with concise context, a recommended choice, and the material tradeoffs for each.

Use another batch only when the user's answers expose a new material decision that could not reasonably have been identified in the first batch. Continue until every material decision is answered. When no material decisions remain open, proceed without asking questions.

This stage is complete when the plan can state every material decision as a user-approved choice rather than an executor assumption.

## 4. Write the two-layer plan

Keep both layers concise. Layer 1 defines the commitment being approved; Layer 2 gives an implementation agent an executable route to it. Record decisions and implementation-driving evidence, not the investigation transcript.

### Layer 1: Product brief

Include only the sections the feature needs:

1. **Status and outcome** — the current plan state, observable end state, and why it matters.
2. **Scope** — precise in-scope and out-of-scope boundaries.
3. **Product and technical contracts** — behavior, data rules, ownership, security, failure behavior, compatibility, and constraints implementation must preserve.
4. **Decisions and adaptations** — material choices, departures from source material, and production-versus-reusability tradeoffs. Omit when there are none.
5. **Architecture at a glance** — a compact boundary or data-flow view when it materially clarifies ownership or dependencies.

Keep private implementation structure out of the brief. Name files, helpers, component splits, or test layouts only when they define ownership or prevent a plausible mistake. Contracts are fixed; private structure left unspecified remains executor discretion.

### Layer 2: Execution outline

Write dependency-ordered product slices. Each slice contains:

1. an outcome describing the coherent capability completed by the slice;
2. concrete, ordered steps describing what the agent will build;
3. focused verification that proves the slice outcome when an incremental check has regression value.

Each slice should leave the repository in a reviewable state. Keep behavior that only gains value together in one slice, and place shared foundations before their consumers.

Use exact paths, commands, interfaces, migrations, and dependencies when investigation confirms them and the detail guides implementation. Leave private structure to the executor. Mark necessary discoveries instead of inventing details. Add local guardrails only where they prevent a non-obvious mistake.

End with compact **Common traps** and **Quality gates** sections when applicable. Common traps capture mistakes not already clear from contracts or slices. Quality gates contain repository-required checks and feature-specific review without duplicating slice verification.

### Specifications and source material

Delegate dense contracts to a linked repository specification when that is safer than copying them. State exactly what the source owns, such as schema details, field limits, or UI copy, and restate only what must remain visible for safe sequencing. The plan's explicit decisions prevail on conflict.

### Testing boundary

Plan automation where it has specific regression value: transformations, state transitions, authorization, persistence invariants, migrations, integration failures, and recovery. Prefer focused unit or integration tests at the behavior's natural boundary.

Assign rendered screens and wording to human review unless automation protects behavior beyond restating markup. Include component, UI-copy, source-inspection, or browser tests only when the feature gives them a concrete advantage.

This stage is complete when every in-scope contract is owned by a slice and has an appropriate automated or human verification path.

## 5. Audit and write

Before finishing:

1. Check that outcome, scope, contracts, slices, testing, and quality gates agree.
2. Confirm sequencing is feasible, links resolve, referenced repository details exist, and uncertain details are labeled.
3. Prune prose that neither changes implementation behavior nor prevents a plausible mistake.
4. Write the plan and only its repository-mandated planning companions; preserve implementation files.

The artifact is approval-ready when an approver can identify the commitment and material decisions quickly, and an implementation agent can execute every slice without inventing a contract or missing an in-scope requirement.
