/**
 * Graph Layout Utilities for Knowledge Graph Visualization
 *
 * Re-exports hierarchical layout functions from d3-layout.ts
 * and provides graph-specific utilities.
 */

import type { GraphLayoutNode } from "$lib/types/graph";

// =============================================================================
// Re-export layout functions from d3-layout
// =============================================================================

export {
  // Graph layout functions
  layoutGraphEntities,
  layoutGraphEdges,
  calculateGraphBounds,
  type GraphLayoutConfig,
  // Zoom utilities
  createZoomBehavior,
  applyZoom,
  fitToContent,
} from "./d3-layout";

// =============================================================================
// Level of Detail
// =============================================================================

export type LevelOfDetail = "low" | "medium" | "high";

/**
 * Determine level of detail based on zoom scale.
 */
export function getLevelOfDetail(scale: number): LevelOfDetail {
  if (scale < 0.5) return "low";
  if (scale < 1.0) return "medium";
  return "high";
}

// =============================================================================
// Viewport Utilities
// =============================================================================

/**
 * Check if a node is within the visible viewport.
 */
export function isNodeVisible(
  node: GraphLayoutNode,
  viewport: {
    x: number;
    y: number;
    width: number;
    height: number;
    scale: number;
  },
  padding: number = 50,
): boolean {
  const screenX = (node.x - viewport.x) * viewport.scale;
  const screenY = (node.y - viewport.y) * viewport.scale;
  const screenRadius = node.radius * viewport.scale;

  return (
    screenX + screenRadius >= -padding &&
    screenX - screenRadius <= viewport.width + padding &&
    screenY + screenRadius >= -padding &&
    screenY - screenRadius <= viewport.height + padding
  );
}

/**
 * Filter nodes to only those visible in viewport.
 */
export function getVisibleNodes(
  nodes: GraphLayoutNode[],
  viewport: {
    x: number;
    y: number;
    width: number;
    height: number;
    scale: number;
  },
): GraphLayoutNode[] {
  return nodes.filter((node) => isNodeVisible(node, viewport));
}
