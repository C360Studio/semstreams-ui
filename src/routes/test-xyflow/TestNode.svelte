<script lang="ts">
	import { Handle, Position } from '@xyflow/svelte';

	let { data } = $props();
</script>

<div class="test-node">
	<!-- Input handle -->
	<Handle
		type="target"
		position={Position.Left}
		id="in"
		style="background: #555;"
	/>

	<div>{data.label}</div>

	<!-- Output handle -->
	<Handle
		type="source"
		position={Position.Right}
		id="out"
		style="background: #555;"
	/>
</div>

<style>
	.test-node {
		padding: 10px 20px;
		border: 2px solid #222;
		border-radius: 8px;
		background: white;
		min-width: 150px;
		text-align: center;
	}
</style>
