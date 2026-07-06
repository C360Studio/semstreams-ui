# Design - Read-Only Trajectory Inspector

## Context

The current ops console already hydrates recent trajectory summaries through
`opsSummaryApi.fetchSummary()` and renders the latest loop in the read-side
admin panel. The browser/proxy contract for `/trajectories` and
`/trajectories/*` is already pinned by `backend-compatibility`.

This change turns that summary into an inspectable UI without expanding shared
frontend ownership into product judgment or workflow control.

## Decisions

1. Reuse the ops summary list as the inspector's list source.

   The homepage already fetches `/trajectories?limit=5` for the ops summary.
   Reusing those items avoids a second list request on page load and keeps the
   inspector in sync with the rest of the read-side admin surface.

2. Fetch full trajectory detail on demand.

   The inspector requests `/trajectories/{loopId}` only when a user selects a
   summary item. This keeps initial homepage load light and allows the detail
   endpoint to degrade independently from the summary endpoint.

3. Normalize detail data in a small service.

   The UI consumes a compact normalized detail model: loop ID, outcome, timing,
   token totals, and steps. The service keeps endpoint errors structured and
   avoids scattering generated OpenAPI field names throughout Svelte markup.

4. Keep the inspector read-only and generic.

   The component displays loop/task IDs, outcome, duration, token totals, model
   or tool context, error messages, and step ordering. It does not approve,
   retry, score, classify, or recommend next actions.

## Risks / Trade-offs

- Detail payloads can contain large prompts, responses, tool outputs, or
  message bodies. The first inspector shows compact summaries and metadata,
  leaving richer payload viewers for a later governed slice.
- Some backends may expose summaries but return 404/503 for detail. The
  inspector treats detail failures as local detail-panel errors instead of
  invalidating the whole ops summary.
- The inspector is embedded in the homepage admin surface rather than adding a
  dedicated `/trajectories/[id]` route. That keeps scope small and preserves the
  raw backend detail link for now.

## Open Questions

- Which full payload fields should get a dedicated expandable viewer after
  SemDev exercises this read-only inspector?
- Should a later SvelteKit route provide deep-linkable trajectory inspection
  while Caddy continues to proxy raw backend `/trajectories/*` paths?
