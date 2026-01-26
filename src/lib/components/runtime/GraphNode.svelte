<script lang="ts">
	/**
	 * GraphNode - SVG node component for knowledge graph visualization
	 *
	 * Renders a single entity node with:
	 * - Rounded rectangle shape (consistent with FlowNode)
	 * - Color accent bar on left edge (by entity type)
	 * - Community border (if applicable)
	 * - Label and type display
	 * - Expansion indicator
	 */

	import type { GraphLayoutNode } from '$lib/types/graph';
	import type { LevelOfDetail } from '$lib/utils/graph-layout';
	import { getEntityLabel, getEntityTypeLabel } from '$lib/types/graph';

	interface GraphNodeProps {
		node: GraphLayoutNode;
		selected?: boolean;
		hovered?: boolean;
		lod?: LevelOfDetail;
		onclick?: (nodeId: string) => void;
		ondblclick?: (nodeId: string) => void;
		onmouseenter?: (nodeId: string) => void;
		onmouseleave?: () => void;
	}

	let {
		node,
		selected = false,
		hovered = false,
		lod = 'medium',
		onclick,
		ondblclick,
		onmouseenter,
		onmouseleave
	}: GraphNodeProps = $props();

	// Derived values
	const label = $derived(getEntityLabel(node.entity));
	const typeLabel = $derived(getEntityTypeLabel(node.entity));
	const showTypeLabel = $derived(lod !== 'low');
	const hasRelationships = $derived(
		node.entity.outgoing.length > 0 || node.entity.incoming.length > 0
	);

	// Accent bar width (matches FlowNode)
	const accentWidth = 4;

	// Visual properties
	const strokeWidth = $derived(selected ? 3 : hovered ? 2 : 1);
	const strokeColor = $derived(
		node.communityColor || (selected ? 'var(--ui-interactive-primary)' : 'var(--ui-border-subtle)')
	);

	function handleClick(event: MouseEvent) {
		event.stopPropagation();
		onclick?.(node.id);
	}

	function handleDblClick(event: MouseEvent) {
		event.stopPropagation();
		ondblclick?.(node.id);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			onclick?.(node.id);
		} else if (event.key === ' ') {
			event.preventDefault();
			ondblclick?.(node.id);
		}
	}

	function handleMouseEnter() {
		onmouseenter?.(node.id);
	}

	function handleMouseLeave() {
		onmouseleave?.();
	}
</script>

<g
	class="graph-node"
	class:selected
	class:hovered
	class:expanded={node.expanded}
	class:pinned={node.pinned}
	data-node-id={node.id}
	data-node-type={node.entity.idParts.type}
	transform="translate({node.x}, {node.y})"
	onclick={handleClick}
	ondblclick={handleDblClick}
	onkeydown={handleKeydown}
	onmouseenter={handleMouseEnter}
	onmouseleave={handleMouseLeave}
	role="button"
	tabindex="0"
	aria-label="Entity: {label} ({typeLabel}). Click to select, double-click to expand."
>
	<!-- Node background (rounded rectangle) -->
	<rect
		class="node-background"
		x="0"
		y="0"
		width={node.width}
		height={node.height}
		rx="8"
		ry="8"
		stroke={strokeColor}
		stroke-width={strokeWidth}
	/>

	<!-- Type accent bar (left edge) -->
	<rect
		class="node-accent"
		x="0"
		y="0"
		width={accentWidth}
		height={node.height}
		rx="8"
		ry="0"
		fill={node.color}
	/>
	<!-- Cover the right side of accent border-radius -->
	<rect
		class="node-accent-cover"
		x={accentWidth - 2}
		y="0"
		width="4"
		height={node.height}
		fill={node.color}
	/>

	<!-- Entity label (instance name) -->
	<text class="node-label" x={accentWidth + 12} y="22">
		{label}
	</text>

	<!-- Type label (shown at medium/high LOD) -->
	{#if showTypeLabel}
		<text class="node-type" x={accentWidth + 12} y="40">
			{typeLabel}
		</text>
	{/if}

	<!-- Relationship count (bottom of node) -->
	<text class="relationship-summary" x={accentWidth + 12} y={node.height - 10}>
		{node.entity.incoming.length} in, {node.entity.outgoing.length} out
	</text>

	<!-- Expansion indicator (shown if not expanded and has relationships) -->
	{#if !node.expanded && hasRelationships}
		<circle
			class="expand-indicator"
			cx={node.width - 12}
			cy="12"
			r="4"
			fill="var(--ui-interactive-primary)"
		/>
	{/if}

	<!-- Pin indicator -->
	{#if node.pinned}
		<circle
			class="pin-indicator"
			cx={node.width - 12}
			cy={node.height - 12}
			r="4"
			fill="var(--status-warning)"
		/>
	{/if}
</g>

<style>
	.graph-node {
		cursor: pointer;
	}

	.graph-node:focus {
		outline: none;
	}

	.graph-node:focus .node-background {
		stroke: var(--ui-focus-ring);
		stroke-width: 3;
	}

	.node-background {
		fill: var(--ui-surface-primary);
		transition:
			stroke 0.2s,
			stroke-width 0.2s;
	}

	.graph-node:hover .node-background {
		stroke: var(--ui-interactive-primary);
	}

	.graph-node.selected .node-background {
		stroke: var(--ui-interactive-primary);
		stroke-width: 3;
	}

	.node-label {
		font-size: 13px;
		font-weight: 600;
		fill: var(--ui-text-primary);
		pointer-events: none;
		user-select: none;
	}

	.node-type {
		font-size: 10px;
		fill: var(--ui-text-secondary);
		pointer-events: none;
		user-select: none;
	}

	.relationship-summary {
		font-size: 9px;
		fill: var(--ui-text-secondary);
		pointer-events: none;
		user-select: none;
	}

	.expand-indicator {
		pointer-events: none;
		opacity: 0.9;
	}

	.pin-indicator {
		pointer-events: none;
	}

	/* Dim non-selected nodes when something is selected */
	.graph-node:not(.selected):not(.hovered) {
		opacity: 0.9;
	}

	/* Expanded nodes have a subtle highlight */
	.graph-node.expanded .node-background {
		fill: var(--ui-surface-secondary);
	}
</style>
