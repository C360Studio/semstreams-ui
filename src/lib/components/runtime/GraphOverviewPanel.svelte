<script lang="ts">
  import {
    ArrowPath,
    ChartBar,
    ExclamationTriangle,
    Icon,
    XMark,
  } from "svelte-hero-icons";
  import { getEntityLabel } from "$lib/types/graph";
  import type { OpsGraphOverview } from "$lib/types/opsConsole";

  interface Props {
    overview?: OpsGraphOverview | null;
    onClearSelection?: () => void;
    onResetFilters?: () => void;
  }

  let {
    overview = null,
    onClearSelection,
    onResetFilters,
  }: Props = $props();

  const emptyOverview: OpsGraphOverview = {
    entityCount: 0,
    relationshipCount: 0,
    filteredEntityCount: 0,
    filteredRelationshipCount: 0,
    activeFilterCount: 0,
    selectedEntity: null,
    loading: false,
    error: null,
    connected: false,
  };

  const current = $derived(overview ?? emptyOverview);
  const statusLabel = $derived(formatStatus(current));
  const statusTone = $derived(formatTone(current));
  const selectedLabel = $derived(
    current.selectedEntity ? getEntityLabel(current.selectedEntity) : "No entity selected",
  );
  const selectedId = $derived(current.selectedEntity?.id ?? "Select or search an entity");
  const canClearSelection = $derived(Boolean(current.selectedEntity && onClearSelection));
  const canResetFilters = $derived(
    current.activeFilterCount > 0 && Boolean(onResetFilters),
  );

  function formatStatus(value: OpsGraphOverview): string {
    if (value.loading) return "Loading";
    if (value.error) return "Degraded";
    if (value.connected && value.entityCount > 0) return "Available";
    if (value.entityCount === 0) return "Empty";
    return "Unknown";
  }

  function formatTone(value: OpsGraphOverview): string {
    if (value.error) return "danger";
    if (value.loading) return "warning";
    if (value.connected && value.entityCount > 0) return "success";
    return "neutral";
  }
</script>

<section
  class="graph-overview-panel"
  aria-label="Graph overview"
  data-testid="graph-overview-panel"
>
  <header class="overview-heading">
    <div>
      <span class="eyebrow">Graph overview</span>
      <h2>Current view</h2>
    </div>
    <span class="status-pill" data-tone={statusTone}>{statusLabel}</span>
  </header>

  <dl class="overview-stats">
    <div>
      <dt>Entities</dt>
      <dd>{current.entityCount}</dd>
      <span>{current.filteredEntityCount} shown</span>
    </div>
    <div>
      <dt>Relationships</dt>
      <dd>{current.relationshipCount}</dd>
      <span>{current.filteredRelationshipCount} shown</span>
    </div>
    <div>
      <dt>Filters</dt>
      <dd>{current.activeFilterCount}</dd>
      <span>{current.activeFilterCount} active</span>
    </div>
  </dl>

  <div class="selection-card">
    <div class="selection-icon">
      <Icon src={ChartBar} size="16" mini />
    </div>
    <div class="selection-copy">
      <span class="cell-label">Selected entity</span>
      <strong>{selectedLabel}</strong>
      <span>{selectedId}</span>
      {#if current.error}
        <span class="error-copy" role="alert">
          <Icon src={ExclamationTriangle} size="14" mini />
          {current.error}
        </span>
      {/if}
    </div>
    <div class="overview-actions">
      <button
        type="button"
        class="icon-button"
        aria-label="Clear graph selection"
        title="Clear graph selection"
        onclick={onClearSelection}
        disabled={!canClearSelection}
      >
        <Icon src={XMark} size="16" mini />
      </button>
      <button
        type="button"
        class="icon-button"
        aria-label="Reset graph filters"
        title="Reset graph filters"
        onclick={onResetFilters}
        disabled={!canResetFilters}
      >
        <Icon src={ArrowPath} size="16" mini />
      </button>
    </div>
  </div>
</section>

<style>
  .graph-overview-panel {
    display: grid;
    grid-template-columns: minmax(160px, 220px) minmax(280px, 420px) 1fr;
    align-items: stretch;
    min-height: 102px;
    border-bottom: 1px solid var(--ui-border-subtle);
    background: var(--ui-surface-primary);
    flex-shrink: 0;
  }

  .overview-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
    min-width: 0;
    padding: 12px 14px;
    border-right: 1px solid var(--ui-border-subtle);
    background: var(--ui-surface-secondary);
  }

  .eyebrow,
  .cell-label,
  dt {
    color: var(--ui-text-secondary);
    font-size: 0.7rem;
    font-weight: 650;
    line-height: 1.2;
    text-transform: uppercase;
  }

  h2 {
    margin: 2px 0 0;
    color: var(--ui-text-primary);
    font-size: 0.96rem;
    line-height: 1.2;
  }

  .status-pill {
    flex: 0 0 auto;
    padding: 3px 7px;
    border: 1px solid var(--ui-border-subtle);
    border-radius: 999px;
    color: var(--ui-text-secondary);
    font-size: 0.72rem;
    font-weight: 650;
    line-height: 1.2;
  }

  .status-pill[data-tone="success"] {
    color: var(--status-success);
  }

  .status-pill[data-tone="warning"] {
    color: var(--status-warning);
  }

  .status-pill[data-tone="danger"] {
    color: var(--status-error);
  }

  .overview-stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0;
    margin: 0;
    border-right: 1px solid var(--ui-border-subtle);
  }

  .overview-stats div {
    min-width: 0;
    padding: 12px 14px;
    border-right: 1px solid var(--ui-border-subtle);
  }

  .overview-stats div:last-child {
    border-right: none;
  }

  dd {
    margin: 4px 0 0;
    color: var(--ui-text-primary);
    font-size: 1.15rem;
    font-weight: 700;
    line-height: 1.1;
  }

  .overview-stats span,
  .selection-copy span {
    color: var(--ui-text-secondary);
    font-size: 0.74rem;
    line-height: 1.25;
    overflow-wrap: anywhere;
  }

  .selection-card {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    padding: 12px 14px;
  }

  .selection-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    flex: 0 0 30px;
    border: 1px solid var(--ui-border-subtle);
    border-radius: 4px;
    color: var(--ui-text-secondary);
  }

  .selection-copy {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }

  .selection-copy strong {
    color: var(--ui-text-primary);
    font-size: 0.88rem;
    line-height: 1.2;
    overflow-wrap: anywhere;
  }

  .error-copy {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--status-error) !important;
  }

  .overview-actions {
    display: flex;
    gap: 6px;
    flex: 0 0 auto;
  }

  .icon-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    padding: 0;
    border: 1px solid var(--ui-border-subtle);
    border-radius: 4px;
    background: var(--ui-surface-primary);
    color: var(--ui-text-secondary);
    cursor: pointer;
  }

  .icon-button:hover:not(:disabled),
  .icon-button:focus-visible:not(:disabled) {
    color: var(--ui-text-primary);
    border-color: var(--ui-border-strong);
    outline: none;
  }

  .icon-button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  @media (max-width: 1000px) {
    .graph-overview-panel {
      grid-template-columns: 1fr;
    }

    .overview-heading,
    .overview-stats {
      border-right: none;
      border-bottom: 1px solid var(--ui-border-subtle);
    }
  }

  @media (max-width: 560px) {
    .overview-heading,
    .selection-card {
      align-items: flex-start;
      flex-direction: column;
    }

    .overview-stats {
      grid-template-columns: 1fr;
    }

    .overview-stats div {
      border-right: none;
      border-bottom: 1px solid var(--ui-border-subtle);
    }
  }
</style>
