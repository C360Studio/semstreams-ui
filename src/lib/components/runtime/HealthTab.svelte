<script lang="ts">
	/**
	 * HealthTab Component - Component health monitoring with diagnostics
	 * Phase 4 of Runtime Visualization Panel
	 *
	 * Features:
	 * - Poll backend health endpoint at 5-second intervals
	 * - Display component status (running, degraded, error)
	 * - Show real-time uptime counters (HH:MM:SS)
	 * - Display last activity timestamps (relative format)
	 * - Expandable details for degraded/error components
	 * - Connection health summary (X/Y components healthy)
	 * - Status indicators using design system colors
	 * - Only poll when tab is active (performance optimization)
	 * - Graceful error handling for unavailable backend
	 */

	interface ComponentHealth {
		name: string;
		status: 'running' | 'degraded' | 'error';
		startTime: string; // ISO timestamp
		lastActivity: string; // ISO timestamp
		details: {
			message: string;
			timestamp: string;
			severity: 'warning' | 'error';
		} | null;
	}

	interface OverallHealth {
		status: 'healthy' | 'degraded' | 'error';
		healthyCount: number;
		totalCount: number;
	}

	interface HealthResponse {
		timestamp: string;
		overall: OverallHealth;
		components: ComponentHealth[];
	}

	interface HealthTabProps {
		flowId: string;
		isActive: boolean; // Don't poll if tab isn't active
	}

	let { flowId, isActive }: HealthTabProps = $props();

	// Reactive state
	let health = $state<HealthResponse | null>(null);
	let currentTime = $state(new Date());
	let expandedComponents = $state<Set<string>>(new Set());
	let errorMessage = $state<string | null>(null);

	// Sorted components (alphabetically by name)
	const sortedComponents = $derived(
		health?.components.slice().sort((a, b) => a.name.localeCompare(b.name)) || []
	);

	// Check if component is expanded
	const isExpanded = $derived((name: string) => expandedComponents.has(name));

	/**
	 * Calculate uptime from start time
	 * Returns formatted string: "HH:MM:SS"
	 */
	function calculateUptime(startTime: string, now: Date): string {
		const start = new Date(startTime);
		const elapsed = Math.floor((now.getTime() - start.getTime()) / 1000);

		const hours = Math.floor(elapsed / 3600);
		const minutes = Math.floor((elapsed % 3600) / 60);
		const seconds = elapsed % 60;

		return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
	}

	/**
	 * Format relative time for last activity
	 * Returns human-readable string: "X seconds ago", "X minutes ago"
	 */
	function formatRelativeTime(timestamp: string, now: Date): string {
		const then = new Date(timestamp);
		const elapsed = Math.floor((now.getTime() - then.getTime()) / 1000);

		if (elapsed < 60) return `${elapsed} ${elapsed === 1 ? 'second' : 'seconds'} ago`;
		if (elapsed < 3600) {
			const minutes = Math.floor(elapsed / 60);
			return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
		}
		if (elapsed < 86400) {
			const hours = Math.floor(elapsed / 3600);
			return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
		}
		const days = Math.floor(elapsed / 86400);
		return `${days} ${days === 1 ? 'day' : 'days'} ago`;
	}

	/**
	 * Check if component is stale (no activity > 30s)
	 */
	function isStale(lastActivity: string, now: Date): boolean {
		const then = new Date(lastActivity);
		const elapsed = Math.floor((now.getTime() - then.getTime()) / 1000);
		return elapsed > 30;
	}

	/**
	 * Get status color from design system
	 */
	function getStatusColor(status: ComponentHealth['status']): string {
		const colors = {
			running: 'var(--status-success)',
			degraded: 'var(--status-warning)',
			error: 'var(--status-error)'
		};
		return colors[status];
	}

	/**
	 * Get status icon for visual display
	 */
	function getStatusIcon(status: ComponentHealth['status']): string {
		const icons = {
			running: '●',
			degraded: '⚠',
			error: '●'
		};
		return icons[status];
	}

	/**
	 * Get status label for accessibility
	 */
	function getStatusLabel(status: ComponentHealth['status']): string {
		const labels = {
			running: 'Running - Component is healthy',
			degraded: 'Degraded - Component has warnings',
			error: 'Error - Component has critical issues'
		};
		return labels[status];
	}

	/**
	 * Get overall health status color
	 */
	function getOverallStatusColor(status: OverallHealth['status']): string {
		const colors = {
			healthy: 'var(--status-success)',
			degraded: 'var(--status-warning)',
			error: 'var(--status-error)'
		};
		return colors[status];
	}

	/**
	 * Get overall health status icon
	 */
	function getOverallStatusIcon(status: OverallHealth['status']): string {
		const icons = {
			healthy: '🟢',
			degraded: '🟡',
			error: '🔴'
		};
		return icons[status];
	}

	/**
	 * Toggle component details expansion
	 */
	function toggleDetails(componentName: string) {
		const newExpanded = new Set(expandedComponents);
		if (newExpanded.has(componentName)) {
			newExpanded.delete(componentName);
		} else {
			newExpanded.add(componentName);
		}
		expandedComponents = newExpanded;
	}

	/**
	 * Format timestamp for detail display
	 */
	function formatDetailTimestamp(isoString: string): string {
		try {
			const date = new Date(isoString);
			return date.toLocaleString('en-US', {
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit'
			});
		} catch {
			return isoString;
		}
	}

	/**
	 * Fetch health data from backend
	 */
	async function fetchHealth() {
		try {
			const response = await fetch(`/flowbuilder/flows/${flowId}/runtime/health`);
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}
			const data = await response.json();
			health = data;
			errorMessage = null; // Clear error on success
		} catch (error) {
			errorMessage = 'Health monitoring unavailable - backend endpoint not ready';
			console.warn('[HealthTab] Health fetch failed:', error);
		}
	}

	// Effect: Manage health polling lifecycle (5 seconds)
	$effect(() => {
		if (!isActive) {
			return;
		}

		// Initial fetch
		fetchHealth();

		// Set up polling interval (5 seconds)
		const intervalId = setInterval(fetchHealth, 5000);

		// Cleanup on unmount or when dependencies change
		return () => {
			clearInterval(intervalId);
		};
	});

	// Effect: Manage uptime update lifecycle (1 second)
	$effect(() => {
		if (!isActive) {
			return;
		}

		// Set up uptime update interval (1 second)
		const intervalId = setInterval(() => {
			currentTime = new Date();
		}, 1000);

		// Cleanup on unmount or when dependencies change
		return () => {
			clearInterval(intervalId);
		};
	});
</script>

<div class="health-tab" data-testid="health-tab">
	<!-- Error Message -->
	{#if errorMessage}
		<div class="error-message" role="alert" data-testid="health-error">
			<span class="error-icon">⚠</span>
			<span>{errorMessage}</span>
		</div>
	{/if}

	<!-- Health Summary -->
	{#if health?.overall}
		<div class="health-summary" data-testid="health-summary">
			<span
				class="overall-status"
				style="color: {getOverallStatusColor(health.overall.status)}"
				aria-label="Overall system health: {health.overall.status}"
			>
				<span class="status-icon">{getOverallStatusIcon(health.overall.status)}</span>
				<span class="status-text">System Health:</span>
				<span class="health-count"
					>{health.overall.healthyCount}/{health.overall.totalCount} components healthy</span
				>
			</span>
		</div>
	{/if}

	<!-- Health Table -->
	<div class="table-container">
		{#if sortedComponents.length === 0 && !errorMessage}
			<div class="empty-state">
				<p>No health data available</p>
			</div>
		{:else if sortedComponents.length > 0}
			<table aria-label="Component health status">
				<thead>
					<tr>
						<th scope="col" class="col-component">Component</th>
						<th scope="col" class="col-status">Status</th>
						<th scope="col" class="col-uptime">Uptime</th>
						<th scope="col" class="col-activity">Last Activity</th>
					</tr>
				</thead>
				<tbody>
					{#each sortedComponents as component (component.name)}
						<tr data-testid="health-row" class:has-details={component.details !== null}>
							<td class="component-name">
								{#if component.details}
									<button
										class="expand-button"
										onclick={() => toggleDetails(component.name)}
										aria-expanded={isExpanded(component.name)}
										aria-label={isExpanded(component.name)
											? `Collapse details for ${component.name}`
											: `Expand details for ${component.name}`}
										data-testid="expand-button"
									>
										{isExpanded(component.name) ? '▼' : '▶'}
									</button>
								{/if}
								<span class="name-text">{component.name}</span>
							</td>
							<td class="status-cell">
								<span
									class="status-indicator"
									style="color: {getStatusColor(component.status)}"
									aria-label={getStatusLabel(component.status)}
									data-testid="status-indicator"
								>
									{getStatusIcon(component.status)}
								</span>
								<span class="status-label">{component.status}</span>
							</td>
							<td class="uptime-cell">
								<span class="uptime-value">{calculateUptime(component.startTime, currentTime)}</span>
							</td>
							<td class="activity-cell" class:stale={isStale(component.lastActivity, currentTime)}>
								<span class="activity-value"
									>{formatRelativeTime(component.lastActivity, currentTime)}</span
								>
							</td>
						</tr>

						<!-- Expandable Details Row -->
						{#if component.details && isExpanded(component.name)}
							<tr class="details-row" data-testid="details-row">
								<td colspan="4">
									<div class="details-content">
										<div class="detail-severity" class:is-error={component.details.severity === 'error'}>
											<span class="severity-label">{component.details.severity.toUpperCase()}:</span>
											<span class="severity-message">{component.details.message}</span>
										</div>
										<div class="detail-timestamp">
											Occurred: {formatDetailTimestamp(component.details.timestamp)}
										</div>
									</div>
								</td>
							</tr>
						{/if}
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
</div>

<style>
	.health-tab {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--ui-surface-primary);
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

	/* Health Summary */
	.health-summary {
		display: flex;
		align-items: center;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--ui-border-subtle);
		background: var(--ui-surface-secondary);
		gap: 0.5rem;
	}

	.overall-status {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		font-weight: 600;
	}

	.status-icon {
		font-size: 1rem;
		line-height: 1;
	}

	.status-text {
		color: var(--ui-text-primary);
	}

	.health-count {
		font-weight: 500;
		color: var(--ui-text-secondary);
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

	.col-component {
		width: 30%;
	}

	.col-status {
		width: 20%;
	}

	.col-uptime {
		width: 20%;
	}

	.col-activity {
		width: 30%;
	}

	tbody tr {
		border-bottom: 1px solid var(--ui-border-subtle);
		transition: background-color 0.1s;
	}

	tbody tr:not(.details-row):hover {
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

	/* Component Name Column */
	.component-name {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 500;
	}

	.expand-button {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.25rem 0.5rem;
		color: var(--ui-text-secondary);
		font-size: 0.75rem;
		line-height: 1;
		transition: all 0.2s;
		border-radius: 4px;
	}

	.expand-button:hover {
		background: var(--ui-surface-tertiary);
		color: var(--ui-text-primary);
	}

	.expand-button:focus-visible {
		outline: 2px solid var(--ui-focus-ring);
		outline-offset: 2px;
	}

	.name-text {
		color: var(--ui-text-primary);
		white-space: nowrap;
	}

	/* Status Column */
	.status-cell {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.status-indicator {
		font-size: 1rem;
		line-height: 1;
		display: inline-block;
	}

	.status-label {
		color: var(--ui-text-secondary);
		text-transform: capitalize;
		font-weight: 500;
	}

	/* Uptime Column */
	.uptime-cell {
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
		font-size: 0.875rem;
		color: var(--ui-text-secondary);
		white-space: nowrap;
	}

	.uptime-value {
		font-weight: 500;
	}

	/* Activity Column */
	.activity-cell {
		font-size: 0.875rem;
		color: var(--ui-text-secondary);
		white-space: nowrap;
	}

	.activity-cell.stale {
		color: var(--status-warning);
		font-weight: 600;
	}

	.activity-value {
		font-weight: 500;
	}

	/* Details Row */
	.details-row {
		background: var(--ui-surface-tertiary);
		border-bottom: 1px solid var(--ui-border-subtle);
	}

	.details-row td {
		padding: 0.75rem 1rem;
	}

	.details-content {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.25rem 0;
		padding-left: 2rem; /* Indent from expand button */
		font-size: 0.875rem;
	}

	.detail-severity {
		display: flex;
		gap: 0.5rem;
		align-items: baseline;
	}

	.severity-label {
		font-weight: 700;
		color: var(--status-warning);
		text-transform: uppercase;
		font-size: 0.75rem;
		letter-spacing: 0.5px;
	}

	.detail-severity.is-error .severity-label {
		color: var(--status-error);
	}

	.severity-message {
		color: var(--ui-text-primary);
		font-weight: 500;
	}

	.detail-timestamp {
		color: var(--ui-text-tertiary);
		font-size: 0.75rem;
		font-style: italic;
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
