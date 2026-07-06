# Design

## Route Interception

The degraded gate should use Playwright route interception instead of fixture
global state. The ops-profile stack can stay deterministic and parallel-safe,
while each browser page owns its own degraded responses.

## Failure Shape

The scenario should keep `/health` and `/flowbuilder/flows` healthy while
forcing `/graphql`, `/trajectories?limit=5`, and one active runtime endpoint to
return service-level failures. This proves per-endpoint degradation without
needing a separate backend checkout or source product fixture.
