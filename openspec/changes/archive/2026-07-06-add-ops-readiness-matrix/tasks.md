# Tasks

## 1. Spec and Model

- [x] Add an OpenSpec delta for the read-only readiness matrix.
- [x] Preserve flow-list endpoint availability in the ops summary model.

## 2. UI

- [x] Add a Svelte 5 readiness matrix component with semantic rows and tests.
- [x] Compose the matrix into the ops console admin surface.
- [x] Keep row labels and paths generic SemStreams UI concepts.

## 3. Gates

- [x] Extend component/unit coverage for degraded and empty states.
- [x] Extend the owned ops-profile Playwright gate to assert the matrix.
- [x] Run `npm run lint`, `npm run check`, `npm run test -- --run`, and
      `task openspec:validate`.
