# Design - Ops Search Panel

## Context

The homepage already wraps `DataView` in `OpsConsoleShell`, and `DataView`
loads graph entities through `graphApi.getEntitiesByPrefix("", 200)`.
`GraphFilters` can filter locally loaded entities, but the ops shell's Search
area is only an anchor. The next useful slice is therefore a small
read-side search panel that sits above the graph and bridges a selected backend
result into the existing graph detail panel.

## Decisions

1. Use entity prefix search first.

   `entitiesByPrefix` is already used by the app and ops summary model, works
   through the existing `/graphql` proxy contract, and does not require adding
   NLQ classification or ranking semantics to the shared ops shell. The panel
   should label this as entity lookup/search rather than promising full-text
   or product-specific source search.

2. Keep the component testable through props.

   `OpsSearchPanel` should accept a `searchEntities` callback and an
   `onEntitySelect` callback. The default callback can use `graphApi` and
   `transformPathSearchResult`, while tests and the shell can pass lightweight
   fakes.

3. Upsert the selected result before selecting it.

   Prefix search may return an entity outside the initial graph sample. The
   homepage should upsert the selected `GraphEntity` into `graphStore` before
   selecting it so the existing `GraphDetailPanel` can open immediately without
   waiting for a graph reload.

4. Do not mutate backend resources.

   The panel only reads `/graphql` and updates frontend graph selection state.
   It must not expose source, parser, flow, or trajectory mutation actions.

## Risks

- Prefix search may be less forgiving than full-text search. This is acceptable
  for the first generic slice because it matches the backend contract currently
  used by the UI.
- Selecting a result with sparse triples may show a minimal detail panel. Later
  slices can add an explicit `getEntity` enrichment pass if SemSource/SemDev
  need it.

## Follow-ups

- Add SemSource-backed E2E coverage when the stack is available.
- Consider an NLQ/global search mode after the generic prefix path is proven.
- Consider a deep-linkable entity detail route if downstream users need sharable
  search results.
