<script lang="ts">
	import { Handle, Position } from '@xyflow/svelte';
	import type { PortGroup } from '$lib/types/port';

	interface PortGroupProps {
		group: PortGroup;
		onToggle?: (groupId: string) => void;
		renderHandles?: boolean; // Default true, set false for testing
	}

	let { group, onToggle, renderHandles = true }: PortGroupProps = $props();

	// Determine XYFlow handle type and position based on group
	// Type: inputs are 'target', outputs are 'source'
	const handleType = group.position === 'left' ? 'target' : 'source';
	// Position: Handles face OUTWARD toward canvas (where connections come from/go to)
	// - Input groups (left of node) -> handles on LEFT edge (Position.Left) - connections arrive from left
	// - Output groups (right of node) -> handles on RIGHT edge (Position.Right) - connections depart to right
	const handlePosition = group.position === 'left' ? Position.Left : Position.Right;

	// Local collapsed state (session-only, not persisted)
	// This state is intentionally NOT saved to backend or stores.
	// It resets to group.collapsed value on component remount (e.g., page reload).
	// This provides a cleaner UX - users don't have to manage "saved" UI state.
	let isCollapsed = $state(group.collapsed);

	// Filter ports by the group's direction
	const filteredPorts = $derived(
		group.ports.filter((port) => {
			if (group.id === 'inputs') {
				return port.direction === 'input';
			} else if (group.id === 'outputs') {
				return port.direction === 'output';
			}
			return true;
		})
	);
</script>

<div class="port-group" data-port-group={group.id}>
	<!-- Always render handles for XYFlow (must remain in DOM) -->
	{#if renderHandles}
		<div class="port-handles">
			{#each filteredPorts as port, index (port.name)}
				<Handle
					type={handleType}
					position={handlePosition}
					id={port.name}
					class="port-handle-connection"
					style="top: {36 + index * 26}px; opacity: {isCollapsed ? 0 : 0.6}; pointer-events: {isCollapsed ? 'none' : 'all'};"
				/>
			{/each}
		</div>
	{/if}

	<button
		class="port-group-header"
		type="button"
		onclick={() => {
			isCollapsed = !isCollapsed;
			onToggle?.(group.id);
		}}
		aria-label={isCollapsed ? 'Expand port group' : 'Collapse port group'}
		aria-expanded={!isCollapsed}
	>
		<span class="toggle-icon">{isCollapsed ? '▶' : '▼'}</span>
		<span class="port-group-label">{group.label}</span>
	</button>

	{#if !isCollapsed}
		<div class="port-group-ports">
			{#each filteredPorts as port (port.name)}
				<div class="port-item" data-visible="true">
					<span class="port-indicator" class:required={port.required}></span>
					<span class="port-name" title={port.description || port.name}>{port.name}</span>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.port-group {
		position: relative;
		margin-bottom: 8px;
		min-width: 150px;
	}

	.port-handles {
		position: absolute;
		width: 100%;
		height: 100%;
		pointer-events: none; /* Allow clicks to pass through container */
	}

	.port-group-header {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 8px;
		background-color: #f8f9fa;
		border: 1px solid #e5e7eb;
		border-radius: 4px;
		cursor: pointer;
		width: 100%;
		text-align: left;
		transition: background-color 0.15s;
	}

	.port-group-header:hover {
		background-color: #e9ecef;
	}

	.toggle-icon {
		font-size: 10px;
		color: #666;
		width: 12px;
		display: inline-block;
	}

	.port-group-label {
		font-size: 11px;
		font-weight: 600;
		color: #333;
		user-select: none;
	}

	.port-group-ports {
		margin-top: 4px;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.port-item {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 4px 8px 4px 20px; /* Indent under header */
		background: white;
		border-radius: 3px;
		transition: background-color 0.15s;
	}

	.port-item:hover {
		background-color: #f8f9fa;
	}

	/* Style XYFlow handles - positioned absolutely by inline style */
	:global(.port-handle-connection) {
		position: absolute !important;
		width: 8px !important;
		height: 8px !important;
		border: 2px solid #3b82f6 !important;
		background: white !important;
		border-radius: 50% !important;
		transition: opacity 0.2s !important;
		pointer-events: all !important; /* Restore pointer events for handles */
	}

	:global(.port-handle-connection:hover) {
		opacity: 1 !important;
	}

	/* Position handles at edges based on group position */
	/* Inputs on left of node - handles on LEFT edge (connections arrive from left) */
	:global(.port-group[data-port-group="inputs"] .port-handle-connection) {
		left: 0 !important;
		right: auto !important;
	}

	/* Outputs on right of node - handles on RIGHT edge (connections depart to right) */
	:global(.port-group[data-port-group="outputs"] .port-handle-connection) {
		right: 0 !important;
		left: auto !important;
	}

	.port-indicator {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background-color: #cbd5e1;
		flex-shrink: 0;
	}

	.port-indicator.required {
		background-color: #3b82f6;
	}

	.port-name {
		font-size: 11px;
		color: #4b5563;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>
