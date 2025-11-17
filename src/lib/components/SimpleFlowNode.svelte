<script lang="ts">
	import { Handle, Position, type NodeProps } from '@xyflow/svelte';

	let { id, data }: NodeProps = $props();

	console.log('[SimpleFlowNode] Rendering node:', id);
</script>

<div
	class="simple-node"
	data-node-id={id}
>
	<!-- Fixed handles for testing -->
	<Handle
		type="target"
		position={Position.Left}
		id="nats_output"
	/>

	<Handle
		type="target"
		position={Position.Left}
		id="mavlink_input"
	/>

	<div class="node-label">{data.label}</div>

	<Handle
		type="source"
		position={Position.Right}
		id="nats_output"
	/>

	<Handle
		type="source"
		position={Position.Right}
		id="mavlink_input"
	/>
</div>

<style>
	.simple-node {
		padding: 10px 20px;
		border: 2px solid #0066cc;
		border-radius: 8px;
		background: white;
		min-width: 120px;
	}

	.node-label {
		font-size: 14px;
		font-weight: 600;
	}
</style>
