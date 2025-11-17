<script lang="ts">
	/**
	 * LogsTab Component - Real-time log streaming with filtering
	 * Phase 2 of Runtime Visualization Panel
	 *
	 * Features:
	 * - SSE connection to backend /flows/{flowId}/runtime/logs
	 * - Real-time log streaming with timestamp, level, component, message
	 * - Filter by log level (DEBUG, INFO, WARN, ERROR)
	 * - Filter by component
	 * - Auto-scroll toggle
	 * - Clear logs functionality
	 * - Color-coded log levels using design system
	 * - Graceful error handling for unavailable backend
	 */

	interface LogEntry {
		timestamp: string;
		level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
		component: string;
		message: string;
	}

	interface LogsTabProps {
		flowId: string;
		isActive: boolean; // Don't connect if tab isn't active
	}

	let { flowId, isActive }: LogsTabProps = $props();

	// Reactive state
	let logs = $state<LogEntry[]>([]);
	let selectedLevel = $state<string>('all');
	let selectedComponent = $state<string>('all');
	let autoScroll = $state<boolean>(true);
	let connectionStatus = $state<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
	let errorMessage = $state<string | null>(null);

	// Refs for DOM elements
	let logContainerRef: HTMLDivElement | null = null;

	// Extract unique components from logs
	const uniqueComponents = $derived(
		Array.from(new Set(logs.map((log) => log.component))).sort()
	);

	// Filter logs based on selected level and component
	const filteredLogs = $derived(
		logs.filter((log) => {
			const levelMatch = selectedLevel === 'all' || log.level === selectedLevel;
			const componentMatch = selectedComponent === 'all' || log.component === selectedComponent;
			return levelMatch && componentMatch;
		})
	);

	// SSE Connection lifecycle
	let eventSource: EventSource | null = null;

	// Max logs to keep in memory (prevent memory issues)
	const MAX_LOGS = 1000;

	/**
	 * Add log entry to state
	 * Limits stored logs to MAX_LOGS (drops oldest)
	 */
	function addLog(entry: LogEntry) {
		logs = [...logs, entry].slice(-MAX_LOGS);

		// Auto-scroll to bottom if enabled
		if (autoScroll && logContainerRef) {
			// Use requestAnimationFrame to ensure DOM has updated
			requestAnimationFrame(() => {
				if (logContainerRef) {
					logContainerRef.scrollTop = logContainerRef.scrollHeight;
				}
			});
		}
	}

	/**
	 * Clear all logs
	 */
	function handleClearLogs() {
		logs = [];
		selectedLevel = 'all';
		selectedComponent = 'all';
	}

	/**
	 * Format timestamp for display (HH:MM:SS.mmm)
	 */
	function formatTimestamp(isoString: string): string {
		try {
			const date = new Date(isoString);
			const hours = date.getHours().toString().padStart(2, '0');
			const minutes = date.getMinutes().toString().padStart(2, '0');
			const seconds = date.getSeconds().toString().padStart(2, '0');
			const milliseconds = date.getMilliseconds().toString().padStart(3, '0');
			return `${hours}:${minutes}:${seconds}.${milliseconds}`;
		} catch {
			return isoString;
		}
	}

	/**
	 * Get CSS color variable for log level
	 */
	function getLevelColor(level: LogEntry['level']): string {
		const colors = {
			DEBUG: 'var(--ui-text-secondary)',
			INFO: 'var(--status-info)',
			WARN: 'var(--status-warning)',
			ERROR: 'var(--status-error)'
		};
		return colors[level];
	}

	/**
	 * Connect to SSE endpoint
	 */
	function connectSSE() {
		if (!isActive || eventSource) {
			return;
		}

		connectionStatus = 'connecting';
		errorMessage = null;

		try {
			const url = `/flowbuilder/flows/${flowId}/runtime/logs`;
			eventSource = new EventSource(url);

			eventSource.addEventListener('open', () => {
				connectionStatus = 'connected';
				console.log('[LogsTab] SSE connection established');
			});

			eventSource.addEventListener('log', (event) => {
				try {
					const logEntry: LogEntry = JSON.parse(event.data);
					addLog(logEntry);
				} catch (err) {
					console.error('[LogsTab] Failed to parse log entry:', err);
				}
			});

			eventSource.addEventListener('error', (err) => {
				console.warn('[LogsTab] SSE connection error:', err);
				connectionStatus = 'error';
				errorMessage = 'Log streaming unavailable - backend endpoint not ready';

				// Clean up on error
				if (eventSource) {
					eventSource.close();
					eventSource = null;
				}
			});
		} catch (err) {
			console.error('[LogsTab] Failed to create SSE connection:', err);
			connectionStatus = 'error';
			errorMessage = 'Failed to connect to log stream';
		}
	}

	/**
	 * Disconnect from SSE endpoint
	 */
	function disconnectSSE() {
		if (eventSource) {
			eventSource.close();
			eventSource = null;
			connectionStatus = 'disconnected';
			console.log('[LogsTab] SSE connection closed');
		}
	}

	// Effect: Manage SSE connection lifecycle
	$effect(() => {
		if (isActive) {
			connectSSE();
		} else {
			disconnectSSE();
		}

		// Cleanup on unmount
		return () => {
			disconnectSSE();
		};
	});

	// Effect: Scroll to bottom when filtered logs change (if auto-scroll enabled)
	$effect(() => {
		// Access filteredLogs to subscribe to changes
		filteredLogs;

		if (autoScroll && logContainerRef) {
			requestAnimationFrame(() => {
				if (logContainerRef) {
					logContainerRef.scrollTop = logContainerRef.scrollHeight;
				}
			});
		}
	});
</script>

<div class="logs-tab" data-testid="logs-tab">
	<!-- Filter Controls -->
	<div class="filter-bar">
		<div class="filter-controls">
			<label for="level-filter">
				<span class="filter-label">Level:</span>
				<select id="level-filter" bind:value={selectedLevel} data-testid="level-filter">
					<option value="all">All Levels</option>
					<option value="DEBUG">DEBUG</option>
					<option value="INFO">INFO</option>
					<option value="WARN">WARN</option>
					<option value="ERROR">ERROR</option>
				</select>
			</label>

			<label for="component-filter">
				<span class="filter-label">Component:</span>
				<select id="component-filter" bind:value={selectedComponent} data-testid="component-filter">
					<option value="all">All Components</option>
					{#each uniqueComponents as component}
						<option value={component}>{component}</option>
					{/each}
				</select>
			</label>

			<button
				class="clear-button"
				onclick={handleClearLogs}
				data-testid="clear-logs-button"
				aria-label="Clear all logs"
			>
				Clear
			</button>
		</div>

		<div class="auto-scroll-control">
			<label for="auto-scroll">
				<input
					type="checkbox"
					id="auto-scroll"
					bind:checked={autoScroll}
					data-testid="auto-scroll-toggle"
				/>
				<span>Auto-scroll</span>
			</label>
		</div>
	</div>

	<!-- Connection Status -->
	{#if connectionStatus === 'error'}
		<div class="connection-status error" data-testid="connection-error">
			<span class="status-icon">⚠</span>
			<span>{errorMessage || 'Log streaming unavailable'}</span>
		</div>
	{:else if connectionStatus === 'connecting'}
		<div class="connection-status connecting" data-testid="connection-connecting">
			<span class="status-icon">⋯</span>
			<span>Connecting to log stream...</span>
		</div>
	{/if}

	<!-- Log Display -->
	<div class="log-container" bind:this={logContainerRef} data-testid="log-container">
		{#if filteredLogs.length === 0}
			<div class="empty-state">
				{#if logs.length === 0}
					<p>No logs yet. Waiting for runtime events...</p>
				{:else}
					<p>No logs match current filters.</p>
				{/if}
			</div>
		{:else}
			<div class="log-entries" role="log" aria-live="polite" aria-atomic="false">
				{#each filteredLogs as log (log.timestamp + log.component + log.message)}
					<div class="log-entry" data-level={log.level} data-testid="log-entry">
						<span class="log-timestamp">{formatTimestamp(log.timestamp)}</span>
						<span class="log-level" style="color: {getLevelColor(log.level)}">{log.level}</span>
						<span class="log-component">[{log.component}]</span>
						<span class="log-message">{log.message}</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.logs-tab {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--ui-surface-primary);
	}

	/* Filter Bar */
	.filter-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--ui-border-subtle);
		background: var(--ui-surface-secondary);
		gap: 1rem;
		flex-wrap: wrap;
	}

	.filter-controls {
		display: flex;
		gap: 1rem;
		align-items: center;
		flex-wrap: wrap;
	}

	.filter-controls label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
	}

	.filter-label {
		color: var(--ui-text-secondary);
		font-weight: 500;
	}

	.filter-controls select {
		padding: 0.375rem 0.5rem;
		border: 1px solid var(--ui-border-subtle);
		border-radius: 4px;
		background: var(--ui-surface-primary);
		color: var(--ui-text-primary);
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.filter-controls select:hover {
		border-color: var(--ui-border-interactive);
	}

	.filter-controls select:focus {
		outline: none;
		border-color: var(--ui-focus-ring);
		box-shadow: 0 0 0 2px rgba(15, 98, 254, 0.1);
	}

	.clear-button {
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

	.clear-button:hover {
		background: var(--ui-surface-tertiary);
		color: var(--ui-text-primary);
		border-color: var(--ui-border-strong);
	}

	.auto-scroll-control {
		display: flex;
		align-items: center;
	}

	.auto-scroll-control label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: var(--ui-text-secondary);
		cursor: pointer;
	}

	.auto-scroll-control input[type='checkbox'] {
		cursor: pointer;
	}

	/* Connection Status */
	.connection-status {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		border-bottom: 1px solid var(--ui-border-subtle);
	}

	.connection-status.error {
		background: var(--status-error-container);
		color: var(--status-error-on-container);
	}

	.connection-status.connecting {
		background: var(--status-info-container);
		color: var(--status-info-on-container);
	}

	.status-icon {
		font-size: 1rem;
	}

	/* Log Container */
	.log-container {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
		padding: 0.5rem 1rem;
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

	/* Log Entries */
	.log-entries {
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
		font-size: 0.75rem;
		line-height: 1.5;
	}

	.log-entry {
		display: grid;
		grid-template-columns: auto auto auto 1fr;
		gap: 0.75rem;
		padding: 0.25rem 0;
		border-bottom: 1px solid transparent;
		transition: background-color 0.1s;
	}

	.log-entry:hover {
		background: var(--ui-surface-secondary);
		border-bottom-color: var(--ui-border-subtle);
	}

	.log-timestamp {
		color: var(--ui-text-tertiary);
		font-weight: 500;
		white-space: nowrap;
	}

	.log-level {
		font-weight: 700;
		text-align: left;
		min-width: 4rem;
		white-space: nowrap;
	}

	.log-component {
		color: var(--ui-text-secondary);
		font-weight: 500;
		white-space: nowrap;
	}

	.log-message {
		color: var(--ui-text-primary);
		white-space: pre-wrap;
		word-break: break-word;
	}

	/* Log level specific styles */
	.log-entry[data-level='ERROR'] {
		background: var(--status-error-container);
	}

	.log-entry[data-level='WARN'] {
		background: var(--status-warning-container);
	}

	/* Scrollbar styling (optional, for better UX) */
	.log-container::-webkit-scrollbar {
		width: 8px;
	}

	.log-container::-webkit-scrollbar-track {
		background: var(--ui-surface-secondary);
	}

	.log-container::-webkit-scrollbar-thumb {
		background: var(--ui-border-strong);
		border-radius: 4px;
	}

	.log-container::-webkit-scrollbar-thumb:hover {
		background: var(--ui-interactive-secondary);
	}
</style>
