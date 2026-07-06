## MODIFIED Requirements

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
