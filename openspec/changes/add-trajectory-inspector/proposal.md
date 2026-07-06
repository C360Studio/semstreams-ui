# Add Read-Only Trajectory Inspector

## Why

SemDev is an additional consumer of the reusable ops console and is expected to
lean harder on the "let a human see trajectories" workflow. The bootstrap ops
console currently shows only the latest trajectory summary and a raw backend
drill-down link. That proves route compatibility, but it is not yet enough for a
human to scan recent loops, compare outcomes, or inspect the step timeline
without leaving the UI.

## What Changes

- Add a generic read-only trajectory inspector to the ops console.
- Reuse the existing `/trajectories` browser proxy namespace.
- Fetch trajectory detail on demand from `/trajectories/{loopId}`.
- Show recent trajectory summaries, selected loop/task IDs, outcome, duration,
  token totals, and a step timeline.
- Keep copy/open affordances for IDs and raw backend detail.
- Preserve degraded and empty states when trajectory endpoints are unavailable
  or return no data.

## Non-goals

- Do not add trajectory mutation controls such as approve, retry, cancel,
  resume, or delete.
- Do not score, classify, approve, or interpret trajectory quality.
- Do not add SemDev-specific workflow semantics or SemSource-specific parser
  semantics to this shared repo.
- Do not change backend route registration or Caddy proxy routes.
- Do not replace the raw backend trajectory detail endpoint with a routed
  SvelteKit detail page in this slice.

## Affected Products

- **SemDev** gets a more useful human trajectory inspection path.
- **SemSource** keeps the same optional ops console and benefits from generic
  trajectory visibility when its backend exposes trajectory data.
- **SemStreams** continues to supply the `/trajectories` summary/detail
  contracts.
- Other sem\* products can reuse the same read-only inspector when they expose
  SemStreams trajectory endpoints.

## Impact

- `openspec/specs/semsource-ops-console/spec.md`
- `src/lib/services/trajectoryApi.ts`
- `src/lib/components/runtime/TrajectoryInspector.svelte`
- `src/lib/components/OpsConsoleShell.svelte`
- Focused service/component tests
