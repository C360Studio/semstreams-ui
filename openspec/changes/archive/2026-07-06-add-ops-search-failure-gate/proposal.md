# Add Ops Search Failure Gate

## Why

The ops search panel has local error handling, but the owned ops-profile gate
does not yet prove that a submitted entity-search failure stays local while the
graph, admin, and trajectory surfaces remain useful. SemSource and SemDev both
need search to be easy without turning every GraphQL hiccup into a dashboard
failure.

## What Changes

- Add an owned Playwright scenario for search-only GraphQL degradation.
- Keep initial graph hydration and ops summary healthy, then fail only the
  submitted `GetEntitiesByPrefix` search request.
- Assert the search panel reports the error while graph, admin, and trajectory
  areas remain visible.

## Non-Goals

- No backend fixture mutation or test-mode state.
- No product-specific SemSource or SemDev search semantics.
- No search result mutation, retry, approval, scoring, or classification
  controls.
