<script lang="ts">
	import { SvelteFlow, Controls, Background, type Node, type Edge, type Connection } from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';
	import CustomFlowNode from './CustomFlowNode.svelte';
	import SimpleFlowNode from './SimpleFlowNode.svelte';
	import ConnectionLine from './ConnectionLine.svelte';
	import type { XYFlowNode, XYFlowEdge } from '$lib/utils/xyflow-converters';
	import { convertToXYFlowNode, convertToXYFlowEdge } from '$lib/utils/xyflow-converters';
	import type { ComponentType } from '$lib/types/component';
	import type { FlowConnection } from '$lib/types/flow';

	// Register custom node type
	const nodeTypes = {
		custom: CustomFlowNode
	};

	// Register custom edge types (all use ConnectionLine component)
	const edgeTypes = {
		default: ConnectionLine,
		manual: ConnectionLine,
		auto: ConnectionLine
	};

	interface FlowCanvasProps {
		nodes: XYFlowNode[];
		edges?: XYFlowEdge[];
		onNodeClick?: (nodeId: string) => void;
		onConnectionCreate?: () => void;
		runtimeState?: string;
	}

	let {
		nodes = $bindable([]),
		edges = $bindable([]),
		onNodeClick,
		onConnectionCreate,
		runtimeState
	}: FlowCanvasProps = $props();

	let canvasElement: HTMLDivElement;

	// DEBUG: Log edges to check sourceHandle/targetHandle
	$effect(() => {
		if (edges.length > 0) {
			console.log('[FlowCanvas] Edges:', edges.map(e => ({
				id: e.id,
				source: e.source,
				target: e.target,
				sourceHandle: e.sourceHandle,
				targetHandle: e.targetHandle
			})));
		}
	});

	// Handle node click
	function handleNodeClick(event: any) {
		// Get the actual DOM element that was clicked
		// XYFlow provides: event.event (the PointerEvent), event.node (the node data)
		const domEvent = event.event;
		const target = domEvent?.target as HTMLElement;

		// DEBUG: Log what was clicked
		console.log('[handleNodeClick] Clicked:', {
			tagName: target?.tagName,
			classes: target?.className,
			isHandle: target?.classList?.contains('svelte-flow__handle')
		});

		// Check if clicked on a handle - if so, ignore (XYFlow handles connection creation)
		if (target?.classList?.contains('svelte-flow__handle') || target?.closest?.('.svelte-flow__handle')) {
			console.log('[handleNodeClick] Handle clicked - ignoring');
			return;
		}

		// Get the node that was clicked
		const node = event.node;
		if (!node || !node.id) {
			return;
		}

		console.log('[handleNodeClick] Opening config for node:', node.id);
		onNodeClick?.(node.id);
	}

	/**
	 * Validate if a connection is valid based on port compatibility
	 * Returns error message if invalid, null if valid
	 */
	function validateConnection(connection: Connection): string | null {
		// TODO: Implement full port type validation when port metadata is available
		// For now, perform basic validation:

		// 1. Check for duplicate connections
		const isDuplicate = edges.some(
			(edge) =>
				edge.source === connection.source &&
				edge.target === connection.target &&
				edge.sourceHandle === connection.sourceHandle &&
				edge.targetHandle === connection.targetHandle
		);
		if (isDuplicate) {
			return 'Connection already exists between these ports';
		}

		// 2. Cannot connect node to itself
		if (connection.source === connection.target) {
			return 'Cannot connect a component to itself';
		}

		// Additional validation will be added when port metadata is available:
		// - Direction validation (output -> input only)
		// - Port type compatibility checking
		// - Interface contract matching

		return null; // Valid
	}

	// Handle manual connection creation via drag-to-connect
	function handleConnect(connection: Connection) {
		console.log('[handleConnect] Creating manual connection:', connection.source, '→', connection.target);

		// Block editing while flow is running
		if (runtimeState === 'running') {
			return;
		}

		// Validate connection has required fields
		if (!connection.source || !connection.target || !connection.sourceHandle || !connection.targetHandle) {
			return;
		}

		// Validate connection compatibility
		const validationError = validateConnection(connection);
		if (validationError) {
			console.log('[handleConnect] Rejected:', validationError);
			return;
		}

		// Generate unique connection ID
		const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

		// Create FlowConnection with source='manual'
		const flowConnection: FlowConnection = {
			id: connectionId,
			source_node_id: connection.source,
			source_port: connection.sourceHandle,
			target_node_id: connection.target,
			target_port: connection.targetHandle,
			source: 'manual',
			validationState: 'unknown' // Will be updated by validation
		};

		// Convert to XYFlow edge and add to array
		const xyflowEdge = convertToXYFlowEdge(flowConnection);
		edges = [...edges, xyflowEdge];

		console.log('[handleConnect] ✓ Manual connection created');

		// Notify parent that connection was created (will mark dirty)
		onConnectionCreate?.();
	}

	// Handle drag over - required for drop to work
	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'copy';
		}
	}

	// Handle drop - add new component to canvas
	function handleDrop(event: DragEvent) {
		event.preventDefault();

		if (!event.dataTransfer) return;

		// Block editing while flow is running
		if (runtimeState === 'running') {
			console.warn('Cannot add components while flow is running');
			return;
		}

		try {
			// Get the component type from drag data
			const componentTypeData = event.dataTransfer.getData('application/json');
			if (!componentTypeData) return;

			const componentType = JSON.parse(componentTypeData) as ComponentType;

			// Calculate drop position relative to canvas
			const canvasRect = canvasElement.getBoundingClientRect();
			const x = event.clientX - canvasRect.left;
			const y = event.clientY - canvasRect.top;

			// Generate unique node ID
			const nodeId = `node_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

			// Create FlowNode
			const flowNode = {
				id: nodeId,
				type: componentType.id,
				name: componentType.name,
				position: { x, y },
				config: {}
			};

			// Convert to XYFlow node and add to array
			const xyflowNode = convertToXYFlowNode(flowNode, onNodeClick);
			nodes = [...nodes, xyflowNode];
		} catch (error) {
			console.error('Failed to add component via drop:', error);
		}
	}
</script>

<div
	id="flow-canvas"
	class="flow-canvas"
	role="application"
	aria-label="Flow canvas for visual flow design"
	bind:this={canvasElement}
	ondragover={handleDragOver}
	ondrop={handleDrop}
>
	<SvelteFlow
		bind:nodes
		bind:edges
		{nodeTypes}
		{edgeTypes}
		fitView={true}
		nodesDraggable={true}
		nodesConnectable={true}
		nodeClickDistance={0}
		onnodeclick={handleNodeClick}
		onconnect={handleConnect}
	>
		<Controls />
		<Background />
	</SvelteFlow>
</div>

<style>
	.flow-canvas {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: var(--canvas-background, #f8f9fa);
		border: 1px solid var(--canvas-border, #dee2e6);
		border-radius: 4px;
	}

	:global(.svelte-flow) {
		width: 100%;
		height: 100%;
		background: var(--canvas-background, #f8f9fa);
	}

	:global(.svelte-flow__node) {
		background: white;
		border: 2px solid var(--node-border, #0066cc);
		border-radius: 8px;
		padding: 1rem;
		font-size: 0.875rem;
	}

	:global(.svelte-flow__node:hover) {
		border-color: var(--node-border-hover, #0052a3);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
	}

	:global(.svelte-flow__node.selected) {
		border-color: var(--node-border-selected, #0052a3);
		box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.2);
	}

	:global(.svelte-flow__edge-path) {
		stroke: var(--edge-stroke, #6c757d);
		stroke-width: 2;
	}

	:global(.svelte-flow__edge.selected .svelte-flow__edge-path) {
		stroke: var(--edge-stroke-selected, #0066cc);
		stroke-width: 3;
	}
</style>
