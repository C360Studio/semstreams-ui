# semsource-ops-console Specification Delta

## MODIFIED Requirements

### Requirement: Downstream users land in a graph-first ops experience

The default SemStreams UI experience MUST prioritize graph exploration and
search over marketing or setup content for downstream products such as SemSource
and SemDev. The first viewport MUST show the graph explorer when graph data is
available, and degraded/empty states MUST explain backend or graph availability
without blocking navigation to admin and flow views.

The homepage route MUST compose the graph explorer inside an ops-console shell
with persistent graph, search, runtime/admin, and source-health areas. The shell
MUST remain generic SemStreams UI and MUST NOT hardcode SemSource-only source
types, SemDev-only trajectory interpretation, parser names, or fixture
identifiers.

The ops shell MUST expose current graph-view context: entity count,
relationship count, filtered count, selected entity context when available, and
active filter count. The graph overview MAY provide frontend-only controls that
clear selection or reset graph filters. It MUST NOT mutate backend graph data or
trigger source-specific/product-specific actions.

The repo MUST include an owned Playwright gate that proves this graph-first ops
composition against a deterministic SemStreams-compatible UI profile. Downstream
SemSource and SemDev acceptance checks MAY add product-specific confidence, but
they MUST NOT be the only gate for generic ops-console regressions.

#### Scenario: graph data is available

- **GIVEN** SemSource exposes GraphQL graph data
- **WHEN** a user opens the UI homepage
- **THEN** the user sees the graph explorer
- **AND** can inspect or select SemSource fixture/source entities

#### Scenario: graph data is unavailable

- **GIVEN** the UI cannot reach `/graphql`
- **WHEN** a user opens the UI homepage
- **THEN** the UI shows a recoverable graph-service error
- **AND** navigation to flow/admin views remains available

#### Scenario: first dashboard composition is visible

- **GIVEN** a SemStreams-compatible backend is connected
- **WHEN** a user opens the UI homepage
- **THEN** the route exposes graph, search, runtime/admin, and source-health
  areas
- **AND** the graph explorer remains the primary work surface
- **AND** source-specific or product-specific controls are not shown before a
  downstream-owned contract exists

#### Scenario: graph overview reflects current view state

- **GIVEN** graph entities are loaded into the homepage graph store
- **WHEN** a user filters or selects an entity
- **THEN** the ops shell shows current graph counts, filtered counts, active
  filter count, and selected entity context
- **AND** the graph explorer remains visible

#### Scenario: graph overview controls stay frontend-only

- **GIVEN** a graph selection or filters are active
- **WHEN** a user reviews graph overview controls
- **THEN** they can clear the local selection or reset local filters
- **AND** they cannot create, update, delete, approve, retry, or trigger
  product-specific backend actions from the overview

#### Scenario: owned ops-profile gate proves generic graph-first behavior

- **GIVEN** the in-repo ops-profile E2E fixture is running
- **WHEN** Playwright opens the homepage
- **THEN** graph, search, runtime/admin, source-health, graph overview, and
  trajectory inspector areas are visible
- **AND** searching for a known generic fixture entity opens entity detail
- **AND** graph overview counts and selection state update without hiding the
  graph explorer
- **AND** no downstream product checkout is required for the gate
