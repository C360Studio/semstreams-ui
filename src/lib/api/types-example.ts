/**
 * Example usage of auto-generated API types
 *
 * This demonstrates how to use the types generated from your backend's OpenAPI spec
 *
 * Types are generated with: task generate-types
 * (Requires OPENAPI_SPEC_PATH to be set - see .env.example)
 */

import type { paths, components } from '$lib/types/api.generated';

// Extract specific response types using utility types
type ComponentType = components['schemas']['ComponentType'];
type ComponentTypesResponse = paths['/components/types']['get']['responses']['200']['content']['application/json'];
type ComponentTypeResponse = paths['/components/types/{id}']['get']['responses']['200']['content']['application/json'];

// Example: Type-safe API client for component types
export class ComponentTypesAPI {
	private baseURL: string;

	constructor(baseURL: string = 'http://localhost:8080') {
		this.baseURL = baseURL;
	}

	/**
	 * List all available component types
	 *
	 * Response type automatically inferred from OpenAPI spec
	 */
	async list(): Promise<ComponentTypesResponse> {
		const response = await fetch(`${this.baseURL}/components/types`);

		if (!response.ok) {
			throw new Error(`Failed to fetch component types: ${response.statusText}`);
		}

		return await response.json();
	}

	/**
	 * Get a specific component type by ID
	 *
	 * @param id - Component type ID (e.g., "udp", "graph-processor")
	 */
	async getById(id: string): Promise<ComponentTypeResponse> {
		const response = await fetch(`${this.baseURL}/components/types/${encodeURIComponent(id)}`);

		if (!response.ok) {
			if (response.status === 404) {
				throw new Error(`Component type not found: ${id}`);
			}
			throw new Error(`Failed to fetch component type: ${response.statusText}`);
		}

		return await response.json();
	}

	/**
	 * Filter component types by category
	 *
	 * TypeScript knows the exact shape of ComponentType
	 */
	async getByType(type: 'input' | 'processor' | 'output' | 'storage'): Promise<ComponentType[]> {
		const all = await this.list();
		return all.filter(comp => comp.type === type);
	}
}

// Example usage:
export async function exampleUsage() {
	const api = new ComponentTypesAPI();

	// All types are inferred from OpenAPI spec
	const allComponents = await api.list();
	console.log(`Found ${allComponents.length} component types`);

	// TypeScript knows the exact shape
	const inputComponents = allComponents.filter(c => c.type === 'input');
	inputComponents.forEach(comp => {
		// TypeScript autocomplete works here!
		console.log(`${comp.name} (${comp.protocol}) - ${comp.description}`);
	});

	// Type-safe parameter
	const udpComponent = await api.getById('udp');
	console.log(`UDP component version: ${udpComponent.version}`);

	// Component schemas are also typed
	if (udpComponent.schema) {
		// TypeScript knows this is one of the component config schemas
		// (udp.v1, websocket.v1, graph-processor.v1, etc.)
		console.log('Component has configuration schema');
	}
}

// Export types for use in components
export type { ComponentType, ComponentTypesResponse, ComponentTypeResponse };
