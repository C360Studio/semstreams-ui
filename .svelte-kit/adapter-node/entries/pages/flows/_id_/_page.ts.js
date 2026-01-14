import { error } from "@sveltejs/kit";
const ssr = false;
const load = async ({ params, fetch }) => {
  const response = await fetch(`/flowbuilder/flows/${params.id}`);
  if (!response.ok) {
    throw error(response.status, `Flow not found: ${params.id}`);
  }
  const flow = await response.json();
  const normalizedFlow = {
    ...flow,
    nodes: flow.nodes || [],
    connections: flow.connections || []
  };
  return {
    flow: normalizedFlow
  };
};
export {
  load,
  ssr
};
