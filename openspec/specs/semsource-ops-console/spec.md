# semsource-ops-console Specification

## Purpose

Reusable downstream ops-console behavior for SemStreams UI, with SemSource as
the first acceptance target and SemDev as an additional read-side trajectory
visibility customer. The spec keeps the shared UI generic while preserving the
dashboard, admin, graph visualization, and search affordances needed by
downstream sem\* products.
## Requirements
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

On narrow viewports, the ops shell MUST keep the graph explorer visible and
usable before heavier read-side admin, trajectory, search, and overview panels.
Those panels MAY move below the graph and be reached by scrolling, but they MUST
remain available and MUST NOT hide the graph-first work surface.

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

#### Scenario: owned ops-profile gate proves narrow graph-first behavior

- **GIVEN** the in-repo ops-profile E2E fixture is running
- **WHEN** Playwright opens the homepage with a narrow viewport
- **THEN** the graph explorer and graph canvas are visible in the first viewport
- **AND** read-side admin and readiness matrix areas remain reachable by
  scrolling
- **AND** no downstream product checkout is required for the gate

#### Scenario: owned ops-profile gate proves degraded graph survival

- **GIVEN** the in-repo ops-profile E2E fixture is running
- **AND** the browser receives degraded GraphQL responses
- **WHEN** Playwright opens the homepage
- **THEN** the graph area shows a recoverable graph-service error
- **AND** ops navigation, read-side admin, and readiness matrix areas remain
  visible
- **AND** no downstream product checkout is required for the gate

### Requirement: Search is easy from the ops surface

The ops console MUST provide a low-friction search path for downstream graph
entities. Search results MUST be selectable, must connect to entity detail, and
must preserve enough context for chat/search-assisted investigation.

The homepage ops shell MUST expose a visible generic entity search panel. The
panel MUST search through the existing `/graphql` browser route, MUST render
loading, empty, and per-search error states locally, and MUST keep the graph
explorer visible while a search is performed. Selecting a result MUST make the
entity available to the graph store and open existing entity detail context.

The panel MUST remain generic SemStreams UI. It MUST NOT hardcode SemSource
parser names, source-specific entity types, SemDev trajectory judgments, or
backend mutation actions.

#### Scenario: a user searches for a known source entity

- **GIVEN** SemSource has ingested source entities into the graph
- **WHEN** the user searches for a function, document, or config entity
- **THEN** matching graph entities are shown
- **AND** selecting a result opens entity detail without losing graph context

#### Scenario: SemSource fixture search is accepted on the homepage

- **GIVEN** SemSource fixture graph entities are available through `/graphql`
- **WHEN** the user opens the homepage and searches for a known fixture function
- **THEN** the graph-first ops console stays visible
- **AND** selecting the fixture result opens entity detail
- **AND** the graph canvas remains visible for follow-on investigation

#### Scenario: search failure is local to the search panel

- **GIVEN** the graph explorer is visible
- **AND** `/graphql` returns an error for entity search
- **WHEN** a user submits an entity search
- **THEN** the search panel shows the search-level error
- **AND** the graph explorer, admin panel, and trajectory inspector remain
  visible

#### Scenario: search controls are read-only

- **GIVEN** search results are visible
- **WHEN** a user reviews result controls
- **THEN** they can select an entity for inspection
- **AND** they cannot create, update, delete, approve, retry, or trigger
  product-specific actions from the search panel

#### Scenario: owned ops-profile gate proves local search failure

- **GIVEN** the in-repo ops-profile E2E fixture is running
- **AND** initial graph and ops summary reads remain healthy
- **AND** the submitted entity-search GraphQL request returns an error
- **WHEN** Playwright submits an entity search from the homepage
- **THEN** the search panel reports the search-level error
- **AND** graph, read-side admin, and trajectory inspector areas remain visible
- **AND** no downstream product checkout is required for the gate

### Requirement: Admin, runtime, and trajectory status are read-first

The first downstream ops dashboard MUST expose safe read-side admin information
before adding mutation controls. Health, runtime status, messages, metrics, flow
drill-downs, trajectory summaries, and generic endpoint readiness are in scope.
Source-specific write actions and product-specific trajectory actions require
later downstream-owned contracts.

The ops summary model MUST hydrate from generic SemStreams read paths:
`/health`, `/flowbuilder/flows`, active-flow runtime endpoints,
`/trajectories`, and `/graphql`. It MUST report endpoint availability and
degradation without throwing away the rest of the summary, and it MUST derive
source status from generic read-path availability rather than SemSource-specific
parser or source-type semantics.

The ops console MUST expose a read-only readiness matrix for generic browser
read paths. The matrix MUST show each path's label, browser-facing path or
derived summary basis, availability status, human-readable message, HTTP status
when known, and count evidence when known. It MUST preserve degraded/unavailable
rows independently so operators can see which backend contract failed without
hiding graph, search, admin, or trajectory inspection areas.

#### Scenario: an operator investigates runtime health

- **GIVEN** SemSource exposes `/health` and runtime endpoints
- **WHEN** an operator opens the admin/runtime area
- **THEN** the UI shows system health and component/runtime status
- **AND** any unavailable endpoint degrades with an actionable error state

#### Scenario: read-side admin affordances are available first

- **GIVEN** a SemStreams-compatible backend exposes generic read paths
- **WHEN** an operator opens the ops console
- **THEN** the operator can refresh the ops summary without starting,
  stopping, deleting, or mutating backend resources
- **AND** the operator can inspect backend, graph, source, and runtime endpoint
  health
- **AND** the operator can drill down to the active flow/runtime view
- **AND** the operator can copy selected entity and active flow identifiers
- **AND** no source-specific or product-specific mutation controls are shown

#### Scenario: SemDev trajectory visibility is generic and read-only

- **GIVEN** a SemStreams-compatible backend exposes trajectory summaries
- **WHEN** an operator opens the ops console
- **THEN** the operator can see trajectory availability, total count, latest
  loop identity, role/workflow context, outcome, and iteration count
- **AND** the operator can open the latest trajectory read endpoint
- **AND** the operator can copy the latest trajectory loop identifier
- **AND** the UI does not interpret trajectory quality, approval policy, or
  product-specific next actions

#### Scenario: summary model degrades per endpoint

- **GIVEN** `/health` is reachable
- **AND** `/graphql` returns an error
- **AND** `/trajectories` is unavailable
- **AND** one active-flow runtime endpoint is unavailable
- **WHEN** the ops summary hydrates
- **THEN** the model reports backend health separately from graph, trajectory,
  and runtime degradation
- **AND** the source status is degraded from generic read-path evidence
- **AND** no SemSource-specific parser, file type, or fixture identifier is
  required

#### Scenario: readiness matrix shows generic read-path evidence

- **GIVEN** the ops summary includes mixed healthy, degraded, unavailable, and
  derived status entries
- **WHEN** an operator opens the read-side admin area
- **THEN** the readiness matrix lists backend health, graph query, flow list,
  runtime health, runtime metrics, runtime messages, trajectory summary, and
  generic source rows
- **AND** each row shows status and message evidence independently
- **AND** HTTP status and count evidence are shown when available
- **AND** graph, search, admin, and trajectory inspector areas remain visible

#### Scenario: readiness matrix remains read-only

- **GIVEN** readiness rows are visible
- **WHEN** an operator reviews the matrix controls
- **THEN** they can inspect route labels, paths, status, messages, and evidence
- **AND** they cannot create, update, delete, approve, retry, cancel, resume,
  score, classify, or trigger product-specific actions from the matrix

#### Scenario: owned ops-profile gate proves per-endpoint degradation

- **GIVEN** the in-repo ops-profile E2E fixture is running
- **AND** graph, trajectory summary, and one runtime endpoint are degraded
- **WHEN** Playwright opens the homepage
- **THEN** the readiness matrix reports each degraded endpoint independently
- **AND** backend health and flow discovery remain available
- **AND** no downstream product checkout is required for the gate

### Requirement: The ops console exposes a read-only trajectory inspector

The ops console MUST provide a generic read-only trajectory inspector for
SemStreams-compatible backends that expose trajectory summaries and detail. The
inspector MUST list recent trajectories from the existing ops summary data and
MUST fetch full detail on demand from `/trajectories/{loopId}` when a user
selects a loop.

The inspector MUST show loop identity, task identity when available, role or
workflow context, outcome, duration, token totals, and a step timeline with
step type, timestamp, model/provider/tool context, retry count, token counts,
and error evidence when present. The inspector MUST preserve empty, loading,
unavailable, and detail-error states without hiding the rest of the ops console.

The inspector MUST remain read-only. It MUST NOT expose approval, retry,
cancel, resume, delete, scoring, classification, or product-specific next-action
controls.

#### Scenario: an operator inspects a trajectory timeline

- **GIVEN** the ops summary includes recent trajectory summaries
- **WHEN** an operator selects one trajectory
- **THEN** the UI requests `/trajectories/{loopId}`
- **AND** displays summary metadata and step timeline details
- **AND** keeps graph and admin context visible

#### Scenario: trajectory detail fails independently

- **GIVEN** `/trajectories?limit=5` returned recent summaries
- **AND** `/trajectories/{loopId}` returns an error
- **WHEN** an operator selects that trajectory
- **THEN** the inspector shows a detail-level error
- **AND** the rest of the ops summary remains visible

#### Scenario: no mutation controls are available

- **GIVEN** a trajectory detail is visible
- **WHEN** an operator reviews the inspector controls
- **THEN** they can copy loop and task identifiers
- **AND** they can open the raw trajectory endpoint
- **AND** they cannot approve, retry, cancel, resume, delete, score, classify,
  or trigger product-specific next actions

