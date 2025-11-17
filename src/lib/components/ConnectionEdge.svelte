<script lang="ts">
	import type { Connection } from '$lib/types/flow';
	import { BaseEdge, ViewportPortal, getStraightPath } from '@xyflow/svelte';

	interface ConnectionEdgeProps {
		id: string;
		sourceX: number;
		sourceY: number;
		targetX: number;
		targetY: number;
		sourcePosition: string;
		targetPosition: string;
		data?: {
			connection: Connection;
		};
	}

	let { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data }: ConnectionEdgeProps = $props();

	const edgePath = $derived(
		getStraightPath({
			sourceX,
			sourceY,
			targetX,
			targetY
		})
	);

	const connection = $derived(data?.connection);
	const validationClass = $derived(connection?.validationState || 'valid');
</script>

<BaseEdge {id} path={edgePath[0]} />

{#if connection}
	<ViewportPortal target="front">
		<div
			class="edge-label {validationClass}"
			style="transform: translate(-50%, -50%) translate({(sourceX + targetX) / 2}px, {(sourceY +
				targetY) /
				2}px)"
		>
			{#if connection.validationState === 'invalid' || connection.validationState === 'warning'}
				<span class="validation-icon" title={connection.validationError || 'Validation issue'}>
					⚠️
				</span>
			{/if}
		</div>
	</ViewportPortal>
{/if}

<style>
	.edge-label {
		position: absolute;
		pointer-events: all;
		font-size: 0.75rem;
	}

	.validation-icon {
		cursor: help;
	}
</style>
