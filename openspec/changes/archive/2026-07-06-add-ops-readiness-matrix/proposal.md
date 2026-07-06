# Add Ops Readiness Matrix

## Why

The first ops-console slice exposes read-side admin status, but operators still
have to scan separate panels to understand which generic backend route is
healthy, degraded, or unavailable. SemSource and SemDev both need a quick,
product-agnostic dashboard signal before they add any product-specific actions.

## What Changes

- Add a compact read-only readiness matrix to the ops console admin surface.
- Show generic browser-facing read paths, status, message, HTTP status when
  available, and count evidence when available.
- Include backend health, graph query, flow list/runtime, trajectory, and
  generic source-readiness rows without SemSource/SemDev semantics.
- Extend the owned ops-profile E2E gate to prove the matrix is visible against
  the deterministic fixture.

## Non-Goals

- No mutation, retry, approval, resume, delete, scoring, or product-specific
  trajectory controls.
- No SemSource parser/source-type labels.
- No SemDev trajectory quality interpretation.
