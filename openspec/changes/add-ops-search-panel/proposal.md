# Add Ops Search Panel

## Why

The ops console exposes a search anchor and the graph explorer has local filter
controls, but downstream users still need an obvious first-screen search path
from the shared ops surface. SemSource users should be able to find ingested
source entities quickly, and SemDev users should get the same generic entity
lookup without product-specific workflow semantics.

## What Changes

- Add a compact search panel to the homepage ops shell.
- Search generic graph entities through the same-origin `/graphql` route using
  existing entity-prefix lookup behavior.
- Show loading, empty, and per-search error states without hiding the graph.
- Let users select a result and open the existing graph detail context.
- Keep the panel generic: no SemSource parser names, source-type actions, or
  SemDev trajectory judgment controls.

## Non-goals

- Do not add a new search backend route.
- Do not replace the graph explorer's local filters or chat slash commands.
- Do not introduce NLQ ranking, scoring, or query interpretation in this slice.
- Do not add source-specific mutation controls.
- Do not make search require a running flow.

## Affected Products

- **SemSource** gets a visible homepage lookup path for ingested graph entities.
- **SemDev** gets the same reusable entity lookup surface alongside trajectory
  inspection.
- Other SemStreams-compatible products can reuse the panel when `/graphql`
  exposes `entitiesByPrefix`.

## Impact

- `openspec/specs/semsource-ops-console/spec.md`
- `src/lib/components/runtime/OpsSearchPanel.svelte`
- `src/lib/components/OpsConsoleShell.svelte`
- `src/routes/+page.svelte`
- Focused component and shell tests
