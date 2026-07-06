# Add Ops Profile Degraded Gate

## Why

The owned ops-profile gate proves the happy path and narrow viewport layout, but
the durable spec also requires degraded graph, trajectory, and runtime endpoints
to fail independently without hiding the rest of the ops console. That behavior
is important for SemSource and SemDev incident/review workflows where one
backend read path may be down while other evidence remains useful.

## What Changes

- Add an owned Playwright degraded-endpoint scenario using browser route
  interception against the existing ops-profile fixture.
- Force graph query, trajectory summary, and one runtime endpoint to fail while
  leaving health and flow discovery available.
- Assert the graph error, readiness matrix evidence, admin panel, and
  navigation surfaces remain visible.

## Non-Goals

- No mutable test-mode state in the ops-profile fixture.
- No product-specific SemSource or SemDev degradation semantics.
- No mutation, retry, approval, resume, delete, scoring, or classification
  controls.
