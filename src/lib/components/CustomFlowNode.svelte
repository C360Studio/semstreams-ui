<script lang="ts">
	import { Handle, Position, useUpdateNodeInternals, type NodeProps } from '@xyflow/svelte';
	import type { XYFlowNodeData } from '$lib/utils/xyflow-converters';
	import type { ValidatedPort } from '$lib/types/port';
	import { computePortVisualStyle } from '$lib/utils/port-utils';
	import { getDomainColor } from '$lib/utils/domain-colors';

	// Use XYFlow's NodeProps type with our custom data
	type CustomNodeData = XYFlowNodeData & {
		input_ports?: ValidatedPort[];
		output_ports?: ValidatedPort[];
	};

	// Accept ALL props that XYFlow passes (using NodeProps)
	let props: NodeProps<CustomNodeData> = $props();

	// Extract ID (constant) but access data reactively via props.data
	const { id } = props;

	// Get the update function to notify XYFlow of handle changes
	const updateNodeInternals = useUpdateNodeInternals();

	// Compute domain color for accent border
	const domainColor = $derived(getDomainColor(props.data.node.category || 'network'));

	// Combine input and output ports from backend validation
	const ports = $derived([
		...(props.data.input_ports || []),
		...(props.data.output_ports || [])
	]);

	// Update XYFlow internals when ports change
	$effect(() => {
		if (ports.length > 0) {
			console.log(`[CustomFlowNode ${id}] Port handles:`, ports.map(p => ({
				name: p.name,
				direction: p.direction,
				type: p.pattern,
				required: p.required
			})));
			// Notify XYFlow that this node's handles have changed
			updateNodeInternals(id);
		}
	});
</script>

<div
	class="custom-flow-node"
	data-node-id={id}
	data-node-type={props.data.node.type}
	style="border-left: var(--canvas-node-domain-accent-width) solid {domainColor};"
>
	<!-- Fallback: XYFlow Handles for connections when no port groups -->
	{#if ports.length === 0}
		<!-- Fallback: Generic handles when port data not available -->
		<Handle
			type="target"
			position={Position.Left}
			id="nats_output"
			class="nodrag"
			data-port-name="nats_output"
			data-direction="input"
		/>
		<Handle
			type="target"
			position={Position.Left}
			id="mavlink_input"
			class="nodrag"
			data-port-name="mavlink_input"
			data-direction="input"
		/>
		<Handle
			type="source"
			position={Position.Right}
			id="nats_output"
			class="nodrag"
			data-port-name="nats_output"
			data-direction="output"
		/>
		<Handle
			type="source"
			position={Position.Right}
			id="mavlink_input"
			class="nodrag"
			data-port-name="mavlink_input"
			data-direction="output"
		/>
	{/if}

	<!-- Color-coded connection handles with tooltips -->
	<!-- Input handles on left edge -->
	{#each ports.filter(p => p.direction === 'input') as port, index (port.name)}
		{@const style = computePortVisualStyle(port)}
		{@const tooltipText = `${port.name} (${port.required ? 'required' : 'optional'}): ${port.description || port.connection_id}`}
		<Handle
			type="target"
			position={Position.Left}
			id={port.name}
			class="port-handle port-handle-input"
			data-required={port.required}
			data-port-name={port.name}
			data-tooltip={tooltipText}
			style="top: {50 + index * 35}px; left: -6px; --port-color: {style.color};"
		/>
	{/each}

	<!-- Output handles on right edge -->
	{#each ports.filter(p => p.direction === 'output') as port, index (port.name)}
		{@const style = computePortVisualStyle(port)}
		{@const tooltipText = `${port.name} (${port.required ? 'required' : 'optional'}): ${port.description || port.connection_id}`}
		<Handle
			type="source"
			position={Position.Right}
			id={port.name}
			class="port-handle port-handle-output"
			data-required={port.required}
			data-port-name={port.name}
			data-tooltip={tooltipText}
			style="top: {50 + index * 35}px; right: -6px; --port-color: {style.color};"
		/>
	{/each}

	<div class="node-content">
		<div class="node-label">{props.data.label}</div>
		<div class="port-summary">
			{ports.filter(p => p.direction === 'input').length} inputs, {ports.filter(p => p.direction === 'output').length} outputs
		</div>
	</div>
</div>

<style>
	/* Remove visual border from XYFlow wrapper, keep layout intact */
	:global(.svelte-flow__node) {
		border: none !important;
		background: transparent !important;
		box-shadow: none !important;
	}

	.custom-flow-node {
		position: relative;
		display: flex;
		align-items: center;
		background: var(--canvas-node-background);
		border: var(--canvas-node-border-width) solid var(--canvas-node-border);
		border-radius: var(--canvas-node-border-radius);
		padding: 1rem;
		min-width: 150px;
		font-size: 0.875rem;
		transition: all 0.2s;
		user-select: none;
		cursor: pointer;
	}

	.node-content {
		flex: 1;
		padding: 0 0.5rem;
		pointer-events: all;
		z-index: 1;
	}

	.node-label {
		font-weight: 600;
	}

	.port-summary {
		font-size: 10px;
		color: var(--ui-text-tertiary);
		margin-top: 4px;
	}

	/* Color-coded port handles on node edges */
	:global(.port-handle) {
		width: var(--port-handle-size) !important;
		height: var(--port-handle-size) !important;
		border: var(--port-handle-border-width) solid var(--port-color, var(--port-pattern-unknown)) !important;
		background: var(--port-handle-background) !important;
		border-radius: 50% !important;
		opacity: 1 !important;
		cursor: pointer !important;
		/* Removed transition - causes "not stable" during Playwright drag */
	}

	/* Hover effects disabled - they interfere with drag operations in E2E tests */
	/* :global(.port-handle:hover) {
		box-shadow: 0 0 8px var(--port-color, var(--port-pattern-unknown)) !important;
	} */

	/* Required ports have filled center */
	:global(.port-handle[data-required="true"]) {
		background: var(--port-color, var(--port-pattern-unknown)) !important;
	}

	/* Tooltips using ::after pseudo-element */
	:global(.port-handle-input:hover::after),
	:global(.port-handle-output:hover::after) {
		content: attr(data-tooltip);
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		background: rgba(0, 0, 0, 0.9);
		color: white;
		padding: 6px 10px;
		border-radius: 4px;
		font-size: 11px;
		white-space: nowrap;
		z-index: 1000;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
		pointer-events: none;
	}

	:global(.port-handle-input:hover::after) {
		left: 20px;
	}

	:global(.port-handle-output:hover::after) {
		right: 20px;
	}
</style>
