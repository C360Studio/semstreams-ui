<script lang="ts">
	/**
	 * FlowNode - SVG node component for flow visualization
	 *
	 * Renders a single node in the flow canvas with:
	 * - Color-coded domain accent
	 * - Input/output port indicators
	 * - Click-to-edit interaction
	 */

	import type { LayoutNode } from '$lib/utils/d3-layout';
	import type { ValidatedPort } from '$lib/types/port';
	import { getDomainColor } from '$lib/utils/domain-colors';
	import { computePortVisualStyle } from '$lib/utils/port-utils';

	interface FlowNodeProps {
		node: LayoutNode;
		inputPorts?: ValidatedPort[];
		outputPorts?: ValidatedPort[];
		selected?: boolean;
		onclick?: (nodeId: string) => void;
	}

	let {
		node,
		inputPorts = [],
		outputPorts = [],
		selected = false,
		onclick
	}: FlowNodeProps = $props();

	// Domain color for accent
	const domainColor = $derived(getDomainColor(node.type || 'network'));

	// Port spacing
	const portSpacing = 20;
	const portRadius = 6;
	const accentWidth = 4;

	// Calculate port positions
	const inputPortPositions = $derived(
		inputPorts.map((port, index) => ({
			port,
			x: 0,
			y: 30 + index * portSpacing,
			style: computePortVisualStyle(port)
		}))
	);

	const outputPortPositions = $derived(
		outputPorts.map((port, index) => ({
			port,
			x: node.width,
			y: 30 + index * portSpacing,
			style: computePortVisualStyle(port)
		}))
	);

	function handleClick() {
		onclick?.(node.id);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onclick?.(node.id);
		}
	}
</script>

<g
	class="flow-node"
	class:selected
	transform="translate({node.x}, {node.y})"
	onclick={handleClick}
	onkeydown={handleKeydown}
	role="button"
	tabindex="0"
	aria-label="Flow node: {node.name}. Click to edit."
>
	<!-- Node background -->
	<rect
		class="node-background"
		x="0"
		y="0"
		width={node.width}
		height={node.height}
		rx="8"
		ry="8"
	/>

	<!-- Domain accent bar -->
	<rect
		class="node-accent"
		x="0"
		y="0"
		width={accentWidth}
		height={node.height}
		rx="8"
		ry="0"
		fill={domainColor}
	/>
	<!-- Cover the right side of accent border-radius -->
	<rect
		class="node-accent-cover"
		x={accentWidth - 2}
		y="0"
		width="4"
		height={node.height}
		fill={domainColor}
	/>

	<!-- Node label -->
	<text class="node-label" x={accentWidth + 12} y="24">
		{node.name}
	</text>

	<!-- Node type -->
	<text class="node-type" x={accentWidth + 12} y="42">
		{node.type}
	</text>

	<!-- Port summary -->
	<text class="port-summary" x={accentWidth + 12} y={node.height - 12}>
		{inputPorts.length} in, {outputPorts.length} out
	</text>

	<!-- Input ports (left side) -->
	{#each inputPortPositions as { port, x, y, style } (port.name)}
		<circle
			class="port port-input"
			class:port-required={port.required}
			cx={x}
			cy={y}
			r={portRadius}
			fill={port.required ? style.color : 'var(--pico-background-color)'}
			stroke={style.color}
			stroke-width="2"
		>
			<title>{port.name} ({port.required ? 'required' : 'optional'})</title>
		</circle>
	{/each}

	<!-- Output ports (right side) -->
	{#each outputPortPositions as { port, x, y, style } (port.name)}
		<circle
			class="port port-output"
			class:port-required={port.required}
			cx={x}
			cy={y}
			r={portRadius}
			fill={port.required ? style.color : 'var(--pico-background-color)'}
			stroke={style.color}
			stroke-width="2"
		>
			<title>{port.name} ({port.required ? 'required' : 'optional'})</title>
		</circle>
	{/each}
</g>

<style>
	.flow-node {
		cursor: pointer;
	}

	.flow-node:focus {
		outline: none;
	}

	.flow-node:focus .node-background {
		stroke: var(--pico-primary-focus);
		stroke-width: 3;
	}

	.node-background {
		fill: var(--pico-background-color);
		stroke: var(--pico-muted-border-color);
		stroke-width: 2;
		transition: stroke 0.2s, stroke-width 0.2s;
	}

	.flow-node:hover .node-background {
		stroke: var(--pico-primary);
	}

	.flow-node.selected .node-background {
		stroke: var(--pico-primary);
		stroke-width: 3;
	}

	.node-label {
		font-size: 14px;
		font-weight: 600;
		fill: var(--pico-color);
	}

	.node-type {
		font-size: 11px;
		fill: var(--pico-muted-color);
	}

	.port-summary {
		font-size: 10px;
		fill: var(--pico-muted-color);
	}

	.port {
		transition: r 0.2s;
	}

	.port:hover {
		r: 8;
	}
</style>
