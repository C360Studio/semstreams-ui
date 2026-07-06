<script lang="ts">
  import DataView from "$lib/components/DataView.svelte";
  import OpsConsoleShell from "$lib/components/OpsConsoleShell.svelte";
  import {
    opsSummaryApi,
    type OpsSummary,
    type OpsSummaryFlow,
  } from "$lib/services/opsSummaryApi";
  import { graphStore } from "$lib/stores/graphStore.svelte";
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
  {graphStatus}
  {sourceStatus}
  onRefreshSummary={refreshOpsSummary}
>
  {#snippet main()}
    <DataView flowId={activeFlow?.id} />
  {/snippet}
</OpsConsoleShell>
