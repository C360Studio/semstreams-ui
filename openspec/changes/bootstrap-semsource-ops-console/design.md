# Design - Bootstrap Downstream Ops Console

## Context

SemStreams UI is being revived as reusable operational glass for
SemStreams-compatible products. SemSource is the first acceptance target, and
SemDev needs the same optional dashboard/admin/graph/search surface with more
emphasis on human inspection of runtime and agent trajectories.

The existing app already has a graph-first homepage, flow builder, runtime tabs,
chat/search plumbing, Caddy proxying, and SemSource graph E2E fixtures. The
design challenge is to compose those pieces into a product-neutral ops console
without moving SemSource source semantics or SemDev trajectory judgment into
this repo.

## Goals / Non-Goals

**Goals:**

- Keep the homepage graph-first while adding dashboard, search, runtime/admin,
  source-health, and trajectory visibility affordances.
- Preserve browser/backend compatibility through same-origin Caddy routes.
- Make degraded backend endpoints visible independently so one failing read path
  does not blank the whole ops console.
- Keep the UI reusable across SemSource, SemDev, and later sem* products.

**Non-Goals:**

- Do not add product-specific source mutation controls in this change.
- Do not interpret SemDev trajectory quality, approval policy, or next actions.
- Do not collapse `/flowbuilder/*` into `/flows` while `/flows` remains a
  SvelteKit page namespace.
- Do not change SemStreams backend route registration from this repo.

## Decisions

1. Compose the ops console around the existing graph explorer.

   The graph remains the primary first-viewport work surface because SemSource
   and SemDev both need users to inspect state and relationships before taking
   action. The new shell adds surrounding status and navigation affordances
   instead of replacing DataView with a separate dashboard page. A separate
   landing/dashboard route was considered, but it would split graph inspection
   from operational context before the first use cases are proven.

2. Keep read-side admin controls first.

   The first admin slice exposes health, graph/source status, active flow
   context, runtime drill-downs, copied IDs, and trajectory summaries. Mutation
   controls stay out until a downstream-owned contract defines them. This keeps
   the reusable UI safe for SemSource and SemDev while backend authority and
   product semantics are still moving.

3. Treat trajectory visibility as generic framework evidence.

   The shared UI fetches `/trajectories?limit=5`, surfaces availability/count,
   shows latest loop context, and links to the backend detail endpoint. It does
   not score, approve, retry, or classify trajectories. A SvelteKit trajectory
   detail page was considered, but the current backend proxy endpoint is enough
   for the bootstrap slice and avoids inventing a product-specific read model
   too early.

4. Preserve explicit proxy namespaces.

   Browser calls use `/flowbuilder/*` for backend flow/runtime APIs,
   `/graphql` for graph search, and `/trajectories` for trajectory reads. Caddy
   owns these same-origin proxy routes in production, dev, and E2E modes.
   Generated OpenAPI paths are reviewed as backend contracts, not blindly copied
   into browser URLs when they collide with SvelteKit pages.

## Risks / Trade-offs

- Backend shape drift -> contract and service tests pin browser-facing URLs and
  generated type drift is reviewed before path constants move.
- Product semantics leaking into shared UI -> OpenSpec boundaries and tests keep
  source controls and trajectory interpretation out of this bootstrap slice.
- Partial backend outages confusing operators -> ops summary models endpoint
  availability independently and renders degraded states instead of throwing.
- Raw trajectory drill-down feels unfinished -> acceptable for bootstrap because
  it gives SemDev a human inspection path while leaving a richer trajectory view
  for a later governed slice.

## Migration Plan

1. Land OpenSpec, proxy, generated type, and ops-shell changes together.
2. Validate with OpenSpec 1.5 health/status commands plus existing Svelte,
   lint, unit, and contract tests.
3. Run SemSource graph E2E when the Docker/backend stack is available.
4. Promote completed behavior into durable `openspec/specs/` entries when this
   change is archived.

Rollback is limited to reverting this UI change set. No backend data migration
or SemStreams route registration change is introduced here.

## Open Questions

- Which trajectory detail fields should become a stable UI read model once
  SemDev exercises the raw backend detail endpoint?
- Should a later SvelteKit `/trajectories/[id]` page replace the raw backend
  drill-down after the shared read model is known?
- Which downstream-owned source/admin mutation contracts should be added first
  after the read-only console proves useful?
