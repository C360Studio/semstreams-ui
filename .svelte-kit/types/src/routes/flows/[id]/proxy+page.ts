// @ts-nocheck
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

// Disable SSR for flow editor - @xyflow/svelte requires browser APIs
export const ssr = false;

export const load = async ({ params, fetch }: Parameters<PageLoad>[0]) => {
	const response = await fetch(`/flowbuilder/flows/${params.id}`);

	if (!response.ok) {
		throw error(response.status, `Flow not found: ${params.id}`);
	}

	const flow = await response.json();

	// Normalize flow data - ensure nodes and connections are arrays
	// Backend may return null or omit these fields for new flows
	const normalizedFlow = {
		...flow,
		nodes: flow.nodes || [],
		connections: flow.connections || []
	};

	return {
		flow: normalizedFlow
	};
};
