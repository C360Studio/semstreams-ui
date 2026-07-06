# Downstream Ops Console

## ADDED Requirements

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

### Requirement: Search is easy from the ops surface

The ops console MUST provide a low-friction search path for downstream graph
entities. Search results MUST be selectable, must connect to entity detail, and
must preserve enough context for chat/search-assisted investigation.

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

### Requirement: Admin, runtime, and trajectory status are read-first

The first downstream ops dashboard MUST expose safe read-side admin information
before adding mutation controls. Health, runtime status, messages, metrics, flow
drill-downs, and trajectory summaries are in scope. Source-specific write
actions and product-specific trajectory actions require later downstream-owned
contracts.

The ops summary model MUST hydrate from generic SemStreams read paths:
`/health`, `/flowbuilder/flows`, active-flow runtime endpoints,
`/trajectories`, and `/graphql`. It MUST report endpoint availability and
degradation without throwing away the rest of the summary, and it MUST derive
source status from generic read-path availability rather than SemSource-specific
parser or source-type semantics.

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
