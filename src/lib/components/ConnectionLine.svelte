<script lang="ts">
	import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/svelte';
	import type { XYFlowEdgeData } from '$lib/utils/xyflow-converters';

	type Props = EdgeProps<XYFlowEdgeData>;

	let {
		id,
		sourceX,
		sourceY,
		targetX,
		targetY,
		sourcePosition,
		targetPosition,
		data,
		markerEnd
	}: Props = $props();

	console.log('[ConnectionLine] Rendering edge:', id, 'source:', sourceX, sourceY, 'target:', targetX, targetY);

	// Build CSS classes based on connection properties
	const edgeClasses = $derived(() => {
		const classes = ['connection-line'];

		if (data?.source) {
			classes.push(`edge-${data.source}`);
		}

		if (data?.validationState) {
			classes.push(`edge-${data.validationState}`);
		}

		return classes.join(' ');
	});

	// Calculate the SVG path for the edge
	const [edgePath, labelX, labelY] = $derived(
		getBezierPath({
			sourceX,
			sourceY,
			sourcePosition,
			targetX,
			targetY,
			targetPosition
		})
	);

	// Determine stroke styling based on validation state
	const strokeColor = $derived(() => {
		if (!data?.validationState) return undefined;

		switch (data.validationState) {
			case 'error':
				return 'var(--status-error)'; // CSS variable for error color
			case 'warning':
				return 'var(--status-warning)'; // CSS variable for warning color
			case 'valid':
				return 'var(--ui-interactive-primary)'; // CSS variable for primary/valid color
			default:
				return undefined;
		}
	});

	const strokeWidth = $derived(() => {
		if (!data?.validationState) return 2;

		switch (data.validationState) {
			case 'error':
				return 3;
			case 'warning':
				return 2;
			default:
				return 2;
		}
	});

	// Determine if line should be dashed (for auto-discovered connections)
	const strokeDasharray = $derived(data?.source === 'auto' ? '5, 5' : undefined);
</script>

<g
	class={edgeClasses()}
	data-connection-id={id}
	data-source={data?.source}
	data-validation-state={data?.validationState}
>
	<BaseEdge
		path={edgePath}
		{markerEnd}
		style="stroke: {strokeColor() || '#b1b1b7'}; stroke-width: {strokeWidth()}; stroke-dasharray: {strokeDasharray};"
	/>
</g>

<style>
	.connection-line {
		cursor: pointer;
	}

	.edge-auto {
		opacity: 0.6;
	}

	.edge-manual {
		opacity: 1;
	}

	.edge-error {
		opacity: 1;
	}

	.edge-warning {
		opacity: 0.9;
	}

	.edge-valid {
		opacity: 0.8;
	}
</style>
