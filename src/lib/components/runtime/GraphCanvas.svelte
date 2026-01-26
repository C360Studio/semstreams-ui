<script lang="ts">
	/**
	 * GraphCanvas - D3-based knowledge graph visualization canvas
	 *
	 * Renders entity nodes and relationship edges using SVG with D3 for:
	 * - Hierarchical left-to-right layout (no force simulation)
	 * - Zoom and pan controls
	 * - Click-to-select and double-click-to-expand
	 */

	import { onMount } from 'svelte';
	import * as d3 from 'd3';
	import type { GraphEntity, GraphRelationship, GraphLayoutNode, GraphLayoutEdge } from '$lib/types/graph';
	import {
		layoutGraphEntities,
		layoutGraphEdges,
		calculateGraphBounds,
		getLevelOfDetail,
		createZoomBehavior,
		applyZoom,
		type LevelOfDetail
	} from '$lib/utils/graph-layout';

	import GraphNode from './GraphNode.svelte';
	import GraphEdge from './GraphEdge.svelte';

	interface GraphCanvasProps {
		entities: GraphEntity[];
		relationships: GraphRelationship[];
		selectedEntityId?: string | null;
		hoveredEntityId?: string | null;
		onEntitySelect?: (entityId: string | null) => void;
		onEntityExpand?: (entityId: string) => void;
		onEntityHover?: (entityId: string | null) => void;
	}

	let {
		entities,
		relationships,
		selectedEntityId = null,
		hoveredEntityId = null,
		onEntitySelect,
		onEntityExpand,
		onEntityHover
	}: GraphCanvasProps = $props();

	// DOM references
	let svgElement: SVGSVGElement;
	let containerElement: HTMLDivElement;

	// Zoom transform state
	let transform = $state({ x: 0, y: 0, k: 1 });
	let zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null;

	// Derived layout - computed from entities/relationships
	const layoutNodes = $derived<GraphLayoutNode[]>(layoutGraphEntities(entities));
	const layoutEdges = $derived<GraphLayoutEdge[]>(layoutGraphEdges(relationships, layoutNodes));
	const bounds = $derived(calculateGraphBounds(layoutNodes));
	const lod = $derived<LevelOfDetail>(getLevelOfDetail(transform.k));

	// Initialize zoom on mount
	onMount(() => {
		// Initialize zoom behavior
		zoomBehavior = createZoomBehavior((newTransform) => {
			transform = {
				x: newTransform.x,
				y: newTransform.y,
				k: newTransform.k
			};
		}, { minZoom: 0.1, maxZoom: 3 });

		applyZoom(svgElement, zoomBehavior);

		// Initial fit to content
		requestAnimationFrame(() => {
			handleFitToContent();
		});

		// Cleanup
		return () => {
			if (svgElement && zoomBehavior) {
				try {
					const selection = d3.select(svgElement);
					if (selection && typeof selection.on === 'function') {
						selection.on('.zoom', null);
					}
				} catch (error) {
					console.debug('D3 zoom cleanup skipped:', error);
				}
			}
		};
	});

	// Fit to content when entities change
	$effect(() => {
		if (entities.length > 0 && svgElement && containerElement && zoomBehavior) {
			// Debounce to avoid too many re-fits
			const timeout = setTimeout(() => {
				handleFitToContent();
			}, 100);
			return () => clearTimeout(timeout);
		}
	});

	function handleFitToContent() {
		if (!svgElement || !containerElement || !zoomBehavior) return;
		if (layoutNodes.length === 0) return;

		const rect = containerElement.getBoundingClientRect();
		const padding = 50;

		// Calculate scale to fit content
		const scale = Math.min(
			(rect.width - padding * 2) / bounds.width,
			(rect.height - padding * 2) / bounds.height,
			1.5
		);

		// Calculate translate to center content
		const translateX = rect.width / 2 - (bounds.minX + bounds.width / 2) * scale;
		const translateY = rect.height / 2 - (bounds.minY + bounds.height / 2) * scale;

		const newTransform = d3.zoomIdentity.translate(translateX, translateY).scale(scale);

		d3.select(svgElement)
			.transition()
			.duration(300)
			.call(zoomBehavior.transform, newTransform);
	}

	function handleZoomIn() {
		if (!svgElement || !zoomBehavior) return;
		d3.select(svgElement).transition().duration(200).call(zoomBehavior.scaleBy, 1.3);
	}

	function handleZoomOut() {
		if (!svgElement || !zoomBehavior) return;
		d3.select(svgElement).transition().duration(200).call(zoomBehavior.scaleBy, 0.7);
	}

	function handleNodeClick(nodeId: string) {
		onEntitySelect?.(nodeId === selectedEntityId ? null : nodeId);
	}

	function handleNodeDblClick(nodeId: string) {
		onEntityExpand?.(nodeId);
	}

	function handleNodeHover(nodeId: string | null) {
		onEntityHover?.(nodeId);
	}

	function handleCanvasClick() {
		onEntitySelect?.(null);
	}
</script>

<div class="graph-canvas-container" bind:this={containerElement}>
	<!-- Zoom Controls -->
	<div class="zoom-controls">
		<button onclick={handleZoomIn} aria-label="Zoom in" title="Zoom in">+</button>
		<button onclick={handleZoomOut} aria-label="Zoom out" title="Zoom out">-</button>
		<button onclick={handleFitToContent} aria-label="Fit to content" title="Fit to content">
			<span class="fit-icon">⊡</span>
		</button>
	</div>

	<!-- SVG Canvas -->
	<svg
		bind:this={svgElement}
		class="graph-canvas"
		onclick={handleCanvasClick}
		role="img"
		aria-label="Knowledge graph visualization"
	>
		<!-- Defs for markers -->
		<defs>
			<!-- Arrow marker for edges -->
			<marker
				id="graph-arrow"
				viewBox="0 0 10 10"
				refX="9"
				refY="5"
				markerWidth="6"
				markerHeight="6"
				orient="auto-start-reverse"
			>
				<path d="M 0 0 L 10 5 L 0 10 z" fill="var(--ui-border-strong)" />
			</marker>
		</defs>

		<!-- Background pattern -->
		<defs>
			<pattern id="graph-grid" width="20" height="20" patternUnits="userSpaceOnUse">
				<circle cx="10" cy="10" r="0.5" fill="var(--ui-border-subtle)" opacity="0.5" />
			</pattern>
		</defs>

		<!-- Main group with transform -->
		<g transform="translate({transform.x}, {transform.y}) scale({transform.k})">
			<!-- Background -->
			<rect
				x={bounds.minX - 1000}
				y={bounds.minY - 1000}
				width={bounds.width + 2000}
				height={bounds.height + 2000}
				fill="url(#graph-grid)"
				class="graph-background"
			/>

			<!-- Edges (rendered first, behind nodes) -->
			{#each layoutEdges as edge (edge.id)}
				<GraphEdge
					{edge}
					selected={selectedEntityId !== null &&
						(edge.relationship.sourceId === selectedEntityId ||
							edge.relationship.targetId === selectedEntityId)}
					highlighted={hoveredEntityId !== null &&
						(edge.relationship.sourceId === hoveredEntityId ||
							edge.relationship.targetId === hoveredEntityId)}
					{lod}
				/>
			{/each}

			<!-- Nodes -->
			{#each layoutNodes as node (node.id)}
				<GraphNode
					{node}
					selected={node.id === selectedEntityId}
					hovered={node.id === hoveredEntityId}
					{lod}
					onclick={handleNodeClick}
					ondblclick={handleNodeDblClick}
					onmouseenter={handleNodeHover}
					onmouseleave={() => handleNodeHover(null)}
				/>
			{/each}
		</g>
	</svg>

	<!-- Stats overlay -->
	<div class="graph-stats">
		<span>{entities.length} entities</span>
		<span>{relationships.length} relationships</span>
	</div>
</div>

<style>
	.graph-canvas-container {
		position: relative;
		width: 100%;
		height: 100%;
		overflow: hidden;
		background: var(--ui-surface-primary);
	}

	.graph-canvas {
		width: 100%;
		height: 100%;
		cursor: grab;
	}

	.graph-canvas:active {
		cursor: grabbing;
	}

	.graph-background {
		pointer-events: none;
	}

	/* Zoom Controls */
	.zoom-controls {
		position: absolute;
		top: 12px;
		right: 12px;
		display: flex;
		flex-direction: column;
		gap: 4px;
		z-index: 10;
	}

	.zoom-controls button {
		width: 32px;
		height: 32px;
		border: 1px solid var(--ui-border-subtle);
		border-radius: 6px;
		background: var(--ui-surface-primary);
		color: var(--ui-text-primary);
		font-size: 18px;
		font-weight: 500;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	.zoom-controls button:hover {
		background: var(--ui-surface-secondary);
		border-color: var(--ui-border-strong);
	}

	.zoom-controls button:active {
		transform: scale(0.95);
	}

	.fit-icon {
		font-size: 14px;
	}

	/* Stats overlay */
	.graph-stats {
		position: absolute;
		bottom: 12px;
		left: 12px;
		display: flex;
		gap: 12px;
		font-size: 11px;
		color: var(--ui-text-secondary);
		background: var(--ui-surface-primary);
		padding: 4px 8px;
		border-radius: 4px;
		border: 1px solid var(--ui-border-subtle);
	}
</style>
