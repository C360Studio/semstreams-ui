# Backend Compatibility

## ADDED Requirements

### Requirement: UI-owned ops-profile E2E fixture exposes generic read paths

SemStreams UI MUST provide an in-repo, deterministic ops-profile fixture for
owned E2E gates. The fixture MUST expose the same same-origin backend routes the
homepage ops console uses in production-like proxy mode: `/health`,
`/components/types`, `/flowbuilder/flows`, active-flow runtime health, metrics,
and messages, `/graphql`, and `/trajectories` summary/detail.

The fixture data MUST remain generic SemStreams UI data. It MUST NOT hardcode
SemSource parser names, SemDev trajectory judgments, or product-specific
mutation actions.

#### Scenario: owned fixture satisfies homepage read paths

- **GIVEN** the ops-profile E2E stack is running
- **WHEN** the homepage ops console hydrates its summary and graph state
- **THEN** `/health`, `/flowbuilder/flows`, active-flow runtime endpoints,
  `/graphql`, and `/trajectories` return deterministic successful responses
- **AND** the UI does not require a SemSource, SemDev, or sibling SemStreams
  checkout to complete the owned gate

#### Scenario: fixture routes stay read-only

- **GIVEN** the ops-profile fixture is running
- **WHEN** a test exercises the homepage ops console
- **THEN** fixture responses only support read-side dashboard, graph, search,
  runtime, and trajectory inspection behavior
- **AND** no fixture endpoint is required for approve, retry, cancel, resume,
  delete, score, classify, or product-specific actions
