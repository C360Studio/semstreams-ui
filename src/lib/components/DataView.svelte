<script lang="ts">
	/**
	 * DataView - Knowledge graph visualization view
	 *
	 * Three-column layout for exploring the semantic knowledge graph:
	 * - Left: GraphFilters (search, type/domain filters, confidence)
	 * - Center: GraphCanvas (D3 force-directed visualization)
	 * - Right: GraphDetailPanel (selected entity details)
	 *
	 * This view is shown when the user switches from Flow to Data view
	 * while a flow is running.
	 */

	import { onMount, onDestroy } from 'svelte';
	import { graphStore, buildGraphEntity } from '$lib/stores/graphStore.svelte';
	import type {
		GraphEntity,
		GraphRelationship,
		GraphFilters as GraphFiltersType,
		GraphStoreState
	} from '$lib/types/graph';

	import GraphFiltersPanel from './runtime/GraphFilters.svelte';
	import GraphCanvas from './runtime/GraphCanvas.svelte';
	import GraphDetailPanel from './runtime/GraphDetailPanel.svelte';

	interface DataViewProps {
		flowId: string;
	}

	// flowId will be used in Phase 5 to fetch flow-specific entities via GraphQL
	let { flowId: _flowId }: DataViewProps = $props();

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
		storeState?.selectedEntityId
			? storeState.entities.get(storeState.selectedEntityId) || null
			: null
	);
	const availableTypes = $derived<string[]>(storeState ? graphStore.getEntityTypes(storeState) : []);
	const availableDomains = $derived<string[]>(storeState ? graphStore.getDomains(storeState) : []);
	const filters = $derived<GraphFiltersType>(
		storeState?.filters || {
			search: '',
			types: [],
			domains: [],
			minConfidence: 0,
			timeRange: null,
			communities: [],
			showProperties: true
		}
	);
	const isLoading = $derived(storeState?.loading ?? false);
	const error = $derived(storeState?.error ?? null);

	// Subscribe to store
	onMount(() => {
		unsubscribe = graphStore.subscribe((state) => {
			storeState = state;
		});

		// Load initial data (mock for now, will be GraphQL in Phase 2)
		loadMockData();

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

	// Load mock data for testing
	function loadMockData() {
		graphStore.setLoading(true);

		// Simulate network delay
		setTimeout(() => {
			const mockEntities = generateMockEntities();
			graphStore.upsertEntities(mockEntities);
			graphStore.setConnected(true);
			graphStore.setLoading(false);
		}, 500);
	}

	// Generate realistic mock entities
	function generateMockEntities(): GraphEntity[] {
		const entities: GraphEntity[] = [];

		// Create a vehicle fleet scenario
		const fleetId = 'acme.cloud.fleet.management.fleet.west-coast';
		const fleet = buildGraphEntity({
			id: fleetId,
			properties: [
				{
					predicate: 'fleet.name',
					object: 'West Coast Fleet',
					confidence: 1.0,
					timestamp: Date.now() - 86400000
				},
				{
					predicate: 'fleet.region',
					object: 'US-West',
					confidence: 1.0,
					timestamp: Date.now() - 86400000
				},
				{
					predicate: 'fleet.size',
					object: 47,
					confidence: 0.95,
					timestamp: Date.now() - 3600000
				}
			],
			outgoing: [],
			incoming: [],
			community: { id: 'fleet-ops', label: 'Fleet Operations' }
		});
		entities.push(fleet);

		// Create vehicles
		const vehicleIds = ['VH-001', 'VH-002', 'VH-003', 'VH-004', 'VH-005'];
		const vehicleTypes = ['truck', 'van', 'truck', 'sedan', 'van'];
		const statuses = ['active', 'active', 'maintenance', 'active', 'idle'];

		vehicleIds.forEach((vid, idx) => {
			const vehicleId = `acme.cloud.fleet.management.vehicle.${vid}`;
			const vehicle = buildGraphEntity({
				id: vehicleId,
				properties: [
					{
						predicate: 'vehicle.type',
						object: vehicleTypes[idx],
						confidence: 1.0,
						timestamp: Date.now() - 3600000
					},
					{
						predicate: 'vehicle.status',
						object: statuses[idx],
						confidence: 0.98,
						timestamp: Date.now() - 300000
					},
					{
						predicate: 'vehicle.mileage',
						object: 45000 + idx * 12000,
						confidence: 0.9,
						timestamp: Date.now() - 600000
					},
					{
						predicate: 'vehicle.fuelLevel',
						object: 0.3 + Math.random() * 0.6,
						confidence: 0.85,
						timestamp: Date.now() - 60000
					}
				],
				outgoing: [
					{
						predicate: 'fleet.membership.current',
						targetId: fleetId,
						confidence: 1.0,
						timestamp: Date.now() - 86400000
					}
				],
				incoming: [],
				community: { id: 'fleet-ops', label: 'Fleet Operations' }
			});
			entities.push(vehicle);

			// Add incoming relationship to fleet
			fleet.incoming.push({
				id: `${vehicleId}->fleet.membership.current->${fleetId}`,
				sourceId: vehicleId,
				targetId: fleetId,
				predicate: 'fleet.membership.current',
				confidence: 1.0,
				timestamp: Date.now() - 86400000
			});
		});

		// Create drivers
		const driverNames = ['Alice Chen', 'Bob Smith', 'Carol Davis', 'Dan Wilson'];
		driverNames.forEach((name, idx) => {
			const driverId = `acme.cloud.fleet.hr.driver.drv-${100 + idx}`;
			const assignedVehicle = vehicleIds[idx];
			const assignedVehicleId = `acme.cloud.fleet.management.vehicle.${assignedVehicle}`;

			const driver = buildGraphEntity({
				id: driverId,
				properties: [
					{
						predicate: 'driver.name',
						object: name,
						confidence: 1.0,
						timestamp: Date.now() - 86400000 * 30
					},
					{
						predicate: 'driver.license',
						object: 'Class A CDL',
						confidence: 1.0,
						timestamp: Date.now() - 86400000 * 365
					},
					{
						predicate: 'driver.rating',
						object: 4.2 + Math.random() * 0.7,
						confidence: 0.9,
						timestamp: Date.now() - 86400000
					}
				],
				outgoing: [
					{
						predicate: 'assignment.vehicle',
						targetId: assignedVehicleId,
						confidence: 0.95,
						timestamp: Date.now() - 3600000
					}
				],
				incoming: [],
				community: { id: 'personnel', label: 'Personnel' }
			});
			entities.push(driver);

			// Add incoming to vehicle
			const vehicle = entities.find((e) => e.id === assignedVehicleId);
			if (vehicle) {
				vehicle.incoming.push({
					id: `${driverId}->assignment.vehicle->${assignedVehicleId}`,
					sourceId: driverId,
					targetId: assignedVehicleId,
					predicate: 'assignment.vehicle',
					confidence: 0.95,
					timestamp: Date.now() - 3600000
				});
			}
		});

		// Create some locations
		const locations = [
			{ name: 'Warehouse A', lat: 37.7749, lng: -122.4194 },
			{ name: 'Distribution Center', lat: 34.0522, lng: -118.2437 },
			{ name: 'Customer Site 1', lat: 36.7783, lng: -119.4179 }
		];

		locations.forEach((loc, idx) => {
			const locationId = `acme.cloud.fleet.logistics.location.loc-${200 + idx}`;
			const location = buildGraphEntity({
				id: locationId,
				properties: [
					{
						predicate: 'location.name',
						object: loc.name,
						confidence: 1.0,
						timestamp: Date.now() - 86400000 * 7
					},
					{
						predicate: 'location.lat',
						object: loc.lat,
						confidence: 1.0,
						timestamp: Date.now() - 86400000 * 7
					},
					{
						predicate: 'location.lng',
						object: loc.lng,
						confidence: 1.0,
						timestamp: Date.now() - 86400000 * 7
					}
				],
				outgoing: [],
				incoming: [],
				community: { id: 'logistics', label: 'Logistics' }
			});
			entities.push(location);

			// Connect some vehicles to locations
			if (idx < 2) {
				const vehicleId = `acme.cloud.fleet.management.vehicle.${vehicleIds[idx]}`;
				const vehicle = entities.find((e) => e.id === vehicleId);
				if (vehicle) {
					vehicle.outgoing.push({
						id: `${vehicleId}->location.current->${locationId}`,
						sourceId: vehicleId,
						targetId: locationId,
						predicate: 'location.current',
						confidence: 0.92,
						timestamp: Date.now() - 300000
					});
					location.incoming.push({
						id: `${vehicleId}->location.current->${locationId}`,
						sourceId: vehicleId,
						targetId: locationId,
						predicate: 'location.current',
						confidence: 0.92,
						timestamp: Date.now() - 300000
					});
				}
			}
		});

		return entities;
	}

	// Event handlers
	function handleEntitySelect(entityId: string | null) {
		graphStore.selectEntity(entityId);
	}

	function handleEntityExpand(entityId: string) {
		// In Phase 2, this will trigger a GraphQL query for neighbors
		graphStore.markExpanded(entityId);
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
		loadMockData();
	}
</script>

<div class="data-view" data-testid="data-view">
	{#if isLoading}
		<div class="loading-overlay">
			<div class="loading-spinner"></div>
			<span>Loading graph data...</span>
		</div>
	{/if}

	{#if error}
		<div class="error-banner">
			<span class="error-icon">!</span>
			<span class="error-message">{error}</span>
			<button onclick={handleRefresh} class="retry-button">Retry</button>
		</div>
	{/if}

	<!-- Left Panel: Filters -->
	<aside class="data-view-left">
		<GraphFiltersPanel
			{filters}
			{availableTypes}
			{availableDomains}
			onFilterChange={handleFilterChange}
			onReset={handleFilterReset}
		/>
	</aside>

	<!-- Center Panel: Canvas -->
	<main class="data-view-center">
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
	</main>

	<!-- Right Panel: Detail -->
	<aside class="data-view-right">
		<GraphDetailPanel
			entity={selectedEntity}
			onClose={handleDetailClose}
			onEntityClick={handleDetailEntityClick}
		/>
	</aside>
</div>

<style>
	.data-view {
		display: grid;
		grid-template-columns: 250px 1fr 320px;
		height: 100%;
		position: relative;
		background: var(--ui-surface-primary);
	}

	.data-view-left {
		border-right: 1px solid var(--ui-border-subtle);
		overflow: hidden;
	}

	.data-view-center {
		position: relative;
		overflow: hidden;
	}

	.data-view-right {
		border-left: 1px solid var(--ui-border-subtle);
		overflow: hidden;
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

	/* Responsive: collapse panels on smaller screens */
	@media (max-width: 1200px) {
		.data-view {
			grid-template-columns: 200px 1fr 280px;
		}
	}

	@media (max-width: 900px) {
		.data-view {
			grid-template-columns: 1fr;
		}

		.data-view-left,
		.data-view-right {
			display: none;
		}
	}
</style>
