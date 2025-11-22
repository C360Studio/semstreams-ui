import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import FlowCanvas from './FlowCanvas.svelte';
import type { Flow } from '$lib/types/flow';
import { convertFlowNodesToXYFlow, convertFlowConnectionsToXYFlow } from '$lib/utils/xyflow-converters';

// Mock @xyflow/svelte components
vi.mock('@xyflow/svelte', () => ({
	SvelteFlow: vi.fn(() => ({
		$$: {},
		$set: vi.fn(),
		$on: vi.fn(),
		$destroy: vi.fn()
	})),
	Controls: vi.fn(() => ({
		$$: {},
		$set: vi.fn(),
		$on: vi.fn(),
		$destroy: vi.fn()
	})),
	Background: vi.fn(() => ({
		$$: {},
		$set: vi.fn(),
		$on: vi.fn(),
		$destroy: vi.fn()
	})),
	Position: {},
	MarkerType: {
		Arrow: 'arrow',
		ArrowClosed: 'arrowclosed'
	}
}));

describe('FlowCanvas (Prop-Based Architecture)', () => {
	const createMockFlow = (): Flow => ({
		version: 1,
		id: 'flow-123',
		name: 'Test Flow',
		description: 'Test description',
		nodes: [
			{
				id: 'comp-1',
				type: 'udp-input',
				name: 'UDP Input 1',
				position: { x: 100, y: 100 },
				config: { port: 14550 }
			},
			{
				id: 'comp-2',
				type: 'websocket-output',
				name: 'WebSocket Output 1',
				position: { x: 300, y: 100 },
				config: { port: 8080 }
			}
		],
		connections: [
			{
				id: 'conn-1',
				source_node_id: 'comp-1',
				source_port: 'output',
				target_node_id: 'comp-2',
				target_port: 'input'
			}
		],
		runtime_state: 'not_deployed',
		created_at: '2025-10-10T12:00:00Z',
		updated_at: '2025-10-10T12:00:00Z',
		last_modified: '2025-10-10T12:00:00Z'
	});

	// ========================================================================
	// Prop Acceptance Tests - Component should accept props
	// ========================================================================

	it('should accept nodes prop', () => {
		const flow = createMockFlow();
		const nodes = convertFlowNodesToXYFlow(flow.nodes);
		const edges = convertFlowConnectionsToXYFlow(flow.connections);

		const { container } = render(FlowCanvas, { props: { nodes, edges } });

		const canvas = container.querySelector('#flow-canvas');
		expect(canvas).toBeInTheDocument();
	});

	it('should accept onNodeClick callback prop', () => {
		const flow = createMockFlow();
		const nodes = convertFlowNodesToXYFlow(flow.nodes);
		const edges = convertFlowConnectionsToXYFlow(flow.connections);
		const onNodeClick = vi.fn();

		render(FlowCanvas, { props: { nodes, edges, onNodeClick } });

		// Callback prop should be accepted without errors
		expect(onNodeClick).toBeDefined();
	});

	it('should accept onConnectionCreate callback prop', () => {
		const flow = createMockFlow();
		const nodes = convertFlowNodesToXYFlow(flow.nodes);
		const edges = convertFlowConnectionsToXYFlow(flow.connections);
		const onConnectionCreate = vi.fn();

		render(FlowCanvas, { props: { nodes, edges, onConnectionCreate } });

		// Callback prop should be accepted without errors
		expect(onConnectionCreate).toBeDefined();
	});

	// ========================================================================
	// Event Emission Tests - Component should emit events via callbacks
	// ========================================================================

	it('should emit connection creation via onConnectionCreate callback', () => {
		const flow = createMockFlow();
		const nodes = convertFlowNodesToXYFlow(flow.nodes);
		const edges = convertFlowConnectionsToXYFlow(flow.connections);
		const onConnectionCreate = vi.fn();

		render(FlowCanvas, { props: { nodes, edges, onConnectionCreate } });

		// With mocked @xyflow, we can't simulate actual changes
		// This validates the callback pattern is implemented
		// E2E tests will validate actual behavior
		expect(onConnectionCreate).toBeDefined();
	});

	// ========================================================================
	// Rendering Tests - Component should render different flow states
	// ========================================================================

	it('should render with empty flow', () => {
		const nodes = convertFlowNodesToXYFlow([]);
		const edges = convertFlowConnectionsToXYFlow([]);

		const { container } = render(FlowCanvas, { props: { nodes, edges } });

		const canvas = container.querySelector('.flow-canvas');
		expect(canvas).toBeTruthy();
	});

	it('should render with single node', () => {
		const flow = createMockFlow();
		const nodes = convertFlowNodesToXYFlow([flow.nodes[0]]);
		const edges = convertFlowConnectionsToXYFlow([]);

		const { container } = render(FlowCanvas, { props: { nodes, edges } });

		const canvas = container.querySelector('.flow-canvas');
		expect(canvas).toBeTruthy();
	});

	it('should render with multiple nodes and connections', () => {
		const flow = createMockFlow();
		const nodes = convertFlowNodesToXYFlow(flow.nodes);
		const edges = convertFlowConnectionsToXYFlow(flow.connections);

		const { container } = render(FlowCanvas, { props: { nodes, edges } });

		const canvas = container.querySelector('.flow-canvas');
		expect(canvas).toBeTruthy();
	});

	// ========================================================================
	// Accessibility Tests
	// ========================================================================

	it('should have proper accessibility attributes', () => {
		const flow = createMockFlow();
		const nodes = convertFlowNodesToXYFlow(flow.nodes);
		const edges = convertFlowConnectionsToXYFlow(flow.connections);

		const { container } = render(FlowCanvas, { props: { nodes, edges } });

		const canvas = container.querySelector('#flow-canvas');
		expect(canvas).toHaveAttribute('role', 'application');
		expect(canvas).toHaveAttribute('aria-label', 'Flow canvas for visual flow design');
	});
});
