# Design

## Mobile Ordering

The desktop ops console can keep dense read-side panels above the graph because
the viewport has enough vertical space. On narrow screens, the shell should use
normal page scrolling and place the graph before heavier inspection panels. This
preserves the graph-first contract without removing admin, search, trajectory,
or readiness surfaces.

## Gate Shape

The owned ops-profile E2E gate should set a narrow viewport, load the homepage,
and assert that the graph surface and canvas are visible in the first viewport.
It should also scroll to the admin area and prove the readiness matrix remains
available.
