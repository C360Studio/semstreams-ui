# Downstream Ops Console

## ADDED Requirements

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
