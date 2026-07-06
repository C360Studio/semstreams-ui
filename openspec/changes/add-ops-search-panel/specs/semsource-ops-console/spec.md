# semsource-ops-console Specification Delta

## MODIFIED Requirements

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
