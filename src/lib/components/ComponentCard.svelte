<script lang="ts">
	import type { FlowNode } from '$lib/types/flow';
	import { getDomainColor } from '$lib/utils/domain-colors';
	import { getComponentDomain } from '$lib/utils/component-category';

	interface ComponentCardProps {
		node: FlowNode;
		selected?: boolean;
		onSelect?: () => void;
		onEdit?: () => void;
		onDelete?: () => void;
	}

	let { node, selected = false, onSelect, onEdit, onDelete }: ComponentCardProps = $props();

	// Determine domain color based on component type
	const domainColor = $derived(getDomainColor(getComponentDomain(node.type)));

	// Handle card click for selection
	function handleCardClick() {
		onSelect?.();
	}

	// Handle keyboard events for accessibility
	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onSelect?.();
		}
	}

	// Handle edit button click
	function handleEditClick(event: MouseEvent) {
		event.stopPropagation(); // Prevent card selection
		onEdit?.();
	}

	// Handle delete button click
	function handleDeleteClick(event: MouseEvent) {
		event.stopPropagation(); // Prevent card selection
		onDelete?.();
	}
</script>

<div
	class="component-card"
	class:selected
	style="border-left: 4px solid {domainColor}"
	role="button"
	tabindex="0"
	aria-label={node.name}
	aria-pressed={selected}
	onclick={handleCardClick}
	onkeydown={handleKeyDown}
>
	<div class="card-content">
		<div class="card-header">
			<h4 class="component-name">{node.name || node.id}</h4>
		</div>
		<div class="component-type">Type: {node.type}</div>
	</div>

	<div class="card-actions">
		<button
			class="action-button edit-button"
			aria-label="Edit {node.name}"
			onclick={handleEditClick}
			title="Edit component"
		>
			⚙️
		</button>
		<button
			class="action-button delete-button"
			aria-label="Delete {node.name}"
			onclick={handleDeleteClick}
			title="Delete component"
		>
			🗑️
		</button>
	</div>
</div>

<style>
	.component-card {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem;
		background: var(--palette-card-background);
		border: 1px solid var(--palette-card-border);
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.2s;
		text-align: left;
		width: 100%;
		font-family: inherit;
		color: inherit;
	}

	.component-card:hover {
		border-color: var(--palette-card-border-hover);
		box-shadow: 0 2px 4px var(--palette-card-shadow-hover);
	}

	.component-card:focus {
		outline: 2px solid var(--ui-focus-ring);
		outline-offset: 2px;
		border-color: var(--palette-card-border-hover);
	}

	.component-card.selected {
		background: var(--palette-card-background-selected);
		border-color: var(--palette-card-border-selected);
	}

	.card-content {
		flex: 1;
		min-width: 0; /* Allow text truncation */
	}

	.card-header {
		display: flex;
		align-items: center;
		margin-bottom: 0.25rem;
	}

	.component-name {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--ui-text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.component-type {
		font-size: 0.75rem;
		color: var(--ui-text-secondary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.card-actions {
		display: flex;
		gap: 0.25rem;
		margin-left: 0.5rem;
	}

	.action-button {
		background: transparent;
		border: 1px solid var(--ui-border-subtle);
		border-radius: 4px;
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		font-size: 1rem;
		padding: 0;
		transition: all 0.2s;
	}

	.action-button:hover {
		background: var(--ui-surface-tertiary);
		border-color: var(--ui-border-default);
	}

	.action-button:focus {
		outline: 2px solid var(--ui-focus-ring);
		outline-offset: 1px;
	}

	.action-button:active {
		transform: scale(0.95);
	}
</style>
