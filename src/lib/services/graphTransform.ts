// GraphQL data transformation
// Converts backend GraphQL responses to frontend graph structures

import type {
  GraphEntity,
  PathSearchResult,
  GraphRelationship,
  TripleProperty,
} from "$lib/types/graph";
import {
  parseEntityId,
  createRelationshipId,
  isEntityReference,
} from "$lib/types/graph";

/**
 * Transform backend PathSearchResult to array of GraphEntity.
 * Handles both triples (properties and relationships) and edges (bidirectional relationships).
 */
export function transformPathSearchResult(
  result: PathSearchResult,
): GraphEntity[] {
  // Create a map to build entities
  const entityMap = new Map<string, GraphEntity>();

  // Initialize entities from backend entities
  for (const backendEntity of result.entities) {
    const entity: GraphEntity = {
      id: backendEntity.id,
      idParts: parseEntityId(backendEntity.id),
      properties: [],
      outgoing: [],
      incoming: [],
    };
    entityMap.set(backendEntity.id, entity);
  }

  // Process triples to extract properties and relationships
  for (const backendEntity of result.entities) {
    const entity = entityMap.get(backendEntity.id);
    if (!entity) continue;

    for (const triple of backendEntity.triples) {
      if (isEntityReference(triple.object)) {
        // This is a relationship (object is an entity ID)
        const relationship: GraphRelationship = {
          id: createRelationshipId(
            triple.subject,
            triple.predicate,
            triple.object,
          ),
          sourceId: triple.subject,
          targetId: triple.object,
          predicate: triple.predicate,
          confidence: 1.0, // Default confidence
          timestamp: Date.now(), // Default timestamp
        };
        entity.outgoing.push(relationship);
      } else {
        // This is a property (object is a literal value)
        const property: TripleProperty = {
          predicate: triple.predicate,
          object: triple.object,
          confidence: 1.0, // Default confidence
          source: "unknown", // Default source
          timestamp: Date.now(), // Default timestamp
        };
        entity.properties.push(property);
      }
    }
  }

  // Process edges to create bidirectional relationships
  for (const edge of result.edges) {
    const sourceEntity = entityMap.get(edge.subject);
    const targetEntity = entityMap.get(edge.object);

    const relationship: GraphRelationship = {
      id: createRelationshipId(edge.subject, edge.predicate, edge.object),
      sourceId: edge.subject,
      targetId: edge.object,
      predicate: edge.predicate,
      confidence: 1.0, // Default confidence
      timestamp: Date.now(), // Default timestamp
    };

    // Add outgoing relationship to source entity
    if (sourceEntity) {
      sourceEntity.outgoing.push(relationship);
    }

    // Add incoming relationship to target entity
    if (targetEntity) {
      targetEntity.incoming.push(relationship);
    }
  }

  // Convert map to array
  return Array.from(entityMap.values());
}
