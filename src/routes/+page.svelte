<script lang="ts">
  import DataView from "$lib/components/DataView.svelte";
  import OpsConsoleShell from "$lib/components/OpsConsoleShell.svelte";
  import {
    opsSummaryApi,
    type OpsSummary,
    type OpsSummaryFlow,
  } from "$lib/services/opsSummaryApi";
  import { graphStore } from "$lib/stores/graphStore.svelte";
  import type { GraphEntity, GraphFilters } from "$lib/types/graph";
  import type { OpsGraphOverview } from "$lib/types/opsConsole";
  import { onMount } from "svelte";

  // Auto-discover active flow from the backend config.
  // If the backend has flows (from a loaded config), we pick the running one
  // (or the first one) and pass its ID to DataView for context.
  // If no backend or no flows, DataView still works — just no flow context.
  let opsSummary = $state<OpsSummary | null>(null);
  let summaryLoading = $state(false);
  let activeFlow = $state<OpsSummaryFlow | null>(null);
  const graphStatus = $derived(
    opsSummary?.graph.status ?? (summaryLoading ? "loading" : "unknown"),
  );
  const sourceStatus = $derived(opsSummary?.source.status ?? "unknown");
  const selectedEntityId = $derived(graphStore.selectedEntityId);
  const selectedGraphEntity = $derived(
    selectedEntityId ? graphStore.entities.get(selectedEntityId) ?? null : null,
  );
  const filteredGraphEntities = $derived(graphStore.getFilteredEntities());
  const filteredGraphRelationships = $derived(
    graphStore.getFilteredRelationships(),
  );
  const activeGraphFilterCount = $derived(countActiveFilters(graphStore.filters));
  const graphOverview = $derived<OpsGraphOverview>({
    entityCount: graphStore.entities.size,
    relationshipCount: graphStore.relationships.size,
    filteredEntityCount: filteredGraphEntities.length,
    filteredRelationshipCount: filteredGraphRelationships.length,
    activeFilterCount: activeGraphFilterCount,
    selectedEntity: selectedGraphEntity,
    loading: graphStore.loading,
    error: graphStore.error,
    connected: graphStore.connected,
  });

  async function refreshOpsSummary() {
    summaryLoading = true;
    try {
      const summary = await opsSummaryApi.fetchSummary();
      opsSummary = summary;
      activeFlow = summary.runtime.activeFlow;
    } catch {
      // Backend not available — DataView still owns its graph-specific error state.
    } finally {
      summaryLoading = false;
    }
  }

  function handleSearchEntitySelect(entity: GraphEntity) {
    graphStore.upsertEntity(entity);
    graphStore.selectEntity(entity.id);
  }

  function handleClearGraphSelection() {
    graphStore.selectEntity(null);
  }

  function handleResetGraphFilters() {
    graphStore.resetFilters();
  }

  function countActiveFilters(filters: GraphFilters): number {
    let count = 0;
    if (filters.search.trim()) count += 1;
    if (filters.types.length > 0) count += 1;
    if (filters.domains.length > 0) count += 1;
    if (filters.minConfidence > 0) count += 1;
    if (filters.timeRange !== null) count += 1;
    if (filters.communities.length > 0) count += 1;
    if (!filters.showProperties) count += 1;
    return count;
  }

  onMount(() => {
    void refreshOpsSummary();
  });
</script>

<svelte:head>
  <title>SemStreams</title>
</svelte:head>

<OpsConsoleShell
  {activeFlow}
  {opsSummary}
  {summaryLoading}
  {selectedEntityId}
  {graphOverview}
  {graphStatus}
  {sourceStatus}
  onRefreshSummary={refreshOpsSummary}
  onSearchEntitySelect={handleSearchEntitySelect}
  onClearGraphSelection={handleClearGraphSelection}
  onResetGraphFilters={handleResetGraphFilters}
>
  {#snippet main()}
    <DataView flowId={activeFlow?.id} />
  {/snippet}
</OpsConsoleShell>
