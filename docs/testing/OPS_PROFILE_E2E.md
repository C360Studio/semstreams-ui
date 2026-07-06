# Ops Profile E2E Gate

The ops-profile E2E gate is the UI-owned release gate for the generic ops
console. It runs against a deterministic in-repo SemStreams-compatible fixture
instead of requiring SemSource, SemDev, or another sibling backend checkout.

Run it with:

```bash
task test:e2e:ops-profile
```

The fixture exposes the read-side routes used by the homepage:

- `/health`
- `/components/types`
- `/flowbuilder/flows`
- `/flowbuilder/flows/{id}/runtime/health`
- `/flowbuilder/flows/{id}/runtime/metrics`
- `/flowbuilder/flows/{id}/runtime/messages`
- `/graphql`
- `/trajectories`
- `/trajectories/{loopId}`

SemSource and SemDev acceptance tests should still prove downstream integration.
This gate proves the reusable SemStreams UI contract first.
