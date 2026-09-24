---
name: create-implementation-plan
description: Create or revise a readable implementation plan grounded in repository evidence.
disable-model-invocation: true
---

# Create Implementation Plan

Create an implementation plan for the requested change. Implementation begins only on a separate request.

Update repository-required planning trackers, such as `PROGRESS.md`, in the same change. Record new work as planned unless the repository already supports another status.

Ground the plan in the existing codebase and follow existing patterns where appropriate.

The plan will be reviewed and refined by an engineer, then may be handed to a fresh agent for implementation. It should therefore be easy to scan while retaining enough context, technical design, and rationale to implement without relying on the planning conversation.

Prefer architectural intent, boundaries, meaningful implementation decisions, and observable outcomes over low-level coding instructions. Be concrete without prescribing routine implementation details.

Use this structure:

# <Short action-oriented title>

## Status

State the plan's current status in one or two sentences. For partial implementation, name the completed slices and the remaining work briefly. Mark the plan complete only when the whole feature is complete.

## Goal

Describe what the change should accomplish and the important resulting behavior.

Keep this concise.

## Context

Summarize the existing behavior, architecture, constraints, or conventions that materially affect the change.

Include only context needed to understand the plan. Do not document the repository generally.

## Technical Design

Describe the important technical shape of the solution.

Capture the contracts, boundaries, structure, behaviors, and technical choices that should be understood or agreed on before implementation. Focus on decisions that materially constrain the implementation rather than documenting every technical detail.

Use whichever of the following subsections are useful. Omit those that do not add meaningful information.

### Data & Contracts

Describe important changes to persistent data, entities, domain models, API payloads, events, configuration, or other data contracts.

Capture significant fields, relationships, constraints, and ownership. Show complete contract shapes when they are useful for reviewing or unambiguously defining the design; otherwise summarize them.

Avoid reproducing incidental or unchanged schema details.

### Interfaces

Describe important public or architectural interfaces such as service boundaries, classes, functions, protocols, or extension points.

When an interface is central to the design, show its complete proposed shape so the reader can review exactly what implementation will expose. This may include method signatures, parameters, return types, important properties, and relevant type relationships.

Use exact interface definitions where they clarify the design, not merely abbreviated examples. Avoid method bodies, private helpers, and APIs that do not materially affect the architecture.

### Structure

Give a quick picture of relevant code organization after the change.

Use a compact directory or file tree when helpful. Show only structurally meaningful files and directories rather than an exhaustive list of touched files.

### Behaviors & Flows

Describe important routes, actions, state transitions, data flows, or control flows introduced or changed by the implementation.

Focus on externally visible behavior and interactions between important components.

### Technical Choices

Record significant implementation choices such as new libraries, framework features, infrastructure, persistence strategies, or notable decisions to reuse existing mechanisms.

Include brief rationale when the choice is not obvious.

## Implementation Slices

Break the implementation into a small number of coherent slices.

Each slice should represent a meaningful unit of the change that could reasonably be handed to a fresh implementation agent.

For each slice:

* give it a descriptive, outcome-oriented name;
* briefly state what the slice accomplishes;
* describe the meaningful implementation steps in logical order, using a numbered list (`1.`, `2.`, etc.);
* mention relevant modules, components, or code areas where useful;
* preserve the technical design and boundaries established above;
* note dependencies on other slices when they are not obvious.

Avoid line-by-line edits, exhaustive file lists, and instructions for routine coding decisions.

Prefer slices organized around coherent behavior or responsibilities rather than generic layers such as "backend", "frontend", and "tests".

## Validation

Briefly describe the important behaviors that should be verified after implementation.

Focus on what needs to be demonstrated rather than exact commands or an exhaustive test plan.

## Open Questions

Include only when unresolved questions or meaningful uncertainties remain.

Omit this section when there are none.

Keep the overall plan proportional to the size and complexity of the change. Optimize for readability and implementation usefulness rather than completeness for its own sake.
