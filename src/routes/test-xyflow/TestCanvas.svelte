<script lang="ts">
	import { SvelteFlow } from '@xyflow/svelte';
	import TestNode from './TestNode.svelte';

	interface TestCanvasProps {
		nodes: any[];
		edges?: any[];
	}

	// Use $bindable like our real FlowCanvas
	let {
		nodes = $bindable([]),
		edges = $bindable([])
	}: TestCanvasProps = $props();

	const nodeTypes = {
		withHandles: TestNode
	};

	console.log('[TestCanvas] Rendering with nodes:', nodes.length, 'edges:', edges.length);
</script>

<div style="width: 100%; height: 100%; background: #f8f9fa;">
	<SvelteFlow
		bind:nodes
		bind:edges
		{nodeTypes}
		fitView={true}
	/>
</div>
