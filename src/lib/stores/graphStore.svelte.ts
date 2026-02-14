/**
 * Knowledge Graph Store
 *
 * Manages state for the graph visualization tab.
 * Handles entities, relationships, communities, selection, and filters.
 *
 * Note: This store uses the traditional svelte/store pattern with writable(),
 * which manages reactivity through subscribe/update. Native Map/Set/Date are
 * intentionally used here as the store's update() function triggers reactivity.
 */
/* eslint-disable svelte/prefer-svelte-reactivity */

import * as store from "svelte/store";
import {
  type GraphEntity,
  type GraphRelationship,
  type GraphCommunity,
  type GraphFilters,
  type GraphStoreState,
  type TripleProperty,
  DEFAULT_GRAPH_FILTERS,
  parseEntityId,
  createRelationshipId,
} from "$lib/types/graph";

// =============================================================================
// Store Implementation
// =============================================================================

function createGraphStore() {
  const initialState: GraphStoreState = {
    entities: new Map(),
    relationships: new Map(),
    communities: new Map(),
    selectedEntityId: null,
    hoveredEntityId: null,
    expandedEntityIds: new Set(),
    filters: { ...DEFAULT_GRAPH_FILTERS },
    loading: false,
    error: null,
    connected: false,
  };

  const { subscribe, update, set } =
    store.writable<GraphStoreState>(initialState);

  return {
    subscribe,

    // ========================================================================
    // Connection State
    // ========================================================================

    setConnected(connected: boolean) {
      update((state) => ({
        ...state,
        connected,
        error: connected ? null : state.error,
      }));
    },

    setLoading(loading: boolean) {
      update((state) => ({
        ...state,
        loading,
      }));
    },

    setError(error: string | null) {
      update((state) => ({
        ...state,
        error,
        loading: false,
      }));
    },

    // ========================================================================
    // Entity Management
    // ========================================================================

    /**
     * Add or update a single entity.
     */
    upsertEntity(entity: GraphEntity) {
      update((state) => {
        const newEntities = new Map(state.entities);
        newEntities.set(entity.id, entity);

        // Also add any relationships
        const newRelationships = new Map(state.relationships);
        for (const rel of entity.outgoing) {
          newRelationships.set(rel.id, rel);
        }
        for (const rel of entity.incoming) {
          newRelationships.set(rel.id, rel);
        }

        return {
          ...state,
          entities: newEntities,
          relationships: newRelationships,
        };
      });
    },

    /**
     * Add or update multiple entities at once.
     */
    upsertEntities(entities: GraphEntity[]) {
      update((state) => {
        const newEntities = new Map(state.entities);
        const newRelationships = new Map(state.relationships);

        for (const entity of entities) {
          newEntities.set(entity.id, entity);

          for (const rel of entity.outgoing) {
            newRelationships.set(rel.id, rel);
          }
          for (const rel of entity.incoming) {
            newRelationships.set(rel.id, rel);
          }
        }

        return {
          ...state,
          entities: newEntities,
          relationships: newRelationships,
        };
      });
    },

    /**
     * Remove an entity and its relationships.
     */
    removeEntity(entityId: string) {
      update((state) => {
        const newEntities = new Map(state.entities);
        newEntities.delete(entityId);

        // Remove relationships involving this entity
        const newRelationships = new Map(state.relationships);
        for (const [relId, rel] of newRelationships) {
          if (rel.sourceId === entityId || rel.targetId === entityId) {
            newRelationships.delete(relId);
          }
        }

        // Clear selection if this entity was selected
        const selectedEntityId =
          state.selectedEntityId === entityId ? null : state.selectedEntityId;

        return {
          ...state,
          entities: newEntities,
          relationships: newRelationships,
          selectedEntityId,
        };
      });
    },

    /**
     * Clear all entities and relationships.
     */
    clearEntities() {
      update((state) => ({
        ...state,
        entities: new Map(),
        relationships: new Map(),
        selectedEntityId: null,
        hoveredEntityId: null,
        expandedEntityIds: new Set(),
      }));
    },

    // ========================================================================
    // Community Management
    // ========================================================================

    /**
     * Update communities data.
     */
    updateCommunities(communities: GraphCommunity[]) {
      update((state) => {
        const newCommunities = new Map<string, GraphCommunity>();
        for (const community of communities) {
          newCommunities.set(community.id, community);
        }
        return {
          ...state,
          communities: newCommunities,
        };
      });
    },

    // ========================================================================
    // Selection State
    // ========================================================================

    /**
     * Select an entity.
     */
    selectEntity(entityId: string | null) {
      update((state) => ({
        ...state,
        selectedEntityId: entityId,
      }));
    },

    /**
     * Set hovered entity (for highlighting).
     */
    setHoveredEntity(entityId: string | null) {
      update((state) => ({
        ...state,
        hoveredEntityId: entityId,
      }));
    },

    /**
     * Mark an entity as expanded (neighbors loaded).
     */
    markExpanded(entityId: string) {
      update((state) => {
        const newExpandedIds = new Set(state.expandedEntityIds);
        newExpandedIds.add(entityId);
        return {
          ...state,
          expandedEntityIds: newExpandedIds,
        };
      });
    },

    /**
     * Check if an entity has been expanded.
     */
    isExpanded(state: GraphStoreState, entityId: string): boolean {
      return state.expandedEntityIds.has(entityId);
    },

    // ========================================================================
    // Filters
    // ========================================================================

    /**
     * Update filters.
     */
    setFilters(filters: Partial<GraphFilters>) {
      update((state) => ({
        ...state,
        filters: {
          ...state.filters,
          ...filters,
        },
      }));
    },

    /**
     * Reset filters to defaults.
     */
    resetFilters() {
      update((state) => ({
        ...state,
        filters: { ...DEFAULT_GRAPH_FILTERS },
      }));
    },

    // ========================================================================
    // Derived Data Helpers
    // ========================================================================

    /**
     * Get filtered entities based on current filters.
     */
    getFilteredEntities(state: GraphStoreState): GraphEntity[] {
      const { filters, entities } = state;
      let result = Array.from(entities.values());

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        result = result.filter(
          (e) =>
            e.id.toLowerCase().includes(searchLower) ||
            e.idParts.instance.toLowerCase().includes(searchLower) ||
            e.idParts.type.toLowerCase().includes(searchLower),
        );
      }

      // Type filter
      if (filters.types.length > 0) {
        result = result.filter((e) => filters.types.includes(e.idParts.type));
      }

      // Domain filter
      if (filters.domains.length > 0) {
        result = result.filter((e) =>
          filters.domains.includes(e.idParts.domain),
        );
      }

      // Time range filter
      if (filters.timeRange) {
        const [start, end] = filters.timeRange;
        result = result.filter((e) => {
          // Check if any property falls within time range
          return e.properties.some(
            (p) => p.timestamp >= start && p.timestamp <= end,
          );
        });
      }

      return result;
    },

    /**
     * Get filtered relationships based on current filters.
     */
    getFilteredRelationships(state: GraphStoreState): GraphRelationship[] {
      const { filters, relationships } = state;
      const visibleEntityIds = new Set(
        this.getFilteredEntities(state).map((e) => e.id),
      );

      let result = Array.from(relationships.values());

      // Only show relationships between visible entities
      result = result.filter(
        (r) =>
          visibleEntityIds.has(r.sourceId) && visibleEntityIds.has(r.targetId),
      );

      // Confidence filter
      if (filters.minConfidence > 0) {
        result = result.filter((r) => r.confidence >= filters.minConfidence);
      }

      // Time range filter
      if (filters.timeRange) {
        const [start, end] = filters.timeRange;
        result = result.filter(
          (r) => r.timestamp >= start && r.timestamp <= end,
        );
      }

      return result;
    },

    /**
     * Get unique entity types from current data.
     */
    getEntityTypes(state: GraphStoreState): string[] {
      const types = new Set<string>();
      for (const entity of state.entities.values()) {
        types.add(entity.idParts.type);
      }
      return Array.from(types).sort();
    },

    /**
     * Get unique domains from current data.
     */
    getDomains(state: GraphStoreState): string[] {
      const domains = new Set<string>();
      for (const entity of state.entities.values()) {
        domains.add(entity.idParts.domain);
      }
      return Array.from(domains).sort();
    },

    // ========================================================================
    // Reset
    // ========================================================================

    /**
     * Reset store to initial state.
     */
    reset() {
      set({
        entities: new Map(),
        relationships: new Map(),
        communities: new Map(),
        selectedEntityId: null,
        hoveredEntityId: null,
        expandedEntityIds: new Set(),
        filters: { ...DEFAULT_GRAPH_FILTERS },
        loading: false,
        error: null,
        connected: false,
      });
    },
  };
}

// =============================================================================
// Entity Builder Helpers
// =============================================================================

/**
 * Build a GraphEntity from API response data.
 */
export function buildGraphEntity(data: {
  id: string;
  properties?: Array<{
    predicate: string;
    object: unknown;
    confidence: number;
    source?: string;
    timestamp: string | number;
  }>;
  outgoing?: Array<{
    predicate: string;
    targetId: string;
    confidence: number;
    timestamp?: string | number;
  }>;
  incoming?: Array<{
    predicate: string;
    sourceId: string;
    confidence: number;
    timestamp?: string | number;
  }>;
  community?: {
    id: string;
    label?: string;
    memberCount?: number;
  };
}): GraphEntity {
  const idParts = parseEntityId(data.id);

  const properties: TripleProperty[] = (data.properties || []).map((p) => ({
    predicate: p.predicate,
    object: p.object,
    confidence: p.confidence,
    source: p.source || "unknown",
    timestamp:
      typeof p.timestamp === "string"
        ? new Date(p.timestamp).getTime()
        : p.timestamp,
  }));

  const outgoing: GraphRelationship[] = (data.outgoing || []).map((r) => ({
    id: createRelationshipId(data.id, r.predicate, r.targetId),
    sourceId: data.id,
    targetId: r.targetId,
    predicate: r.predicate,
    confidence: r.confidence,
    timestamp: r.timestamp
      ? typeof r.timestamp === "string"
        ? new Date(r.timestamp).getTime()
        : r.timestamp
      : Date.now(),
  }));

  const incoming: GraphRelationship[] = (data.incoming || []).map((r) => ({
    id: createRelationshipId(r.sourceId, r.predicate, data.id),
    sourceId: r.sourceId,
    targetId: data.id,
    predicate: r.predicate,
    confidence: r.confidence,
    timestamp: r.timestamp
      ? typeof r.timestamp === "string"
        ? new Date(r.timestamp).getTime()
        : r.timestamp
      : Date.now(),
  }));

  const community: GraphCommunity | undefined = data.community
    ? {
        id: data.community.id,
        label: data.community.label,
        memberCount: data.community.memberCount || 0,
        color: "", // Will be assigned by visualization
      }
    : undefined;

  return {
    id: data.id,
    idParts,
    properties,
    outgoing,
    incoming,
    community,
  };
}

// =============================================================================
// Export Singleton
// =============================================================================

export const graphStore = createGraphStore();
