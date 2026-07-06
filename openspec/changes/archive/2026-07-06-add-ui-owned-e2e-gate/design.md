# Design - Add UI-Owned E2E Gate

## Fixture Boundary

The fixture is a small SemStreams-compatible HTTP service owned by this repo. It
implements only the browser-facing read paths used by the ops console:

- `/health`
- `/components/types`
- `/flowbuilder/flows`
- `/flowbuilder/flows/{id}/runtime/health`
- `/flowbuilder/flows/{id}/runtime/metrics`
- `/flowbuilder/flows/{id}/runtime/messages`
- `/graphql`
- `/graph-gateway/graphql`
- `/trajectories`
- `/trajectories/{loopId}`

The data is static and product-neutral. Entity IDs use the generic six-part
SemStreams shape so the existing graph transforms, filters, and detail panels
exercise real frontend behavior.

## Test Lane

The new lane uses its own compose file and Playwright config:

- `docker-compose.ops-profile.yml`
- `playwright.ops-profile.config.ts`
- `e2e/ops-profile/*.spec.ts`

This keeps the owned release gate separate from the historical default E2E lane
and from SemSource acceptance E2E. The task entry point is
`task test:e2e:ops-profile`.

## CI

CI should run the owned ops-profile E2E gate because it does not require a
sibling backend checkout. SemSource/SemDev compatibility remains a downstream or
pre-release concern.
