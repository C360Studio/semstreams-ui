# backend-compatibility Specification

## Purpose

Browser-facing backend compatibility contracts for SemStreams UI. These specs
pin the same-origin proxy routes, generated API binding expectations, and route
collision rules that keep the reusable SvelteKit app compatible with
SemStreams-compatible backends.

## Requirements

### Requirement: Browser flow/runtime calls use the proxy namespace

UI code MUST call flow CRUD, deployment, runtime polling, and runtime websocket
endpoints through `/flowbuilder/*`. This namespace is the browser-facing
compatibility contract, even when generated backend OpenAPI paths describe the
same handlers as `/flows`, `/deployment/{id}/...`, or `/status/stream`.

The namespace avoids collisions with SvelteKit page routes such as `/flows` and
keeps all backend calls same-origin through Caddy.

#### Scenario: runtime messages do not fall through to SvelteKit

- **GIVEN** a user opens the runtime Messages tab for flow `flow-123`
- **WHEN** the tab loads historical messages
- **THEN** the browser requests `/flowbuilder/flows/flow-123/runtime/messages`
- **AND** Caddy proxies the request to the backend service

#### Scenario: UI pages keep owning `/flows`

- **GIVEN** a user navigates to `/flows`
- **WHEN** Caddy receives the request
- **THEN** the request is served by the SvelteKit app
- **AND** it is not treated as a backend flow API request

### Requirement: GraphQL is routed consistently in every proxy mode

Caddy MUST keep `/graphql` as the browser-facing GraphQL route while allowing
the upstream host and path to vary. `GRAPHQL_HOST` selects the upstream host,
falling back to `BACKEND_HOST`. `GRAPHQL_PATH` selects the upstream GraphQL path,
falling back to `/graphql` except in SemSource E2E where the current
ServiceManager-mounted default is `/graph-gateway/graphql`.

This rule applies to production, dev, and E2E proxy configs so
SemStreams-compatible apps can either share the service-manager API host, pin a
separate graph-gateway host, or use the latest ServiceManager-mounted
graph-gateway route.

#### Scenario: E2E graph gateway follows the backend host by default

- **GIVEN** the SemSource E2E stack starts with `BACKEND_HOST=backend:8080`
- **AND** no explicit `GRAPHQL_HOST` override is provided
- **AND** `GRAPHQL_PATH` defaults to `/graph-gateway/graphql`
- **WHEN** the graph explorer posts a GraphQL query to `/graphql`
- **THEN** Caddy forwards that request to
  `backend:8080/graph-gateway/graphql`
- **AND** `/flowbuilder/*` and `/components/*` continue to target
  `backend:8080`

#### Scenario: GraphQL host can be pinned separately

- **GIVEN** `BACKEND_HOST=backend:8080`
- **AND** `GRAPHQL_HOST=graph-gateway:8082`
- **AND** `GRAPHQL_PATH=/graphql`
- **WHEN** the graph explorer posts a GraphQL query to `/graphql`
- **THEN** Caddy forwards that request to `graph-gateway:8082/graphql`
- **AND** `/flowbuilder/*` and `/components/*` continue to target
  `backend:8080`

### Requirement: Trajectory reads use the backend proxy namespace

UI code MUST call trajectory summary/detail endpoints through same-origin
`/trajectories` browser paths. Caddy MUST proxy both `/trajectories` and
`/trajectories/*` to the SemStreams-compatible backend in production, dev, and
E2E modes.

Trajectory reads are generic framework evidence for human inspection. The UI
MUST NOT route these paths to SvelteKit pages unless a later page-level
trajectory viewer explicitly replaces the raw backend drill-down.

#### Scenario: trajectory summary and detail requests reach the backend

- **GIVEN** a user opens the ops console trajectory panel
- **WHEN** the UI requests `/trajectories?limit=5`
- **THEN** Caddy proxies the request to the backend service
- **WHEN** the user opens `/trajectories/loop-123`
- **THEN** Caddy proxies the detail request to the backend service
- **AND** the SvelteKit catch-all route does not handle either request

### Requirement: Generated API bindings track current SemStreams OpenAPI

The committed `src/lib/types/api.generated.ts` MUST be generated from the
current SemStreams OpenAPI used for local C360 development. Generated type drift
MUST be reviewed with route compatibility in mind before any UI path constants
are changed.

#### Scenario: OpenAPI path drift does not rewrite browser routes blindly

- **GIVEN** the generated OpenAPI paths include `/flows/{id}/runtime/messages`
- **WHEN** frontend code needs the historical messages endpoint
- **THEN** the browser URL remains `/flowbuilder/flows/{id}/runtime/messages`
- **AND** tests assert the browser-facing proxy route
