<script lang="ts">
  import { ExclamationTriangle, Icon, MagnifyingGlass } from "svelte-hero-icons";
  import { graphApi } from "$lib/services/graphApi";
  import { transformPathSearchResult } from "$lib/services/graphTransform";
  import type { GraphEntity } from "$lib/types/graph";
  import { getEntityLabel } from "$lib/types/graph";

  type SearchEntities = (
    query: string,
    limit: number,
  ) => Promise<GraphEntity[]>;

  interface Props {
    searchEntities?: SearchEntities;
    onEntitySelect?: (entity: GraphEntity) => void;
    selectedEntityId?: string | null;
    limit?: number;
  }

  let {
    searchEntities = searchGraphEntities,
    onEntitySelect,
    selectedEntityId = null,
    limit = 8,
  }: Props = $props();

  let query = $state("");
  let submittedQuery = $state("");
  let results = $state<GraphEntity[]>([]);
  let loading = $state(false);
  let error = $state<string | null>(null);

  const hasSubmitted = $derived(submittedQuery.length > 0);
  const resultLabel = $derived(
    results.length === 1 ? "1 result" : `${results.length} results`,
  );

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();

    const trimmed = query.trim();
    submittedQuery = trimmed;
    error = null;

    if (!trimmed) {
      results = [];
      return;
    }

    loading = true;
    try {
      results = await searchEntities(trimmed, limit);
    } catch (searchError) {
      results = [];
      error =
        searchError instanceof Error
          ? searchError.message
          : "Entity search unavailable";
    } finally {
      loading = false;
    }
  }

  function selectEntity(entity: GraphEntity) {
    onEntitySelect?.(entity);
  }

  function entityMeta(entity: GraphEntity): string {
    return [entity.idParts.domain, entity.idParts.type]
      .filter((value) => value && value !== "unknown")
      .join(" / ");
  }

  async function searchGraphEntities(
    searchQuery: string,
    searchLimit: number,
  ): Promise<GraphEntity[]> {
    const entities = await graphApi.getEntitiesByPrefix(searchQuery, searchLimit);
    return transformPathSearchResult({
      entities: Array.isArray(entities) ? entities : [],
      edges: [],
    });
  }
</script>

<section
  class="ops-search-panel"
  aria-label="Entity search"
  data-testid="ops-search-panel"
>
  <div class="search-heading">
    <div>
      <span class="eyebrow">Search</span>
      <h2>Find graph entities</h2>
    </div>
    <p>Lookup by entity prefix or identifier</p>
  </div>

  <form class="search-form" role="search" onsubmit={handleSubmit}>
    <label for="ops-entity-search" class="sr-only">Search graph entities</label>
    <input
      id="ops-entity-search"
      type="search"
      bind:value={query}
      placeholder="c360.source..."
      aria-label="Search graph entities"
      autocomplete="off"
    />
    <button type="submit" class="search-button" disabled={loading}>
      <Icon src={MagnifyingGlass} size="16" mini />
      <span>{loading ? "Searching" : "Search entities"}</span>
    </button>
  </form>

  <div class="search-content">
    {#if loading}
      <div class="state-box">Searching graph...</div>
    {:else if error}
      <div class="state-box" role="alert">
        <Icon src={ExclamationTriangle} size="16" mini />
        <span>{error}</span>
      </div>
    {:else if hasSubmitted && results.length === 0}
      <div class="state-box">
        <span>No matching entities</span>
        <span class="muted">Try another entity prefix or identifier.</span>
      </div>
    {:else if results.length > 0}
      <div class="results-summary" aria-live="polite">
        <strong>{resultLabel}</strong>
        <span>for {submittedQuery}</span>
      </div>
      <div class="result-list" aria-label="Entity search results">
        {#each results as entity (entity.id)}
          <button
            type="button"
            class="result-row"
            class:selected={selectedEntityId === entity.id}
            onclick={() => selectEntity(entity)}
            aria-label="Select entity {entity.id}"
          >
            <span class="result-main">
              <strong>{getEntityLabel(entity)}</strong>
              <span>{entity.id}</span>
            </span>
            {#if entityMeta(entity)}
              <span class="result-meta">{entityMeta(entity)}</span>
            {/if}
          </button>
        {/each}
      </div>
    {:else}
      <div class="state-box">
        <span>Search visible graph IDs or backend entity prefixes.</span>
      </div>
    {/if}
  </div>
</section>

<style>
  .ops-search-panel {
    display: grid;
    grid-template-columns: minmax(160px, 220px) minmax(240px, 360px) 1fr;
    align-items: stretch;
    min-height: 118px;
    border-bottom: 1px solid var(--ui-border-subtle);
    background: var(--ui-surface-primary);
    flex-shrink: 0;
  }

  .search-heading {
    min-width: 0;
    padding: 12px 14px;
    border-right: 1px solid var(--ui-border-subtle);
    background: var(--ui-surface-secondary);
  }

  .eyebrow {
    color: var(--ui-text-secondary);
    font-size: 0.72rem;
    font-weight: 650;
    line-height: 1.2;
    text-transform: uppercase;
  }

  h2,
  p {
    margin: 0;
  }

  h2 {
    margin-top: 2px;
    color: var(--ui-text-primary);
    font-size: 0.96rem;
    line-height: 1.2;
  }

  .search-heading p {
    margin-top: 4px;
    color: var(--ui-text-secondary);
    font-size: 0.78rem;
    line-height: 1.35;
  }

  .search-form {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    padding: 12px 14px;
    border-right: 1px solid var(--ui-border-subtle);
  }

  input {
    width: 100%;
    min-width: 0;
    height: 34px;
    padding: 0 10px;
    border: 1px solid var(--ui-border-subtle);
    border-radius: 4px;
    background: var(--ui-surface-secondary);
    color: var(--ui-text-primary);
    font-size: 0.84rem;
  }

  input:focus-visible {
    border-color: var(--ui-interactive-primary);
    outline: none;
  }

  .search-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-width: 130px;
    height: 34px;
    padding: 0 12px;
    border: 1px solid var(--ui-interactive-primary);
    border-radius: 4px;
    background: var(--ui-interactive-primary);
    color: var(--ui-text-on-primary, #fff);
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 650;
  }

  .search-button:disabled {
    cursor: progress;
    opacity: 0.7;
  }

  .search-content {
    min-width: 0;
    min-height: 0;
    padding: 10px 12px;
    overflow-y: auto;
  }

  .results-summary {
    display: flex;
    align-items: baseline;
    gap: 6px;
    margin-bottom: 8px;
    color: var(--ui-text-secondary);
    font-size: 0.76rem;
    line-height: 1.2;
  }

  .results-summary strong {
    color: var(--ui-text-primary);
  }

  .result-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 8px;
  }

  .result-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    min-width: 0;
    min-height: 48px;
    padding: 8px 10px;
    border: 1px solid var(--ui-border-subtle);
    border-radius: 4px;
    background: var(--ui-surface-secondary);
    color: var(--ui-text-primary);
    cursor: pointer;
    text-align: left;
  }

  .result-row:hover,
  .result-row:focus-visible,
  .result-row.selected {
    border-color: var(--ui-border-strong);
    outline: none;
  }

  .result-row.selected {
    box-shadow: inset 3px 0 0 var(--ui-interactive-primary);
  }

  .result-main {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .result-main strong {
    font-size: 0.84rem;
    line-height: 1.2;
    overflow-wrap: anywhere;
  }

  .result-main span,
  .result-meta,
  .muted {
    color: var(--ui-text-secondary);
    font-size: 0.74rem;
    line-height: 1.2;
    overflow-wrap: anywhere;
  }

  .result-meta {
    flex: 0 0 auto;
    white-space: nowrap;
  }

  .state-box {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    min-height: 42px;
    color: var(--ui-text-secondary);
    font-size: 0.84rem;
    line-height: 1.35;
  }

  .state-box[role="alert"] {
    color: var(--status-error);
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  @media (max-width: 1000px) {
    .ops-search-panel {
      grid-template-columns: 1fr;
    }

    .search-heading,
    .search-form {
      border-right: none;
      border-bottom: 1px solid var(--ui-border-subtle);
    }
  }

  @media (max-width: 560px) {
    .search-form,
    .result-row {
      align-items: stretch;
      flex-direction: column;
    }

    .search-button {
      width: 100%;
    }

    .result-meta {
      white-space: normal;
    }
  }
</style>
