# SemSource E2E Integration Architecture

SemSource is a semstreams application. It runs the full graph pipeline internally - no separate semstreams
backend is needed for graph data. The UI queries SemSource's graph-gateway through the same-origin
`/graphql` browser route, while Caddy rewrites that request to the upstream route exposed by the backend.

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│ Host Machine (Playwright)                                           │
│                                                                     │
│  Playwright Tests ──► http://localhost:3000                         │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│ Docker Network (e2e-net)                                            │
│                                                                     │
│  ┌───────────────── SemSource ─────────────────────────┐            │
│  │                                                     │            │
│  │  fixture/ ──► ast-source ──► NATS (graph.ingest.>)  │            │
│  │               doc-source         │                  │            │
│  │               cfgfile-source     ▼                  │            │
│  │                            graph-ingest             │            │
│  │                                  │                  │            │
│  │                         ENTITY_STATES KV            │            │
│  │                                  │                  │            │
│  │                            graph-index              │            │
│  │                                  │                  │            │
│  │                            graph-query              │            │
│  │                                  │                  │            │
│  │          graph-gateway (:8080/graph-gateway/graphql)│            │
│  │                                  │                  │            │
│  │  + websocket-output (:7890)      │                  │            │
│  │    (for SemSpec/SemDragon)       │                  │            │
│  └──────────────────────────────────┼──────────────────┘            │
│                                     │                               │
│  ┌─────────┐                        │    ┌──────────┐               │
│  │ backend │  /flowbuilder/*        │    │    UI    │               │
│  │ :8080   │  /components/*         │    │ (Vite)   │               │
│  │         │  /health               │    └────┬─────┘               │
│  └────┬────┘                        │         │                     │
│       │         ┌──────────┐        │         │                     │
│       └────────►│  Caddy   │◄───────┘─────────┘                     │
│                 │ :3000    │                                         │
│                 └──────────┘                                         │
│                      │                                              │
│                 exposed to host                                      │
└─────────────────────────────────────────────────────────────────────┘
```

SemSource port map:

- `:8080` — service manager APIs plus embedded GraphQL at
  `/graph-gateway/graphql`
- `:7890` — websocket output (entity stream for SemSpec/SemDragon)
- `:9091` — metrics (Prometheus `/metrics`)

Caddy routing:

- `/graphql` → `GRAPHQL_HOST` and `GRAPHQL_PATH`; the SemSource E2E default is
  `backend:8080/graph-gateway/graphql`
- `/flowbuilder/*`, `/components/*`, `/health`, `/trajectories*` →
  backend:8080 (service manager)
- `/*` → ui:5173 (Vite dev server)

(`backend` is a network alias for the SemSource container.)

## Why SemSource IS the Backend (for graph data)

SemSource registers all semstreams components via `componentregistry.Register()` and builds its own semstreams
config internally (`buildSemstreamsConfig`). The graph pipeline runs inside SemSource:

1. Source components publish entities to NATS JetStream (`graph.ingest.entity` on GRAPH stream)
2. `graph-ingest` consumes from GRAPH stream, writes ENTITY_STATES KV bucket
3. `graph-index` watches ENTITY_STATES, builds OUTGOING/INCOMING/ALIAS/PREDICATE indexes
4. `graph-query` handles NATS request/reply for entity, relationships, pathSearch
5. `graph-gateway` serves HTTP GraphQL through ServiceManager at
   `:8080/graph-gateway/graphql` in the E2E stack
6. `websocket-output` consumes from GRAPH stream via JetStream and serves WS at
   `:7890/graph` for external consumers

No WebSocket hop, no federation processor, no bridge. Direct graph pipeline.

## E2E Fixture

A small, deterministic Go project checked into this repo:

```
e2e/fixtures/semsource/
├── semsource-e2e.json          # semsource config (namespace: e2e, watch: false)
├── src/
│   ├── main.go                 # ~24 lines, imports context/fmt/log/os/signal
│   ├── handler.go              # ~45 lines, Handler interface + DefaultHandler impl
│   └── handler_test.go         # ~15 lines
├── go.mod                      # module fixture-project, go 1.22
├── README.md                   # short doc
└── Dockerfile                  # minimal Dockerfile
```

Produces known entities:

- **AST**: `e2e.semsource.golang.fixture.function.src-main-go-main`,
  `e2e.semsource.golang.fixture.interface.src-handler-go-Handler`, etc.
- **Docs**: `e2e.semsource.web.fixture.doc.87457b`
- **Config**: `e2e.semsource.config.fixture.gomod.fixture-project`,
  `e2e.semsource.config.fixture.image.golang-1-22-alpine`

Total: ~16-27 entities (including duplicates from relationship triples). Fast ingestion (<2s).

Key config decisions:

- `watch: false` — ingest once, emit SEED events, no file watching (deterministic)
- `namespace: "e2e"` — distinct from production
- No `git`, `url`, or media sources — avoids network access during tests

## Docker Compose Setup

SemSource is activated via Docker Compose profile:

```bash
COMPOSE_PROFILES=semsource docker compose -f docker-compose.e2e.yml up
```

By default, Caddy routes the browser's `/graphql` request to
`backend:8080/graph-gateway/graphql`, where `backend` is the SemSource
container alias in the E2E network. Set `GRAPHQL_HOST` when testing an app with
a separately exposed graph-gateway host, and set `GRAPHQL_PATH=/graphql` when
that gateway is standalone instead of ServiceManager-mounted.

## E2E Test Structure

```
e2e/
├── semsource-graph/
│   ├── graph-rendering.spec.ts      # Entities appear in DataView
│   ├── graph-interaction.spec.ts    # Select, hover, expand
│   ├── graph-filtering.spec.ts      # Filter by type/domain
│   └── helpers/
│       └── semsource-helpers.ts     # Wait-for-entity utilities
├── fixtures/
│   └── semsource/                   # Fixture Go project + config
```

## Determinism Strategy

1. **Fixed fixtures** — checked into repo, entity IDs derive from file paths, symbol names, and namespace
2. **Polling with known IDs** — `waitForSemsourceEntities()` polls GraphQL until entities appear
3. **watch: false** — one SEED event per entity, no DELTAs or file-watching races
4. **Generous timeouts** — 30s wait (actual: 2-5s, Docker startup adds latency)
5. **Prefix assertions** — assert `e2e.semsource.*` entities exist, not exact counts

## Running

```bash
# Full SemSource graph E2E
COMPOSE_PROFILES=semsource BACKEND_CONTEXT=../semstreams SEMSOURCE_CONTEXT=../semsource \
  npx playwright test e2e/semsource-graph/

# Core E2E only (no SemSource)
BACKEND_CONTEXT=../semstreams npx playwright test --ignore-pattern='semsource-graph/**'
```
