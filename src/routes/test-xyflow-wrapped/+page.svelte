<script lang="ts">
	import { type Edge } from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';
	import TestCanvas from '../test-xyflow/TestCanvas.svelte';

	// Start with nodes but NO edges (like our real app)
	let nodes = $state([
		{
			id: '1',
			position: { x: 100, y: 100 },
			data: { label: 'Node 1' }
		},
		{
			id: '2',
			position: { x: 300, y: 100 },
			data: { label: 'Node 2' }
		},
		{
			id: '3',
			type: 'withHandles',
			position: { x: 100, y: 300 },
			data: { label: 'Node 3 (handles)' }
		},
		{
			id: '4',
			type: 'withHandles',
			position: { x: 300, y: 300 },
			data: { label: 'Node 4 (handles)' }
		}
	]);

	let edges = $state<Edge[]>([]);

	console.log('[WRAPPED TEST] Initial setup - nodes:', nodes.length, 'edges:', edges.length);

	// Add edges after delay (simulating validation)
	setTimeout(() => {
		console.log('[WRAPPED TEST] Adding edges via state update');
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
		console.log('[WRAPPED TEST] Edges added:', edges.length);
	}, 1000);
</script>

<div style="width: 100vw; height: 100vh;">
	<h1 style="position: absolute; top: 10px; left: 10px; z-index: 10;">
		Wrapped Test - Nodes: {nodes.length}, Edges: {edges.length}
	</h1>
	<TestCanvas bind:nodes bind:edges />
</div>
