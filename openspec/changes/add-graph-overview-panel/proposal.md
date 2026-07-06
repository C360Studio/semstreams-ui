# Add Graph Overview Panel

## Why

The homepage now has read-side admin, trajectory inspection, and visible entity
search. The graph itself remains the primary work surface, but operators do not
yet get a compact ops-level summary of what the graph is showing after search,
filtering, or entity selection. SemSource and SemDev both need a lightweight way
to answer "what am I looking at?" without leaving the graph-first view.

## What Changes

- Add a generic graph overview panel to the homepage ops shell.
- Show rendered entity and relationship counts, filtered counts, graph state,
  selected entity context, and active filter count.
- Provide frontend-only controls to clear the selected entity and reset graph
  filters.
- Keep the graph explorer visible and avoid adding backend mutation actions.

## Non-goals

- Do not add new backend graph endpoints.
- Do not change graph layout, clustering, or Sigma rendering behavior.
- Do not add SemSource-specific source semantics or SemDev trajectory judgment.
- Do not create/update/delete graph entities or backend resources.
- Do not replace the existing graph detail panel.

## Affected Products

- **SemSource** gets a clearer graph operations summary while inspecting source
  entities.
- **SemDev** gets the same generic graph context while inspecting trajectories
  and related state.
- Other SemStreams-compatible products get reusable graph overview affordances
  when they use the shared ops console.

## Impact

- `openspec/specs/semsource-ops-console/spec.md`
- `src/lib/components/runtime/GraphOverviewPanel.svelte`
- `src/lib/components/OpsConsoleShell.svelte`
- `src/routes/+page.svelte`
- Focused component and shell tests
