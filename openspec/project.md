# SemStreams UI Project Context

## Purpose

SemStreams UI is reusable operational glass for the SemStreams framework and
SemStreams-compatible products. It gives operators and developers a single
browser experience for graph exploration, easy search, flow management, runtime
health, logs/messages/metrics, and lightweight AI-assisted investigation.

The next product targets are SemSource and SemDev: users should get an optional
ops dashboard, admin UI, graph visualization, and search interface without each
product carrying its own duplicate frontend. SemDev is expected to lean more
heavily on human-readable trajectory inspection, so generic trajectory reads are
part of the reusable ops surface.

## Product Boundary

- **SemStreams UI owns** generic operator workflows: graph explorer, search UI,
  flow builder, component/runtime admin surfaces, chat/context integration,
  proxy routing, generated API bindings, SemSource-compatible E2E scaffolding,
  and reusable Svelte components.
- **SemStreams owns** backend primitives, HTTP/GraphQL APIs, OpenAPI generation,
  graph ingestion/query/runtime services, and framework semantics.
- **SemSource owns** source-specific semantics: source discovery, parsers,
  provenance, source status models, media/binary by-reference behavior, and any
  product workflow that is meaningful only to source management.
- **SemDev owns** development-specific semantics: trajectory interpretation,
  evaluation workflows, approval policy, and product actions that go beyond
  generic read-side trajectory visibility.
- **Other sem\* products own** their domain semantics. This UI should expose
  generic extension points and generic views, not absorb product-specific logic.

## Architecture

The browser talks to one origin served by Caddy. Caddy proxies backend requests
and serves the SvelteKit app:

```text
Browser -> Caddy (:3001) --+--> /flowbuilder/* -> backend service
                           +--> /components/*  -> backend service
                           +--> /health        -> backend service
                           +--> /trajectories* -> backend service
                           +--> /graphql       -> graph gateway
                           +--> /*             -> SvelteKit/Vite
```

The `/flowbuilder/*` browser namespace is intentional. The SemStreams OpenAPI may
advertise backend handlers as `/flows`, `/deployment/{id}/...`, or
`/status/stream`, but `/flows` is a SvelteKit page route in this UI. UI code must
use the proxy namespace unless and until the app routing changes.

## Technical Conventions

- Svelte 5 runes: `$state`, `$derived`, `$effect`, `$props`.
- SvelteKit fetches use relative URLs and rely on Caddy or `hooks.server.ts`.
- Generated API types come from `../semstreams/specs/openapi.v3.yaml` during
  local C360 development.
- Keep the frontend backend-agnostic. Do not hardcode SemSource-only entity IDs,
  source types, or parser names outside SemSource E2E fixtures.
- Prefer real backend/E2E checks for graph and runtime behavior. Use mocked tests
  for component states and failure edges.

## OpenSpec Discipline

Use OpenSpec for non-trivial UI features, route/proxy contract changes, generated
type migrations, and SemSource ops-console slices. Seed specs lazily from the
current code and docs when a capability is first touched.

Validation:

```bash
task openspec:validate
```
