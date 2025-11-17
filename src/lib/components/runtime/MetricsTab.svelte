<script lang="ts">
	/**
	 * MetricsTab Component - Real-time metrics polling with component performance data
	 * Phase 3 of Runtime Visualization Panel
	 *
	 * Features:
	 * - Poll backend metrics endpoint at configurable interval (default: 2s)
	 * - Display throughput table (msgs/sec per component)
	 * - Show error rates for each component
	 * - Status indicators (healthy, degraded, error) using design system colors
	 * - CPU/Memory metrics when available from backend
	 * - Refresh rate selector (1s, 2s, 5s, 10s, manual)
	 * - Only poll when tab is active (performance optimization)
	 * - Graceful error handling for unavailable backend
	 */

	interface ComponentMetrics {
		name: string;
		throughput: number; // messages/second
		errorRate: number; // errors/second
		status: 'healthy' | 'degraded' | 'error';
		cpu?: number; // percentage (0-100)
		memory?: number; // bytes
	}

	interface MetricsResponse {
		timestamp: string;
		components: ComponentMetrics[];
	}

	interface MetricsTabProps {
		flowId: string;
		isActive: boolean; // Don't poll if tab isn't active
	}

	type RefreshInterval = 1000 | 2000 | 5000 | 10000 | 'manual';

	let { flowId, isActive }: MetricsTabProps = $props();

	// Reactive state
	let pollingInterval = $state<RefreshInterval>(2000);
	let metrics = $state<MetricsResponse | null>(null);
	let lastUpdated = $state<Date | null>(null);
	let errorMessage = $state<string | null>(null);

	// Sorted components (alphabetically by name)
	const sortedComponents = $derived(
		metrics?.components.slice().sort((a, b) => a.name.localeCompare(b.name)) || []
	);

	/**
	 * Format number with commas (1234 → "1,234")
	 */
	function formatNumber(num: number): string {
		return num.toLocaleString('en-US');
	}

	/**
	 * Format bytes to MB (12582912 → "12.00 MB")
	 */
	function formatMemory(bytes: number): string {
		const mb = bytes / (1024 * 1024);
		return `${mb.toFixed(2)} MB`;
	}

	/**
	 * Format percentage (5.234 → "5.2%")
	 */
	function formatPercentage(num: number): string {
		return `${num.toFixed(1)}%`;
	}

	/**
	 * Format timestamp (Date → "14:23:05")
	 */
	function formatTime(date: Date): string {
		return date.toLocaleTimeString('en-US', {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	}

	/**
	 * Get status color from design system
	 */
	function getStatusColor(status: ComponentMetrics['status']): string {
		const colors = {
			healthy: 'var(--status-success)',
			degraded: 'var(--status-warning)',
			error: 'var(--status-error)'
		};
		return colors[status];
	}

	/**
	 * Get status label for accessibility
	 */
	function getStatusLabel(status: ComponentMetrics['status']): string {
		const labels = {
			healthy: 'Healthy - No errors',
			degraded: 'Degraded - Some errors detected',
			error: 'Error - High error rate'
		};
		return labels[status];
	}

	/**
	 * Fetch metrics from backend
	 */
	async function fetchMetrics() {
		try {
			const response = await fetch(`/flowbuilder/flows/${flowId}/runtime/metrics`);
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}
			const data = await response.json();
			metrics = data;
			lastUpdated = new Date();
			errorMessage = null; // Clear error on success
		} catch (error) {
			errorMessage = 'Metrics unavailable - backend endpoint not ready';
			console.warn('[MetricsTab] Metrics fetch failed:', error);
		}
	}

	/**
	 * Handle manual refresh button click
	 */
	function handleManualRefresh() {
		fetchMetrics();
	}

	// Effect: Manage polling lifecycle
	$effect(() => {
		// Only poll when tab is active and interval is not manual
		if (!isActive || pollingInterval === 'manual') {
			return;
		}

		// Initial fetch
		fetchMetrics();

		// Set up polling interval
		const intervalId = setInterval(fetchMetrics, pollingInterval);

		// Cleanup on unmount or when dependencies change
		return () => {
			clearInterval(intervalId);
		};
	});
</script>

<div class="metrics-tab" data-testid="metrics-tab">
	<!-- Control Bar -->
	<div class="control-bar">
		<div class="refresh-control">
			<label for="refresh-rate">
				<span class="control-label">Refresh:</span>
				<select
					id="refresh-rate"
					bind:value={pollingInterval}
					data-testid="refresh-rate-selector"
					aria-label="Refresh rate"
				>
					<option value={1000}>Every 1s</option>
					<option value={2000}>Every 2s</option>
					<option value={5000}>Every 5s</option>
					<option value={10000}>Every 10s</option>
					<option value="manual">Manual</option>
				</select>
			</label>

			{#if pollingInterval === 'manual'}
				<button
					class="refresh-button"
					onclick={handleManualRefresh}
					data-testid="manual-refresh-button"
					aria-label="Refresh metrics now"
				>
					Refresh
				</button>
			{/if}
		</div>

		{#if lastUpdated}
			<div class="last-updated" data-testid="last-updated">
				Last: {formatTime(lastUpdated)}
			</div>
		{/if}
	</div>

	<!-- Error Message -->
	{#if errorMessage}
		<div class="error-message" role="alert">
			<span class="error-icon">⚠</span>
			<span>{errorMessage}</span>
		</div>
	{/if}

	<!-- Metrics Table -->
	<div class="table-container">
		{#if sortedComponents.length === 0 && !errorMessage}
			<div class="empty-state">
				<p>No metrics available</p>
			</div>
		{:else if sortedComponents.length > 0}
			<table aria-label="Component metrics">
				<thead>
					<tr>
						<th scope="col">Component</th>
						<th scope="col">Msg/sec</th>
						<th scope="col">Errors/sec</th>
						<th scope="col">CPU</th>
						<th scope="col">Memory</th>
						<th scope="col">Status</th>
					</tr>
				</thead>
				<tbody>
					{#each sortedComponents as component (component.name)}
						<tr data-testid="metrics-row">
							<td class="component-name">{component.name}</td>
							<td class="metric-value">{formatNumber(component.throughput)}</td>
							<td class="metric-value" class:has-errors={component.errorRate > 0}>
								{formatNumber(component.errorRate)}
							</td>
							<td class="metric-value">
								{component.cpu !== undefined ? formatPercentage(component.cpu) : 'N/A'}
							</td>
							<td class="metric-value">
								{component.memory !== undefined ? formatMemory(component.memory) : 'N/A'}
							</td>
							<td class="status-cell">
								<span
									class="status-indicator"
									style="color: {getStatusColor(component.status)}"
									aria-label={getStatusLabel(component.status)}
									data-testid="status-indicator"
								>
									●
								</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
</div>

<style>
	.metrics-tab {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--ui-surface-primary);
	}

	/* Control Bar */
	.control-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--ui-border-subtle);
		background: var(--ui-surface-secondary);
		gap: 1rem;
		flex-wrap: wrap;
	}

	.refresh-control {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.refresh-control label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
	}

	.control-label {
		color: var(--ui-text-secondary);
		font-weight: 500;
	}

	.refresh-control select {
		padding: 0.375rem 0.5rem;
		border: 1px solid var(--ui-border-subtle);
		border-radius: 4px;
		background: var(--ui-surface-primary);
		color: var(--ui-text-primary);
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.refresh-control select:hover {
		border-color: var(--ui-border-interactive);
	}

	.refresh-control select:focus {
		outline: none;
		border-color: var(--ui-focus-ring);
		box-shadow: 0 0 0 2px rgba(15, 98, 254, 0.1);
	}

	.refresh-button {
		padding: 0.375rem 0.75rem;
		border: 1px solid var(--ui-border-subtle);
		border-radius: 4px;
		background: var(--ui-surface-primary);
		color: var(--ui-text-secondary);
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s;
		font-weight: 500;
	}

	.refresh-button:hover {
		background: var(--ui-surface-tertiary);
		color: var(--ui-text-primary);
		border-color: var(--ui-border-strong);
	}

	.refresh-button:active {
		transform: scale(0.98);
	}

	.last-updated {
		font-size: 0.875rem;
		color: var(--ui-text-secondary);
		font-weight: 500;
	}

	/* Error Message */
	.error-message {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		border-bottom: 1px solid var(--ui-border-subtle);
		background: var(--status-error-container);
		color: var(--status-error-on-container);
	}

	.error-icon {
		font-size: 1rem;
	}

	/* Table Container */
	.table-container {
		flex: 1;
		overflow-y: auto;
		overflow-x: auto;
		background: var(--ui-surface-primary);
	}

	.empty-state {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		min-height: 150px;
	}

	.empty-state p {
		margin: 0;
		color: var(--ui-text-secondary);
		font-size: 0.875rem;
	}

	/* Table Styles */
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}

	thead {
		position: sticky;
		top: 0;
		background: var(--ui-surface-secondary);
		z-index: 1;
		border-bottom: 2px solid var(--ui-border-strong);
	}

	th {
		text-align: left;
		padding: 0.75rem 1rem;
		font-weight: 600;
		color: var(--ui-text-primary);
		white-space: nowrap;
	}

	th:first-child {
		padding-left: 1rem;
	}

	th:last-child {
		text-align: center;
	}

	tbody tr {
		border-bottom: 1px solid var(--ui-border-subtle);
		transition: background-color 0.1s;
	}

	tbody tr:hover {
		background: var(--ui-surface-secondary);
	}

	tbody tr:last-child {
		border-bottom: none;
	}

	td {
		padding: 0.75rem 1rem;
		color: var(--ui-text-primary);
	}

	td:first-child {
		padding-left: 1rem;
	}

	.component-name {
		font-weight: 500;
		color: var(--ui-text-primary);
		white-space: nowrap;
	}

	.metric-value {
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
		font-size: 0.875rem;
		color: var(--ui-text-secondary);
		text-align: right;
		white-space: nowrap;
	}

	.metric-value.has-errors {
		color: var(--status-error);
		font-weight: 600;
	}

	.status-cell {
		text-align: center;
	}

	.status-indicator {
		font-size: 1.25rem;
		line-height: 1;
		display: inline-block;
	}

	/* Scrollbar styling (optional, for better UX) */
	.table-container::-webkit-scrollbar {
		width: 8px;
		height: 8px;
	}

	.table-container::-webkit-scrollbar-track {
		background: var(--ui-surface-secondary);
	}

	.table-container::-webkit-scrollbar-thumb {
		background: var(--ui-border-strong);
		border-radius: 4px;
	}

	.table-container::-webkit-scrollbar-thumb:hover {
		background: var(--ui-interactive-secondary);
	}
</style>
