# Tasks - Add UI-Owned E2E Gate

## 1. Governance

- [x] 1.1 Create OpenSpec change for the UI-owned E2E gate.
- [x] 1.2 Add target-state spec deltas for owned ops-profile coverage.
- [x] 1.3 Add target-state spec deltas for the backend fixture contract.

## 2. Fixture and Runner

- [x] 2.1 Add deterministic ops-profile fixture backend.
- [x] 2.2 Add dedicated Docker Compose stack for the ops-profile gate.
- [x] 2.3 Add dedicated Playwright config and teardown.
- [x] 2.4 Add package and Taskfile commands.
- [x] 2.5 Add CI job for the owned gate.

## 3. Coverage

- [x] 3.1 Add Playwright coverage for homepage ops composition.
- [x] 3.2 Add Playwright coverage for fixture graph load and overview counts.
- [x] 3.3 Add Playwright coverage for search result selection into entity detail.
- [x] 3.4 Add Playwright coverage for trajectory detail inspection.

## 4. Verification

- [x] 4.1 Run fixture unit tests or build checks.
- [x] 4.2 Run `npm run check`.
- [x] 4.3 Run `npm run lint`.
- [x] 4.4 Run `task openspec:validate`.
- [x] 4.5 Run `task test:e2e:ops-profile`.
