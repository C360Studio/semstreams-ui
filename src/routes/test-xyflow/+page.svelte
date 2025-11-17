<script lang="ts">
	import { SvelteFlow } from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';
	import TestNode from './TestNode.svelte';

	const nodeTypes = {
		withHandles: TestNode
	};

	// Test 1: Nodes WITHOUT handles (baseline - should work)
	let nodes = $state.raw([
		{
			id: '1',
			position: { x: 100, y: 100 },
			data: { label: 'Node 1 (no handles)' }
		},
		{
			id: '2',
			position: { x: 300, y: 100 },
			data: { label: 'Node 2 (no handles)' }
		},
		// Test 2: Nodes WITH handles (testing if this works)
		{
			id: '3',
			type: 'withHandles',
			position: { x: 100, y: 300 },
			data: { label: 'Node 3 (with handles)' }
		},
		{
			id: '4',
			type: 'withHandles',
			position: { x: 300, y: 300 },
			data: { label: 'Node 4 (with handles)' }
		}
	]);

	// START WITH NO EDGES (like our real app after loading a flow)
	let edges = $state.raw([]);

	console.log('[TEST PAGE] Initial nodes:', nodes.length);
	console.log('[TEST PAGE] Initial edges:', edges.length);

	// TEST: Simulate our real app scenario - update node data AND add edges (like validation does)
	setTimeout(() => {
		console.log('[TEST PAGE] Updating node data AND adding edges (simulating validation)');

		// Update nodes (simulating port data being merged in)
		nodes = nodes.map(node => ({
			...node,
			data: {
				...node.data,
				updated: true  // Simulate data change
			}
		}));

		// Add edges at the same time
		edges = [
			{
				id: 'e1-2',
				source: '1',
				target: '2'
			},
			{
				id: 'e3-4',
				source: '3',
				target: '4',
				sourceHandle: 'out',
				targetHandle: 'in'
			}
		];
		console.log('[TEST PAGE] Nodes updated:', nodes.length, 'Edges added:', edges.length);
	}, 1000);
</script>

<div style="width: 100vw; height: 100vh; background: #f0f0f0;">
	<h1 style="position: absolute; top: 10px; left: 10px; z-index: 10;">
		XYFlow Minimal Test - Nodes: {nodes.length}, Edges: {edges.length}
	</h1>
	<SvelteFlow {nodes} {edges} {nodeTypes} />
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
	}
</style>
