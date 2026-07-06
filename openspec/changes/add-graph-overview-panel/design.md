# Design - Graph Overview Panel

## Context

`DataView` already renders the graph and owns detailed graph interactions through
`graphStore`, `GraphFilters`, `SigmaCanvas`, and `GraphDetailPanel`. The ops
shell currently receives selected entity ID and backend graph availability, but
it does not expose frontend graph context such as filtered counts or active
selection in a compact operator surface.

## Decisions

1. Use graph-store derived state, not another backend read.

   Counts, selection, filter status, loading, and error state already exist in
   the runes-based `graphStore`. The page should derive a small overview model
   from the store and pass it to the shell. This avoids duplicating GraphQL
   calls and keeps the panel consistent with the graph actually on screen.

2. Keep controls frontend-only.

   Clear selection and reset filters help operators recover context without
   touching backend resources. They are acceptable in the shared UI because they
   only mutate local graph view state. Backend mutation controls remain out of
   scope.

3. Keep the shell generic.

   The overview should show entity IDs, labels, counts, type/domain metadata,
   and generic graph status. It must not interpret SemSource parser state or
   SemDev trajectory quality.

## Risks

- `graphStore` counts are page-local and may briefly be zero before `DataView`
  finishes loading. The panel should show loading/empty states instead of
  treating this as an error.
- Filtered counts may differ from backend sampled counts. The panel should label
  them as current-view counts rather than authoritative backend totals.

## Follow-ups

- Add real SemSource E2E coverage for search -> selection -> overview context.
- Consider deep-linkable graph selection state after URL-state requirements are
  clear.
