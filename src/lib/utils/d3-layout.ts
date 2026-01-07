/**
 * D3-based layout utilities for flow visualization
 *
 * Uses D3 force simulation for automatic node positioning,
 * with Svelte handling the actual DOM rendering.
 */

import * as d3 from "d3";
import type { FlowNode, FlowConnection } from "$lib/types/flow";

/** Node with computed layout position */
export interface LayoutNode {
  id: string;
  type: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  config: Record<string, unknown>;
  /** Original node data */
  original: FlowNode;
}

/** Edge with computed path data */
export interface LayoutEdge {
  id: string;
  sourceNodeId: string;
  sourcePort: string;
  targetNodeId: string;
  targetPort: string;
  /** Source position (output port) */
  sourceX: number;
  sourceY: number;
  /** Target position (input port) */
  targetX: number;
  targetY: number;
  /** Original connection data */
  original: FlowConnection;
}

/** Layout configuration */
export interface LayoutConfig {
  /** Node dimensions */
  nodeWidth: number;
  nodeHeight: number;
  /** Spacing between nodes */
  horizontalSpacing: number;
  verticalSpacing: number;
  /** Canvas padding */
  padding: number;
}

const DEFAULT_CONFIG: LayoutConfig = {
  nodeWidth: 200,
  nodeHeight: 80,
  horizontalSpacing: 100,
  verticalSpacing: 60,
  padding: 50,
};

/**
 * Calculate layout positions for flow nodes
 *
 * Uses a simple left-to-right hierarchical layout based on connections.
 * Nodes with no incoming connections are placed in the first column,
 * and subsequent nodes are placed based on their dependencies.
 */
export function layoutNodes(
  nodes: FlowNode[],
  connections: FlowConnection[],
  config: Partial<LayoutConfig> = {},
): LayoutNode[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  if (nodes.length === 0) {
    return [];
  }

  // Build adjacency info
  const incomingEdges = new Map<string, string[]>();
  const outgoingEdges = new Map<string, string[]>();

  for (const node of nodes) {
    incomingEdges.set(node.id, []);
    outgoingEdges.set(node.id, []);
  }

  for (const conn of connections) {
    const incoming = incomingEdges.get(conn.target_node_id);
    if (incoming) {
      incoming.push(conn.source_node_id);
    }
    const outgoing = outgoingEdges.get(conn.source_node_id);
    if (outgoing) {
      outgoing.push(conn.target_node_id);
    }
  }

  // Assign columns using topological sort
  const columns = new Map<string, number>();
  const visited = new Set<string>();

  function assignColumn(nodeId: string): number {
    if (columns.has(nodeId)) {
      return columns.get(nodeId)!;
    }

    if (visited.has(nodeId)) {
      // Cycle detected, assign to column 0
      return 0;
    }

    visited.add(nodeId);
    const incoming = incomingEdges.get(nodeId) || [];

    if (incoming.length === 0) {
      columns.set(nodeId, 0);
      return 0;
    }

    const maxParentCol = Math.max(...incoming.map((id) => assignColumn(id)));
    const col = maxParentCol + 1;
    columns.set(nodeId, col);
    return col;
  }

  for (const node of nodes) {
    assignColumn(node.id);
  }

  // Group nodes by column
  const columnGroups = new Map<number, FlowNode[]>();
  for (const node of nodes) {
    const col = columns.get(node.id) || 0;
    if (!columnGroups.has(col)) {
      columnGroups.set(col, []);
    }
    columnGroups.get(col)!.push(node);
  }

  // Calculate positions
  const layoutNodes: LayoutNode[] = [];

  for (const [col, colNodes] of columnGroups) {
    const x = cfg.padding + col * (cfg.nodeWidth + cfg.horizontalSpacing);

    colNodes.forEach((node, rowIndex) => {
      const y = cfg.padding + rowIndex * (cfg.nodeHeight + cfg.verticalSpacing);

      layoutNodes.push({
        id: node.id,
        type: node.type,
        name: node.name,
        x,
        y,
        width: cfg.nodeWidth,
        height: cfg.nodeHeight,
        config: node.config,
        original: node,
      });
    });
  }

  return layoutNodes;
}

/**
 * Calculate edge positions based on node layout
 */
export function layoutEdges(
  connections: FlowConnection[],
  layoutNodes: LayoutNode[],
): LayoutEdge[] {
  const nodeMap = new Map<string, LayoutNode>();
  for (const node of layoutNodes) {
    nodeMap.set(node.id, node);
  }

  return connections
    .map((conn) => {
      const sourceNode = nodeMap.get(conn.source_node_id);
      const targetNode = nodeMap.get(conn.target_node_id);

      if (!sourceNode || !targetNode) {
        return null;
      }

      // Source: right side of source node
      const sourceX = sourceNode.x + sourceNode.width;
      const sourceY = sourceNode.y + sourceNode.height / 2;

      // Target: left side of target node
      const targetX = targetNode.x;
      const targetY = targetNode.y + targetNode.height / 2;

      return {
        id: conn.id,
        sourceNodeId: conn.source_node_id,
        sourcePort: conn.source_port,
        targetNodeId: conn.target_node_id,
        targetPort: conn.target_port,
        sourceX,
        sourceY,
        targetX,
        targetY,
        original: conn,
      };
    })
    .filter((edge): edge is LayoutEdge => edge !== null);
}

/**
 * Calculate canvas dimensions to fit all nodes
 */
export function calculateCanvasBounds(
  layoutNodes: LayoutNode[],
  padding: number = 50,
): { width: number; height: number } {
  if (layoutNodes.length === 0) {
    return { width: 800, height: 600 };
  }

  let maxX = 0;
  let maxY = 0;

  for (const node of layoutNodes) {
    maxX = Math.max(maxX, node.x + node.width);
    maxY = Math.max(maxY, node.y + node.height);
  }

  return {
    width: maxX + padding,
    height: maxY + padding,
  };
}

/**
 * Create a D3 zoom behavior for the canvas
 *
 * Returns a zoom behavior that can be applied to an SVG element.
 * The transform is provided via callback for Svelte reactivity.
 */
export function createZoomBehavior(
  onTransform: (transform: d3.ZoomTransform) => void,
  options: {
    minZoom?: number;
    maxZoom?: number;
  } = {},
): d3.ZoomBehavior<SVGSVGElement, unknown> {
  const { minZoom = 0.1, maxZoom = 2 } = options;

  return d3
    .zoom<SVGSVGElement, unknown>()
    .scaleExtent([minZoom, maxZoom])
    .on("zoom", (event) => {
      onTransform(event.transform);
    });
}

/**
 * Apply zoom behavior to an SVG element
 */
export function applyZoom(
  svgElement: SVGSVGElement,
  zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown>,
): void {
  d3.select(svgElement).call(zoomBehavior);
}

/**
 * Reset zoom to fit content
 */
export function fitToContent(
  svgElement: SVGSVGElement,
  zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown>,
  bounds: { width: number; height: number },
  viewportWidth: number,
  viewportHeight: number,
  padding: number = 50,
): void {
  const scale = Math.min(
    (viewportWidth - padding * 2) / bounds.width,
    (viewportHeight - padding * 2) / bounds.height,
    1, // Don't zoom in beyond 100%
  );

  const translateX = (viewportWidth - bounds.width * scale) / 2;
  const translateY = (viewportHeight - bounds.height * scale) / 2;

  const transform = d3.zoomIdentity
    .translate(translateX, translateY)
    .scale(scale);
  const selection = d3.select(svgElement);

  // Check if we're in a test environment where transitions don't work
  // In jsdom, transition().duration is not a function
  const transition = selection.transition();
  if (typeof transition.duration === "function") {
    // Browser environment - use animated transition
    transition.duration(300).call(zoomBehavior.transform, transform);
  } else {
    // Test environment - apply transform directly without animation
    selection.call(zoomBehavior.transform, transform);
  }
}
