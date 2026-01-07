/**
 * STUB: XYFlow converters - Temporary stub for migration to D3
 *
 * This file provides pass-through stub implementations to allow
 * the flow page to compile during the greenfield D3 refactor.
 *
 * TODO: Remove this file once the flow page is fully migrated to D3.
 */

import type { FlowNode, FlowConnection } from "$lib/types/flow";

// Stub types that alias the real types with XYFlow-like structure
export type XYFlowNode = FlowNode & {
  data: {
    node: FlowNode;
    input_ports?: any[];
    output_ports?: any[];
  };
};

export type XYFlowEdge = FlowConnection & {
  sourceNode?: string;
  targetNode?: string;
  data?: any;
};

/**
 * Convert FlowNodes to XYFlow format (stub - returns as-is with wrapper)
 */
export function convertFlowNodesToXYFlow(
  nodes: FlowNode[],
  _onNodeClick?: (nodeId: string) => void,
): XYFlowNode[] {
  return nodes.map((node) => ({
    ...node,
    data: {
      node,
      input_ports: [],
      output_ports: [],
    },
  }));
}

/**
 * Convert XYFlow nodes back to FlowNodes (stub - unwraps)
 */
export function convertXYFlowNodesToFlow(
  xyflowNodes: XYFlowNode[],
): FlowNode[] {
  return xyflowNodes.map((node) => node.data?.node || node);
}

/**
 * Convert FlowConnections to XYFlow format (stub - returns as-is)
 */
export function convertFlowConnectionsToXYFlow(
  connections: FlowConnection[],
): XYFlowEdge[] {
  return connections.map((conn) => ({
    ...conn,
    sourceNode: conn.source_node_id,
    targetNode: conn.target_node_id,
    data: {},
  }));
}

/**
 * Convert XYFlow edges back to FlowConnections (stub - returns as-is)
 */
export function convertXYFlowEdgesToFlow(
  xyflowEdges: XYFlowEdge[],
): FlowConnection[] {
  return xyflowEdges;
}

/**
 * Convert single FlowNode to XYFlow format (stub)
 */
export function convertToXYFlowNode(
  node: FlowNode,
  _onNodeClick?: (nodeId: string) => void,
): XYFlowNode {
  return {
    ...node,
    data: {
      node,
      input_ports: [],
      output_ports: [],
    },
  };
}

/**
 * Convert single FlowConnection to XYFlow format (stub)
 */
export function convertToXYFlowEdge(connection: FlowConnection): XYFlowEdge {
  return {
    ...connection,
    sourceNode: connection.source_node_id,
    targetNode: connection.target_node_id,
    data: {},
  };
}
