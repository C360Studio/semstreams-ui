<script lang="ts">
	/**
	 * GraphTab - Main container for knowledge graph visualization
	 *
	 * Orchestrates:
	 * - GraphFilters (left sidebar)
	 * - GraphCanvas (center)
	 * - GraphDetailPanel (right sidebar)
	 *
	 * Manages graph store subscriptions and data loading.
	 */

	import { onMount, onDestroy } from 'svelte';
	import { graphStore } from '$lib/stores/graphStore.svelte';
	import { graphApi, GraphApiError } from '$lib/services/graphApi';
	import { transformPathSearchResult } from '$lib/services/graphTransform';
	import type { GraphEntity, GraphRelationship, GraphFilters as GraphFiltersType, GraphStoreState } from '$lib/types/graph';

	import GraphFiltersPanel from './GraphFilters.svelte';
	import GraphCanvas from './GraphCanvas.svelte';
	import GraphDetailPanel from './GraphDetailPanel.svelte';

	// Store state
	let storeState = $state<GraphStoreState | null>(null);
	let unsubscribe: (() => void) | null = null;

	// Derived from store
	const entities = $derived<GraphEntity[]>(
		storeState ? graphStore.getFilteredEntities(storeState) : []
	);
	const relationships = $derived<GraphRelationship[]>(
		storeState ? graphStore.getFilteredRelationships(storeState) : []
	);
	const selectedEntity = $derived<GraphEntity | null>(
		storeState?.selectedEntityId ? storeState.entities.get(storeState.selectedEntityId) || null : null
	);
	const availableTypes = $derived<string[]>(
		storeState ? graphStore.getEntityTypes(storeState) : []
	);
	const availableDomains = $derived<string[]>(
		storeState ? graphStore.getDomains(storeState) : []
	);
	const filters = $derived<GraphFiltersType>(
		storeState?.filters || { search: '', types: [], domains: [], minConfidence: 0, timeRange: null, communities: [], showProperties: true }
	);
	const isLoading = $derived(storeState?.loading ?? false);
	const error = $derived(storeState?.error ?? null);

	// Subscribe to store
	onMount(() => {
		unsubscribe = graphStore.subscribe((state) => {
			storeState = state;
		});

		// Load initial graph data from GraphQL API
		loadGraphData();

		return () => {
			if (unsubscribe) {
				unsubscribe();
			}
		};
	});

	onDestroy(() => {
		if (unsubscribe) {
			unsubscribe();
		}
	});

	/**
	 * Load graph data from the GraphQL API.
	 * Uses pathSearch with a wildcard to get initial entities.
	 */
	async function loadGraphData() {
		graphStore.setLoading(true);
		graphStore.setError(null);

		try {
			const result = await graphApi.pathSearch('*', 2, 50);
			const entities = transformPathSearchResult(result);
			graphStore.upsertEntities(entities);
			graphStore.setConnected(true);
		} catch (err) {
			if (err instanceof GraphApiError) {
				// Map error codes to user-friendly messages
				if (err.statusCode === 504 || err.message.includes('timeout')) {
					graphStore.setError('Query timed out');
				} else if (err.statusCode === 0) {
					graphStore.setError('Unable to connect to graph service');
				} else {
					graphStore.setError(err.message);
				}
			} else {
				graphStore.setError('An unexpected error occurred');
			}
			graphStore.setConnected(false);
		} finally {
			graphStore.setLoading(false);
		}
	}

	// Event handlers
	function handleEntitySelect(entityId: string | null) {
		graphStore.selectEntity(entityId);
	}

	/**
	 * Expand an entity by loading its neighbors from the GraphQL API.
	 */
	async function handleEntityExpand(entityId: string) {
		// Skip if already expanded
		if (storeState && graphStore.isExpanded(storeState, entityId)) {
			return;
		}

		try {
			const result = await graphApi.pathSearch(entityId, 1, 20);
			const entities = transformPathSearchResult(result);
			graphStore.upsertEntities(entities);
			graphStore.markExpanded(entityId);
		} catch (err) {
			// Log error but don't show error banner for expansion failures
			console.error('Failed to expand entity:', err);
		}
	}

	function handleEntityHover(entityId: string | null) {
		graphStore.setHoveredEntity(entityId);
	}

	function handleFilterChange(newFilters: Partial<GraphFiltersType>) {
		graphStore.setFilters(newFilters);
	}

	function handleFilterReset() {
		graphStore.resetFilters();
	}

	function handleDetailClose() {
		graphStore.selectEntity(null);
	}

	function handleDetailEntityClick(entityId: string) {
		graphStore.selectEntity(entityId);
	}

	// Refresh data
	function handleRefresh() {
		graphStore.clearEntities();
		loadGraphData();
	}
</script>

<div class="graph-tab" data-testid="graph-tab">
	{#if isLoading}
		<div class="loading-overlay">
			<div class="loading-spinner"></div>
			<span>Loading graph...</span>
		</div>
	{/if}

	{#if error}
		<div class="error-banner">
			<span class="error-icon">!</span>
			<span class="error-message">{error}</span>
			<button onclick={handleRefresh} class="retry-button">Retry</button>
		</div>
	{/if}

	<!-- Left: Filters -->
	<GraphFiltersPanel
		{filters}
		{availableTypes}
		{availableDomains}
		onFilterChange={handleFilterChange}
		onReset={handleFilterReset}
	/>

	<!-- Center: Canvas -->
	<div class="canvas-container">
		<GraphCanvas
			{entities}
			{relationships}
			selectedEntityId={storeState?.selectedEntityId ?? null}
			hoveredEntityId={storeState?.hoveredEntityId ?? null}
			onEntitySelect={handleEntitySelect}
			onEntityExpand={handleEntityExpand}
			onEntityHover={handleEntityHover}
		/>

		<!-- Toolbar overlay -->
		<div class="toolbar">
			<button
				class="toolbar-button"
				onclick={handleRefresh}
				title="Refresh data"
				disabled={isLoading}
			>
				<span class="toolbar-icon">↻</span>
			</button>
		</div>
	</div>

	<!-- Right: Detail Panel -->
	<GraphDetailPanel
		entity={selectedEntity}
		onClose={handleDetailClose}
		onEntityClick={handleDetailEntityClick}
	/>
</div>

<style>
	.graph-tab {
		display: flex;
		height: 100%;
		position: relative;
		background: var(--ui-surface-primary);
	}

	.canvas-container {
		flex: 1;
		position: relative;
		min-width: 0;
	}

	/* Loading overlay */
	.loading-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(var(--ui-surface-primary-rgb), 0.8);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 12px;
		z-index: 100;
	}

	.loading-spinner {
		width: 32px;
		height: 32px;
		border: 3px solid var(--ui-border-subtle);
		border-top-color: var(--ui-interactive-primary);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Error banner */
	.error-banner {
		position: absolute;
		top: 12px;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 16px;
		background: var(--status-error-bg);
		border: 1px solid var(--status-error);
		border-radius: 6px;
		z-index: 90;
	}

	.error-icon {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: var(--status-error);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: bold;
		font-size: 12px;
	}

	.error-message {
		color: var(--status-error);
		font-size: 13px;
	}

	.retry-button {
		padding: 4px 10px;
		border: 1px solid var(--status-error);
		border-radius: 4px;
		background: transparent;
		color: var(--status-error);
		font-size: 12px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.retry-button:hover {
		background: var(--status-error);
		color: white;
	}

	/* Toolbar */
	.toolbar {
		position: absolute;
		top: 12px;
		left: 12px;
		display: flex;
		gap: 4px;
		z-index: 10;
	}

	.toolbar-button {
		width: 32px;
		height: 32px;
		border: 1px solid var(--ui-border-subtle);
		border-radius: 6px;
		background: var(--ui-surface-primary);
		color: var(--ui-text-primary);
		font-size: 16px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	.toolbar-button:hover:not(:disabled) {
		background: var(--ui-surface-secondary);
		border-color: var(--ui-border-strong);
	}

	.toolbar-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.toolbar-icon {
		font-size: 14px;
	}
</style>
