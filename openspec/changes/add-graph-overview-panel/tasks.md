# Tasks - Add Graph Overview Panel

## 1. Governance

- [x] 1.1 Create OpenSpec change for graph overview.
- [x] 1.2 Add target-state spec delta for graph context visibility.
- [x] 1.3 Validate OpenSpec artifacts.

## 2. Component

- [x] 2.1 Add typed graph overview data model.
- [x] 2.2 Add `GraphOverviewPanel` with counts, graph state, selected entity
      context, and active filter status.
- [x] 2.3 Add frontend-only clear-selection and reset-filter controls.
- [x] 2.4 Render loading, empty, and error/degraded states.
- [x] 2.5 Keep controls free of backend or product-specific mutations.

## 3. Wiring

- [x] 3.1 Derive graph overview data from `graphStore` in the homepage route.
- [x] 3.2 Wire overview data and callbacks through `OpsConsoleShell`.
- [x] 3.3 Preserve graph, search, admin, and trajectory surfaces.

## 4. Verification

- [x] 4.1 Add focused component tests for counts, selection, controls, and
      degraded states.
- [x] 4.2 Add shell wiring coverage for the overview callbacks.
- [x] 4.3 Run focused tests.
- [x] 4.4 Run `npm run check`.
- [x] 4.5 Run `npm run lint`.
- [x] 4.6 Run `task openspec:validate`.
