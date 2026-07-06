# Tasks - Add Ops Search Panel

## 1. Governance

- [x] 1.1 Create OpenSpec change for the ops search panel.
- [x] 1.2 Add target-state spec delta for homepage entity search.
- [x] 1.3 Validate OpenSpec artifacts.

## 2. Component

- [x] 2.1 Add `OpsSearchPanel` with typed props and default GraphQL prefix
      search.
- [x] 2.2 Render submitted query, result count, entity labels, type/domain
      metadata, loading state, empty state, and search-level errors.
- [x] 2.3 Call `onEntitySelect` with the selected `GraphEntity`.
- [x] 2.4 Keep controls read-only and free of product-specific semantics.

## 3. Shell Wiring

- [x] 3.1 Wire `OpsSearchPanel` into the `search-surface` area.
- [x] 3.2 Bridge selected results into `graphStore.upsertEntity` and
      `graphStore.selectEntity`.
- [x] 3.3 Preserve the graph explorer and admin/trajectory surfaces while
      searching.

## 4. Verification

- [x] 4.1 Add focused component tests for search, select, empty, and error
      states.
- [x] 4.2 Add shell/page wiring coverage for selection.
- [x] 4.3 Run focused tests.
- [x] 4.4 Run `npm run check`.
- [x] 4.5 Run `npm run lint`.
- [x] 4.6 Run `task openspec:validate`.
