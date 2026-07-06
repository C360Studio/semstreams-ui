import type { GraphEntity } from "$lib/types/graph";

export interface OpsGraphOverview {
  entityCount: number;
  relationshipCount: number;
  filteredEntityCount: number;
  filteredRelationshipCount: number;
  activeFilterCount: number;
  selectedEntity: GraphEntity | null;
  loading: boolean;
  error: string | null;
  connected: boolean;
}
