# Tasks - Bootstrap SemSource Ops Console Governance

## 1. Governance And Contract Refresh

- [x] 1.1 Add OpenSpec project files and change proposal.
- [x] 1.2 Add OpenSpec validation tasks to the Taskfile.
- [x] 1.3 Refresh generated TypeScript API bindings from current SemStreams
      OpenAPI.
- [x] 1.4 Add a Node 22 `.nvmrc` matching the documented toolchain.
- [x] 1.5 Align OpenSpec config and change artifacts with the 1.5
      `spec-driven` workflow.

## 2. Proxy Compatibility

- [x] 2.1 Add production `/graphql` Caddy routing with `GRAPHQL_HOST` fallback.
- [x] 2.2 Make E2E `/graphql` routing honor `GRAPHQL_HOST`.
- [x] 2.3 Keep historical runtime messages on the `/flowbuilder/*` browser
      namespace and update tests.
- [x] 2.4 Add a focused proxy contract test for `/graphql` and
      `/flowbuilder/flows/{id}/runtime/messages`.

## 3. Downstream Ops Console Slice

- [x] 3.1 Define the first dashboard route/view composition: graph, search,
      runtime/admin summary, and source health status.
- [x] 3.2 Add a generic ops summary service model that can hydrate from
      `/health`, flow runtime endpoints, and GraphQL without SemSource-specific
      parser semantics.
- [x] 3.3 Add SemSource E2E acceptance for graph landing plus search result
      selection from fixture entities.
- [x] 3.4 Add admin affordances for safe read-side operations first: refresh,
      health inspection, flow/runtime drill-down, and copied entity IDs.
- [x] 3.5 Keep source-specific controls behind later downstream-owned
      contracts.
- [x] 3.6 Add generic read-side trajectory visibility for SemDev-style human
      inspection without product-specific trajectory actions.

## 4. Verification

- [x] 4.1 Run `task openspec:validate`.
- [x] 4.2 Run `npm run check`.
- [x] 4.3 Run focused unit tests for touched services.
- [x] 4.4 Run `npm run lint`.
- [x] 4.5 Run `npm run test`.
- [ ] 4.6 Run SemSource graph E2E when Docker/backend time is available:
      `task test:e2e:semsource-graph`.
- [x] 4.7 Run explicit SemStreams OpenAPI contract test against
      `../semstreams`.
