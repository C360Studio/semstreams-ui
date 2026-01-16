<script lang="ts">
	/**
	 * MetricsTab Component - Real-time metrics display with computed rates
	 * Uses runtimeStore for WebSocket-driven data
	 *
	 * Features:
	 * - Display throughput rates (msgs/sec per component) from runtimeStore
	 * - Show error rates for each component
	 * - Status indicators (healthy, degraded, error) using design system colors
	 * - CPU/Memory metrics when available from backend
	 * - Data persists across tab switches (no polling needed)
	 */

	import { runtimeStore, type RuntimeStoreState } from '$lib/stores/runtimeStore.svelte';

	interface MetricsTabProps {
		flowId: string;
		isActive: boolean;
	}

	// Props passed from parent - may be used for future tab-specific logic
	let { flowId: _flowId, isActive: _isActive }: MetricsTabProps = $props();

	// Subscribe to store - get initial state synchronously
	let storeState = $state<RuntimeStoreState>({
		connected: false,
		error: null,
		flowId: null,
		flowStatus: null,
		healthOverall: null,
		healthComponents: [],
		logs: [],
		metricsRaw: new Map(),
		metricsRates: new Map(),
		lastMetricsTimestamp: null
	});

	$effect(() => {
		const unsubscribe = runtimeStore.subscribe((s) => {
			storeState = s;
		});
		return unsubscribe;
	});

	// Get metrics array from store helper
	const metricsArray = $derived(runtimeStore.getMetricsArray(storeState));

	// Group metrics by component for display
	const componentMetrics = $derived(() => {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const grouped = new Map<
			string,
			{
				name: string;
				throughput: number;
				errorRate: number;
				status: 'healthy' | 'degraded' | 'error';
			}
		>();

		for (const metric of metricsArray) {
			if (!grouped.has(metric.component)) {
				grouped.set(metric.component, {
					name: metric.component,
					throughput: 0,
					errorRate: 0,
					status: 'healthy'
				});
			}

			const comp = grouped.get(metric.component)!;

			// Map metric names to display values
			if (metric.metricName.includes('received') || metric.metricName.includes('processed')) {
				comp.throughput = metric.rate;
			}
			if (metric.metricName.includes('error')) {
				comp.errorRate = metric.rate;
				if (metric.rate > 0) {
					comp.status = metric.rate > 1 ? 'error' : 'degraded';
				}
			}
		}

		return Array.from(grouped.values()).sort((a, b) => a.name.localeCompare(b.name));
	});

	// Last updated timestamp
	const lastUpdated = $derived(
		storeState.lastMetricsTimestamp ? new Date(storeState.lastMetricsTimestamp) : null
	);

	/**
	 * Format number with commas (1234 -> "1,234")
	 */
	function formatNumber(num: number): string {
		return num.toLocaleString('en-US', { maximumFractionDigits: 1 });
	}

	/**
	 * Format timestamp (Date -> "14:23:05")
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
	function getStatusColor(status: 'healthy' | 'degraded' | 'error'): string {
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
	function getStatusLabel(status: 'healthy' | 'degraded' | 'error'): string {
		const labels = {
			healthy: 'Healthy - No errors',
			degraded: 'Degraded - Some errors detected',
			error: 'Error - High error rate'
		};
		return labels[status];
	}
</script>

<div class="metrics-tab" data-testid="metrics-tab">
	<!-- Control Bar -->
	<div class="control-bar">
		<div class="info-text">
			<span class="info-label">Metrics updated via WebSocket</span>
		</div>

		{#if lastUpdated}
			<div class="last-updated" data-testid="last-updated">
				Last: {formatTime(lastUpdated)}
			</div>
		{/if}
	</div>

	<!-- Connection Status -->
	{#if storeState.error}
		<div class="error-message" role="alert">
			<span class="error-icon">⚠</span>
			<span>{storeState.error}</span>
		</div>
	{:else if !storeState.connected}
		<div class="connecting-message">
			<span class="connecting-icon">⋯</span>
			<span>Connecting to runtime stream...</span>
		</div>
	{/if}

	<!-- Metrics Table -->
	<div class="table-container">
		{#if componentMetrics().length === 0 && !storeState.error}
			<div class="empty-state">
				<p>No metrics available</p>
			</div>
		{:else if componentMetrics().length > 0}
			<table aria-label="Component metrics">
				<thead>
					<tr>
						<th scope="col">Component</th>
						<th scope="col">Msg/sec</th>
						<th scope="col">Errors/sec</th>
						<th scope="col">Status</th>
					</tr>
				</thead>
				<tbody>
					{#each componentMetrics() as component (component.name)}
						<tr data-testid="metrics-row">
							<td class="component-name">{component.name}</td>
							<td class="metric-value">{formatNumber(component.throughput)}</td>
							<td class="metric-value" class:has-errors={component.errorRate > 0}>
								{formatNumber(component.errorRate)}
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

	.info-text {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.info-label {
		font-size: 0.875rem;
		color: var(--ui-text-secondary);
		font-weight: 500;
	}

	.last-updated {
		font-size: 0.875rem;
		color: var(--ui-text-secondary);
		font-weight: 500;
	}

	/* Error/Connecting Messages */
	.error-message,
	.connecting-message {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		border-bottom: 1px solid var(--ui-border-subtle);
	}

	.error-message {
		background: var(--status-error-container);
		color: var(--status-error-on-container);
	}

	.connecting-message {
		background: var(--status-info-container);
		color: var(--status-info-on-container);
	}

	.error-icon,
	.connecting-icon {
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
