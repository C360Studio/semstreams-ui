/**
 * Conversion utilities between domain models (FlowNode/FlowConnection)
 * and XYFlow's view models (Node/Edge)
 *
 * These conversions happen at boundaries only (load/save),
 * not continuously during rendering.
 */

import type { Node, Edge } from '@xyflow/svelte';
import type { FlowNode, FlowConnection, ConnectionSource, ConnectionVisualState } from '$lib/types/flow';
import type { ValidationState, ValidationResult, ValidatedPort } from '$lib/types/port';
import { CONNECTION_PATTERNS, SEMANTIC_COLORS } from '$lib/theme/colors';

/**
 * Custom data attached to XYFlow nodes
 * This extends XYFlow's Node.data with our domain-specific information
 */
export interface XYFlowNodeData extends Record<string, unknown> {
	/** Display label for the node */
	label: string;
	/** Original FlowNode (for config panel, etc.) */
	node: FlowNode;
	/** Callback when node is clicked */
	onNodeClick?: (nodeId: string) => void;
	/** Input ports from validation (updated dynamically) */
	input_ports?: ValidatedPort[];
	/** Output ports from validation (updated dynamically) */
	output_ports?: ValidatedPort[];
}

/**
 * XYFlow Node with typed data
 * Re-export for convenience
 */
export type XYFlowNode = Node<XYFlowNodeData>;

/**
 * Custom data attached to XYFlow edges
 */
export interface XYFlowEdgeData extends Record<string, unknown> {
	/** Connection source (auto-discovered or manual) */
	source?: ConnectionSource;
	/** Validation state for styling */
	validationState?: ValidationState;
	/** Source node ID for debugging */
	sourceNodeId?: string;
	/** Source port name */
	sourcePort?: string;
	/** Target node ID for debugging */
	targetNodeId?: string;
	/** Target port name */
	targetPort?: string;
}

/**
 * XYFlow Edge with typed data
 */
export type XYFlowEdge = Edge<XYFlowEdgeData>;

/**
 * Convert domain FlowNode to XYFlow Node
 *
 * @param flowNode - Domain model from backend
 * @param onNodeClick - Optional click handler
 * @returns XYFlow Node for rendering
 */
export function convertToXYFlowNode(
	flowNode: FlowNode,
	onNodeClick?: (nodeId: string) => void
): XYFlowNode {
	return {
		id: flowNode.id,
		type: 'custom', // Our custom node component
		position: flowNode.position,
		data: {
			label: flowNode.name || flowNode.type,
			node: flowNode,
			onNodeClick
		},
		// XYFlow properties for interactivity
		selectable: true,
		focusable: true,
		draggable: true,
		connectable: true
	};
}

/**
 * Convert XYFlow Node back to domain FlowNode
 *
 * @param xyflowNode - XYFlow Node from canvas
 * @returns Domain FlowNode for backend persistence
 */
export function convertToFlowNode(xyflowNode: XYFlowNode): FlowNode {
	return {
		id: xyflowNode.id,
		type: xyflowNode.data.node.type,
		name: xyflowNode.data.label,
		position: xyflowNode.position,
		config: xyflowNode.data.node.config
	};
}

/**
 * Convert domain FlowConnection to XYFlow Edge
 *
 * @param connection - Domain model from backend
 * @returns XYFlow Edge for rendering with styling
 */
export function convertToXYFlowEdge(connection: FlowConnection): XYFlowEdge {
	// Determine styling based on connection source and validation state
	const style: Record<string, string | number> = {};

	// Apply dashed line for auto-discovered connections
	if (connection.source === 'auto') {
		style.strokeDasharray = '5, 5';
	}

	// Apply validation state colors
	if (connection.validationState) {
		switch (connection.validationState) {
			case 'error':
				style.stroke = '#dc3545'; // Red
				style.strokeWidth = 3;
				break;
			case 'warning':
				style.stroke = '#ffc107'; // Yellow
				style.strokeWidth = 2;
				break;
			case 'valid':
				style.stroke = '#0066cc'; // Blue
				break;
			// 'unknown' state uses default styling
		}
	}

	// CRITICAL DEBUG: Remove edge type entirely to see if XYFlow renders defaults
	// const edgeType = connection.source === 'auto' ? 'auto' : connection.source === 'manual' ? 'manual' : 'default';

	// Convert style object to CSS string for XYFlow
	const styleString = Object.keys(style).length > 0
		? Object.entries(style).map(([key, value]) => `${key}: ${value}`).join('; ')
		: undefined;

	return {
		id: connection.id,
		source: connection.source_node_id,
		target: connection.target_node_id,
		sourceHandle: connection.source_port,
		targetHandle: connection.target_port,
		// type: edgeType,  // Omit to use XYFlow default
		data: {
			source: connection.source,
			validationState: connection.validationState,
			sourceNodeId: connection.source_node_id,
			sourcePort: connection.source_port,
			targetNodeId: connection.target_node_id,
			targetPort: connection.target_port
		},
		style: styleString
	};
}

/**
 * Convert XYFlow Edge back to domain FlowConnection
 *
 * @param edge - XYFlow Edge from canvas
 * @returns Domain FlowConnection for backend persistence
 */
export function convertToFlowConnection(edge: XYFlowEdge): FlowConnection {
	return {
		id: edge.id,
		source_node_id: edge.source,
		target_node_id: edge.target,
		source_port: edge.sourceHandle || '',
		target_port: edge.targetHandle || ''
	};
}

/**
 * Batch convert array of FlowNodes to XYFlow Nodes
 *
 * @param flowNodes - Array of domain nodes
 * @param onNodeClick - Optional click handler for all nodes
 * @returns Array of XYFlow Nodes
 */
export function convertFlowNodesToXYFlow(
	flowNodes: FlowNode[],
	onNodeClick?: (nodeId: string) => void
): XYFlowNode[] {
	return flowNodes.map((node) => convertToXYFlowNode(node, onNodeClick));
}

/**
 * Batch convert array of XYFlow Nodes to FlowNodes
 *
 * @param xyflowNodes - Array of XYFlow nodes
 * @returns Array of domain FlowNodes
 */
export function convertXYFlowNodesToFlow(xyflowNodes: XYFlowNode[]): FlowNode[] {
	return xyflowNodes.map(convertToFlowNode);
}

/**
 * Batch convert array of FlowConnections to XYFlow Edges
 *
 * @param connections - Array of domain connections
 * @returns Array of XYFlow Edges
 */
export function convertFlowConnectionsToXYFlow(connections: FlowConnection[]): XYFlowEdge[] {
	return connections.map(convertToXYFlowEdge);
}

/**
 * Batch convert array of XYFlow Edges to FlowConnections
 *
 * @param edges - Array of XYFlow edges
 * @returns Array of domain FlowConnections
 */
export function convertXYFlowEdgesToFlow(edges: XYFlowEdge[]): FlowConnection[] {
	return edges.map(convertToFlowConnection);
}

// ============================================================================
// Phase 3: Connection Visual States (Spec 014)
// ============================================================================

/**
 * Convert pattern type to SVG stroke-dasharray value
 *
 * Maps NATS pattern types to line styling:
 * - stream: Solid line (continuous data flow)
 * - request: Dashed line (request/reply pattern)
 * - watch: Dotted line (periodic updates)
 *
 * @param patternType - NATS pattern type
 * @returns SVG stroke-dasharray value
 */
export function patternToStrokeDasharray(patternType: 'stream' | 'request' | 'watch'): string {
	return CONNECTION_PATTERNS[patternType];
}

/**
 * Compute visual state for a connection edge
 *
 * Determines line pattern, color, validation state, and z-index based on:
 * - Pattern type (stream/request/watch) for line styling
 * - Validation result for color and error indicators
 *
 * Used to style XYFlow edges with pattern-specific and validation-aware styling.
 *
 * @param edge - XYFlow edge with pattern type in data
 * @param validationResult - Validation result from backend
 * @returns ConnectionVisualState for rendering
 */
export function computeConnectionVisualState(
	edge: { id: string; source: string; target: string; data?: { patternType?: 'stream' | 'request' | 'watch' } },
	validationResult: ValidationResult
): ConnectionVisualState {
	// Determine pattern type (default to stream if not specified)
	const patternType = edge.data?.patternType || 'stream';

	// Map pattern type to line pattern
	const linePattern = patternType === 'stream' ? 'solid'
		: patternType === 'request' ? 'dashed'
		: 'dotted';

	// Determine validation state from result
	const validationState = validationResult.validation_status === 'errors' ? 'error'
		: validationResult.validation_status === 'warnings' ? 'warning'
		: 'valid';

	// Determine color based on validation state
	const color = validationState === 'error' ? SEMANTIC_COLORS.error
		: validationState === 'warning' ? SEMANTIC_COLORS.warning
		: 'inherit';

	// Z-index: errors on top, then warnings, then valid
	const zIndex = validationState === 'error' ? 100
		: validationState === 'warning' ? 50
		: 1;

	return {
		connectionId: edge.id,
		linePattern,
		color,
		validationState,
		strokeDasharray: patternToStrokeDasharray(patternType),
		zIndex,
		errorIcon: validationState === 'error' ? 'exclamation-circle' : undefined,
		tooltipContent: undefined
	};
}
