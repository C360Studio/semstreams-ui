# Tasks - Add Read-Only Trajectory Inspector

## 1. Governance

- [x] 1.1 Create OpenSpec change for the trajectory inspector.
- [x] 1.2 Add target-state spec delta for generic read-only trajectory
      inspection.
- [x] 1.3 Validate OpenSpec artifacts.

## 2. Service Contract

- [x] 2.1 Add a focused trajectory detail API client for
      `/trajectories/{loopId}`.
- [x] 2.2 Normalize generated OpenAPI trajectory detail fields into a compact
      UI model.
- [x] 2.3 Cover success, encoded loop IDs, empty steps, and endpoint failures
      with unit tests.

## 3. UI

- [x] 3.1 Add a read-only `TrajectoryInspector` component.
- [x] 3.2 Show recent summaries, selected loop/task identifiers, outcome,
      duration, token totals, and step timeline.
- [x] 3.3 Add copy/open affordances without mutation controls.
- [x] 3.4 Render empty, unavailable, loading, and detail-error states.
- [x] 3.5 Wire the inspector into `OpsConsoleShell`.

## 4. Verification

- [x] 4.1 Run focused service/component tests.
- [x] 4.2 Run `npm run check`.
- [x] 4.3 Run `npm run lint`.
- [x] 4.4 Run `task openspec:validate`.
