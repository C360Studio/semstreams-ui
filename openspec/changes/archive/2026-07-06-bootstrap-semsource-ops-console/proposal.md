# Bootstrap SemSource Ops Console Governance

## Why

SemStreams and related sem\* repos have moved quickly while this UI has been
quiet. SemStreams now uses OpenSpec, its OpenAPI schema has materially changed,
and SemSource needs this UI to become the first usable ops console: dashboard,
admin surface, graph visualization, and easy search. SemDev is an additional
customer for the same optional UI surface, with a heavier need for humans to see
agent/runtime trajectories.

The repo already has useful pieces: graph explorer homepage, flow builder,
runtime tabs, chat/search plumbing, and SemSource graph E2E fixtures. The first
slice should bring the infrastructure back under current governance and pin the
browser/backend compatibility contract before adding more UI.

Live compatibility check on 2026-07-05:

- SemStreams remotes were refreshed.
- `origin/main` is `8a7ae6d8ff8410bc91fb1e7ff7a7841376f55979`.
- Latest visible tag is `v1.0.0-beta.140`.
- `../semstreams/specs/openapi.v3.yaml` matches `origin/main` by SHA-256.

## What Changes

- Initialize OpenSpec for SemStreams UI.
- Add project boundary rules for reusable UI versus SemSource product semantics.
- Refresh generated TypeScript API bindings from current SemStreams OpenAPI.
- Preserve the `/flowbuilder/*` browser namespace for flow/admin/runtime calls,
  because `/flows` is a SvelteKit UI route.
- Route `/graphql` consistently in production and E2E Caddy configs.
- Fix historical runtime message lookup to use the proxied `/flowbuilder/*`
  route.
- Establish downstream ops console requirements for graph-first landing,
  search, runtime/admin status, trajectory visibility, and backend
  compatibility.

## Non-goals

- Do not build the full SemSource admin dashboard in this bootstrap slice.
- Do not move SemSource-specific source semantics or SemDev-specific trajectory
  interpretation/actions into this repo.
- Do not rename the `/flows` SvelteKit pages or collapse the `/flowbuilder/*`
  browser namespace without a separate route-migration change.
- Do not change SemStreams backend route registration in this repo.

## Affected Products

- **SemSource** consumes the first ops-console workflow.
- **SemDev** consumes the same optional dashboard/admin/graph/search workflow
  and needs generic trajectory visibility for human inspection.
- **SemStreams** supplies the backend OpenAPI, graph, flow, health, runtime, and
  trajectory/GraphQL contracts.
- Other sem\* products benefit from the generic UI/proxy contract but are not the
  first acceptance target.

## Impact

- `openspec/`
- `Taskfile.yml`
- `Caddyfile`, `Caddyfile.e2e`
- `src/lib/types/api.generated.ts`
- `src/lib/services/messagesApi.ts`
- `README.md`
- SemSource graph E2E documentation
