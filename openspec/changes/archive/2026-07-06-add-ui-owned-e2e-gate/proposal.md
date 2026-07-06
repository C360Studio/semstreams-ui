# Proposal - Add UI-Owned E2E Gate

## Why

SemStreams UI needs a release gate it owns before downstream products such as
SemSource and SemDev become the only proof that the ops console works. Existing
SemSource graph E2E coverage is useful acceptance coverage, but it depends on a
sibling product stack and is intentionally excluded from the default Playwright
run.

The repo should carry a deterministic SemStreams-compatible UI profile that
exercises the browser-facing ops contract: dashboard shell, graph search,
overview, runtime/admin summary, and trajectory inspection.

## What Changes

- Add an in-repo ops-profile fixture backend that exposes the read-side
  SemStreams routes used by the homepage ops console.
- Add a dedicated Playwright config and task for the ops-profile gate.
- Add Playwright coverage for the owned ops journey: homepage composition,
  graph load, entity search/selection, graph overview, and trajectory detail.
- Add CI coverage for the owned gate.

## Non-Goals

- Do not replace SemSource/SemDev downstream acceptance tests.
- Do not add product-specific source or trajectory semantics to SemStreams UI.
- Do not expand the legacy broad E2E lane in this slice.
