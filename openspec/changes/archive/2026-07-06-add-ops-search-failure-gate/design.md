# Design

## Conditional GraphQL Interception

The gate should continue to use the existing deterministic ops-profile fixture.
Playwright can inspect browser GraphQL request bodies and fulfill only
`GetEntitiesByPrefix` search requests with a GraphQL error. Other GraphQL
requests should continue to the backend so homepage graph hydration and ops
summary remain healthy.

## Locality Assertion

The scenario should assert the search panel's alert, then re-check the graph
canvas, read-side admin panel, and trajectory inspector. This proves the search
failure is local to the search surface rather than a route-level outage.
