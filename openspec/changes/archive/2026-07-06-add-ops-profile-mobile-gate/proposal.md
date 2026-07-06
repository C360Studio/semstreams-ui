# Add Ops Profile Mobile Gate

## Why

The readiness matrix made the ops admin area denser, and the owned E2E gate
already caught a desktop layout regression where the graph was present but not
usable. SemSource and SemDev users may open the optional ops console on narrow
screens during incident or review work, so the generic graph-first guarantee
needs a narrow-viewport gate too.

## What Changes

- Keep the graph explorer first and usable on narrow viewports.
- Move heavier read-side admin, trajectory, search, and overview panels below
  the graph on narrow screens while keeping them accessible by scrolling.
- Extend the owned ops-profile Playwright gate with a mobile/narrow viewport
  assertion.

## Non-Goals

- No mobile-specific product semantics.
- No mutation controls.
- No separate mobile app or navigation system.
