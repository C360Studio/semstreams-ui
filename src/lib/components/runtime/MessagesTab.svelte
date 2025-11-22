<script lang="ts">
	import { SvelteSet } from "svelte/reactivity";
	/**
	 * MessagesTab Component - NATS message flow visualization
	 * Phase 4 of Runtime Visualization Panel
	 *
	 * Features:
	 * - Poll backend messages endpoint at configurable interval (default: 2s)
	 * - Display NATS message traffic (published, received, processed)
	 * - Filter by component and direction
	 * - Expandable metadata for each message
	 * - Auto-scroll toggle
	 * - Clear messages functionality
	 * - Color-coded direction indicators using design system
	 * - Monospace font for NATS subjects
	 * - Millisecond precision timestamps
	 */

	interface MessageLogEntry {
		timestamp: string; // ISO 8601
		subject: string; // NATS subject
		message_id: string; // Unique message ID
		component: string; // Component name
		direction: 'published' | 'received' | 'processed';
		summary: string; // Human-readable summary
		metadata?: Record<string, any>; // Optional metadata
	}

	interface MessagesResponse {
		timestamp: string;
		messages: MessageLogEntry[];
		total: number;
		limit: number;
	}

	interface MessagesTabProps {
		flowId: string;
		isActive: boolean; // Don't poll if tab isn't active
	}

	type PollRate = 1000 | 2000 | 5000 | 'manual';

	let { flowId, isActive }: MessagesTabProps = $props();

	// Reactive state
	let messages = $state<MessageLogEntry[]>([]);
	let componentFilter = $state<string>('all');
	let directionFilter = $state<'all' | 'published' | 'received' | 'processed'>('all');
	let autoScroll = $state<boolean>(true);
	let pollRate = $state<PollRate>(2000);
	let expandedMessageIds = new SvelteSet<string>();
	let errorMessage = $state<string | null>(null);

	// Refs for DOM elements
	let messagesContainerRef: HTMLDivElement | null = null;

	// Max messages to keep in memory (prevent memory issues)
	const MAX_MESSAGES = 500;

	// Extract unique components from messages
	const uniqueComponents = $derived(
		Array.from(new Set(messages.map((msg) => msg.component))).sort()
	);

	// Filter messages based on selected component and direction
	const filteredMessages = $derived(
		messages.filter((msg) => {
			const componentMatch = componentFilter === 'all' || msg.component === componentFilter;
			const directionMatch = directionFilter === 'all' || msg.direction === directionFilter;
			return componentMatch && directionMatch;
		})
	);

	/**
	 * Format timestamp for display (HH:MM:SS.mmm)
	 */
	function formatTime(isoString: string): string {
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
	 * Get direction icon
	 */
	function getDirectionIcon(direction: MessageLogEntry['direction']): string {
		const icons = {
			published: '→',
			received: '←',
			processed: '⟳'
		};
		return icons[direction];
	}

	/**
	 * Get direction color from design system
	 */
	function getDirectionColor(direction: MessageLogEntry['direction']): string {
		const colors = {
			published: 'var(--status-info)',
			received: 'var(--status-success)',
			processed: 'var(--ui-text-secondary)'
		};
		return colors[direction];
	}

	/**
	 * Toggle metadata visibility for a message
	 */
	function toggleMetadata(messageId: string) {
		if (expandedMessageIds.has(messageId)) {
			expandedMessageIds.delete(messageId);
		} else {
			expandedMessageIds.add(messageId);
		}
	}

	/**
	 * Clear all messages
	 */
	function clearMessages() {
		messages = [];
		componentFilter = 'all';
		directionFilter = 'all';
		expandedMessageIds.clear();
	}

	/**
	 * Fetch messages from backend
	 */
	async function fetchMessages() {
		try {
			const response = await fetch(`/flowbuilder/flows/${flowId}/runtime/messages`);
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}
			const data: MessagesResponse = await response.json();

			// Add new messages (only those we don't have yet) and limit total stored
			const existingIds = new Set(messages.map((m) => m.message_id));
			const newMessages = data.messages.filter((m) => !existingIds.has(m.message_id));
			messages = [...messages, ...newMessages].slice(-MAX_MESSAGES);

			errorMessage = null; // Clear error on success

			// Auto-scroll to bottom if enabled
			if (autoScroll && messagesContainerRef) {
				requestAnimationFrame(() => {
					if (messagesContainerRef) {
						messagesContainerRef.scrollTop = messagesContainerRef.scrollHeight;
					}
				});
			}
		} catch (error) {
			errorMessage = 'Messages unavailable - backend endpoint not ready';
			console.warn('[MessagesTab] Messages fetch failed:', error);
		}
	}

	/**
	 * Handle manual refresh button click
	 */
	function handleManualRefresh() {
		fetchMessages();
	}

	// Effect: Manage polling lifecycle
	$effect(() => {
		// Only poll when tab is active and poll rate is not manual
		if (!isActive || pollRate === 'manual') {
			return;
		}

		// Initial fetch
		fetchMessages();

		// Set up polling interval
		const intervalId = setInterval(fetchMessages, pollRate);

		// Cleanup on unmount or when dependencies change
		return () => {
			clearInterval(intervalId);
		};
	});

	// Effect: Auto-scroll when filtered messages change
	$effect(() => {
		// Access filteredMessages to subscribe to changes
		filteredMessages;

		if (autoScroll && messagesContainerRef) {
			requestAnimationFrame(() => {
				if (messagesContainerRef) {
					messagesContainerRef.scrollTop = messagesContainerRef.scrollHeight;
				}
			});
		}
	});
</script>

<div class="messages-tab" data-testid="messages-tab">
	<!-- Control Bar -->
	<div class="control-bar">
		<div class="filter-controls">
			<label for="component-filter">
				<span class="filter-label">Component:</span>
				<select
					id="component-filter"
					bind:value={componentFilter}
					data-testid="component-filter"
					aria-label="Filter by component"
				>
					<option value="all">All Components</option>
					{#each uniqueComponents as component (component)}
						<option value={component}>{component}</option>
					{/each}
				</select>
			</label>

			<label for="direction-filter">
				<span class="filter-label">Direction:</span>
				<select
					id="direction-filter"
					bind:value={directionFilter}
					data-testid="direction-filter"
					aria-label="Filter by direction"
				>
					<option value="all">All</option>
					<option value="published">Published</option>
					<option value="received">Received</option>
					<option value="processed">Processed</option>
				</select>
			</label>

			<label for="poll-rate">
				<span class="filter-label">Poll:</span>
				<select
					id="poll-rate"
					bind:value={pollRate}
					data-testid="poll-rate-selector"
					aria-label="Poll rate"
				>
					<option value={1000}>Every 1s</option>
					<option value={2000}>Every 2s</option>
					<option value={5000}>Every 5s</option>
					<option value="manual">Manual</option>
				</select>
			</label>

			{#if pollRate === 'manual'}
				<button
					class="refresh-button"
					onclick={handleManualRefresh}
					data-testid="manual-refresh-button"
					aria-label="Refresh messages now"
				>
					Refresh
				</button>
			{/if}

			<button
				class="clear-button"
				onclick={clearMessages}
				data-testid="clear-messages-button"
				aria-label="Clear all messages"
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

	<!-- Error Message -->
	{#if errorMessage}
		<div class="error-message" role="alert">
			<span class="error-icon">⚠</span>
			<span>{errorMessage}</span>
		</div>
	{/if}

	<!-- Messages Container -->
	<div class="messages-container" bind:this={messagesContainerRef} data-testid="messages-container">
		{#if filteredMessages.length === 0}
			<div class="empty-state">
				{#if messages.length === 0}
					<p>No messages yet. Waiting for NATS traffic...</p>
				{:else}
					<p>No messages match current filters.</p>
				{/if}
			</div>
		{:else}
			<div class="message-entries" role="log" aria-live="polite" aria-atomic="false">
				{#each filteredMessages as message (message.message_id)}
					<div class="message-entry" data-testid="message-entry">
						<span class="timestamp">{formatTime(message.timestamp)}</span>
						<span
							class="direction"
							class:published={message.direction === 'published'}
							class:received={message.direction === 'received'}
							class:processed={message.direction === 'processed'}
							style="color: {getDirectionColor(message.direction)}"
							aria-label={message.direction}
						>
							{getDirectionIcon(message.direction)}
						</span>
						<span class="component">[{message.component}]</span>
						<span class="subject">{message.subject}</span>
						<span class="summary">{message.summary}</span>
						{#if message.metadata}
							<button
								class="metadata-toggle"
								onclick={() => toggleMetadata(message.message_id)}
								aria-expanded={expandedMessageIds.has(message.message_id)}
								aria-label="Toggle metadata"
							>
								{expandedMessageIds.has(message.message_id) ? '▼' : '▶'}
							</button>
						{/if}
					</div>
					{#if expandedMessageIds.has(message.message_id) && message.metadata}
						<div class="metadata">
							<pre>{JSON.stringify(message.metadata, null, 2)}</pre>
						</div>
					{/if}
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.messages-tab {
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

	.refresh-button,
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

	.refresh-button:hover,
	.clear-button:hover {
		background: var(--ui-surface-tertiary);
		color: var(--ui-text-primary);
		border-color: var(--ui-border-strong);
	}

	.refresh-button:active,
	.clear-button:active {
		transform: scale(0.98);
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

	/* Messages Container */
	.messages-container {
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

	/* Message Entries */
	.message-entries {
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
		font-size: 0.75rem;
		line-height: 1.5;
	}

	.message-entry {
		display: grid;
		grid-template-columns: auto auto auto auto 1fr auto;
		gap: 0.75rem;
		padding: 0.25rem 0;
		border-bottom: 1px solid transparent;
		transition: background-color 0.1s;
		align-items: center;
	}

	.message-entry:hover {
		background: var(--ui-surface-secondary);
		border-bottom-color: var(--ui-border-subtle);
	}

	.timestamp {
		color: var(--ui-text-tertiary);
		font-weight: 500;
		white-space: nowrap;
	}

	.direction {
		font-size: 1rem;
		font-weight: 700;
		white-space: nowrap;
		min-width: 1.5rem;
		text-align: center;
	}

	.component {
		color: var(--ui-text-secondary);
		font-weight: 500;
		white-space: nowrap;
	}

	.subject {
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
		color: var(--ui-text-primary);
		font-weight: 600;
		white-space: nowrap;
	}

	.summary {
		color: var(--ui-text-primary);
		white-space: pre-wrap;
		word-break: break-word;
	}

	.metadata-toggle {
		background: none;
		border: none;
		color: var(--ui-text-secondary);
		cursor: pointer;
		padding: 0.25rem;
		font-size: 0.75rem;
		transition: color 0.2s;
	}

	.metadata-toggle:hover {
		color: var(--ui-text-primary);
	}

	/* Metadata Display */
	.metadata {
		background: var(--ui-surface-secondary);
		border: 1px solid var(--ui-border-subtle);
		border-radius: 4px;
		padding: 0.75rem;
		margin: 0.25rem 0 0.5rem 0;
	}

	.metadata pre {
		margin: 0;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
		font-size: 0.75rem;
		color: var(--ui-text-primary);
		white-space: pre-wrap;
		word-break: break-word;
	}

	/* Scrollbar styling (optional, for better UX) */
	.messages-container::-webkit-scrollbar {
		width: 8px;
	}

	.messages-container::-webkit-scrollbar-track {
		background: var(--ui-surface-secondary);
	}

	.messages-container::-webkit-scrollbar-thumb {
		background: var(--ui-border-strong);
		border-radius: 4px;
	}

	.messages-container::-webkit-scrollbar-thumb:hover {
		background: var(--ui-interactive-secondary);
	}
</style>
