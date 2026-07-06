import type { Flow } from "$lib/types/flow";

export type OpsAvailability =
  | "healthy"
  | "degraded"
  | "unavailable"
  | "unknown";
export type OpsGraphStatus =
  | "loading"
  | "available"
  | "unavailable"
  | "unknown";

export interface OpsEndpointSummary {
  status: OpsAvailability;
  message: string;
  statusCode?: number;
}

export interface OpsGraphSummary {
  status: OpsGraphStatus;
  message: string;
  entityCount?: number;
  statusCode?: number;
}

export interface OpsRuntimeEndpointSummary {
  status: OpsAvailability;
  message: string;
  statusCode?: number;
  count?: number;
}

export type OpsSummaryFlow = Pick<Flow, "id" | "name" | "runtime_state">;

export interface OpsRuntimeSummary {
  status: OpsAvailability;
  message: string;
  flowCount: number;
  flowList: OpsRuntimeEndpointSummary;
  activeFlow: OpsSummaryFlow | null;
  health: OpsRuntimeEndpointSummary;
  metrics: OpsRuntimeEndpointSummary;
  messages: OpsRuntimeEndpointSummary;
}

export interface OpsTrajectoryItem {
  loopId: string;
  taskId: string;
  role: string;
  outcome: string;
  workflowSlug?: string;
  startTime: string;
  durationMs: number;
  iterations: number;
}

export interface OpsTrajectorySummary {
  status: OpsAvailability;
  message: string;
  total: number;
  items: OpsTrajectoryItem[];
  statusCode?: number;
}

export interface OpsSourceSummary {
  status: OpsAvailability;
  message: string;
  basis: "generic-read-path";
}

export interface OpsSummary {
  generatedAt: string;
  health: OpsEndpointSummary;
  graph: OpsGraphSummary;
  runtime: OpsRuntimeSummary;
  trajectories: OpsTrajectorySummary;
  source: OpsSourceSummary;
}

type Fetcher = typeof fetch;
type FetchInit = Parameters<Fetcher>[1];

interface JsonResult {
  ok: boolean;
  status: number;
  statusText: string;
  data: unknown;
  message?: string;
}

interface BackendFlowList {
  flows?: OpsSummaryFlow[];
}

interface RuntimeHealthResponse {
  summary?: {
    running?: number;
    degraded?: number;
    error?: number;
  };
  components?: unknown[];
}

interface RuntimeMetricsResponse {
  components?: unknown[];
}

interface RuntimeMessagesResponse {
  messages?: unknown[];
  total?: number;
}

interface GraphQLPingResponse {
  data?: {
    entitiesByPrefix?: unknown[];
  };
  errors?: Array<{ message?: string }>;
}

interface TrajectoryListItemResponse {
  duration?: number;
  iterations?: number;
  loop_id?: string;
  outcome?: string;
  role?: string;
  start_time?: string;
  task_id?: string;
  workflow_slug?: string;
}

interface TrajectoryListResponse {
  total?: number;
  trajectories?: TrajectoryListItemResponse[];
}

export interface FetchOpsSummaryOptions {
  fetcher?: Fetcher;
  activeFlowId?: string;
}

const GRAPHQL_PING_QUERY = `
  query OpsSummaryEntityPing($prefix: String!, $limit: Int!) {
    entitiesByPrefix(prefix: $prefix, limit: $limit) {
      id
    }
  }
`;

export const opsSummaryApi = {
  async fetchSummary(
    options: FetchOpsSummaryOptions = {},
  ): Promise<OpsSummary> {
    const fetcher = options.fetcher ?? fetch;

    const [health, flowList, graph, trajectories] = await Promise.all([
      fetchHealth(fetcher),
      fetchFlowList(fetcher),
      fetchGraphSummary(fetcher),
      fetchTrajectorySummary(fetcher),
    ]);

    const flows = flowList.flows;
    const activeFlow = selectActiveFlow(flows, options.activeFlowId);
    const runtime = await fetchRuntimeSummary(fetcher, flowList, activeFlow);

    return {
      generatedAt: new Date().toISOString(),
      health,
      graph,
      runtime,
      trajectories,
      source: deriveSourceSummary(health, graph, runtime),
    };
  },
};

async function fetchHealth(fetcher: Fetcher): Promise<OpsEndpointSummary> {
  const result = await fetchJson(fetcher, "/health", { cache: "no-store" });

  if (!result.ok) {
    return {
      status: "unavailable",
      message: result.message ?? `Health check failed: ${result.statusText}`,
      statusCode: result.status,
    };
  }

  return {
    status: "healthy",
    message: "Backend health endpoint is reachable",
    statusCode: result.status,
  };
}

async function fetchFlowList(fetcher: Fetcher): Promise<{
  status: OpsAvailability;
  flows: OpsSummaryFlow[];
  message: string;
  statusCode?: number;
}> {
  const result = await fetchJson(fetcher, "/flowbuilder/flows");

  if (!result.ok) {
    return {
      status: "unavailable",
      flows: [],
      message: result.message ?? `Flow list failed: ${result.statusText}`,
      statusCode: result.status,
    };
  }

  const data = result.data as BackendFlowList;
  const flows = Array.isArray(data?.flows) ? data.flows : [];

  return {
    status: "healthy",
    flows,
    message: flows.length > 0 ? "Flows discovered" : "No flows discovered",
    statusCode: result.status,
  };
}

async function fetchGraphSummary(fetcher: Fetcher): Promise<OpsGraphSummary> {
  const result = await fetchJson(fetcher, "/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: GRAPHQL_PING_QUERY,
      variables: {
        prefix: "",
        limit: 1,
      },
    }),
  });

  if (!result.ok) {
    return {
      status: "unavailable",
      message: result.message ?? `Graph query failed: ${result.statusText}`,
      statusCode: result.status,
    };
  }

  const payload = result.data as GraphQLPingResponse;
  if (payload.errors && payload.errors.length > 0) {
    return {
      status: "unavailable",
      message: payload.errors[0]?.message ?? "Graph query returned errors",
      statusCode: result.status,
    };
  }

  const entities = payload.data?.entitiesByPrefix;
  if (!Array.isArray(entities)) {
    return {
      status: "unavailable",
      message: "Graph query response did not include entities",
      statusCode: result.status,
    };
  }

  return {
    status: "available",
    message: "Graph endpoint is reachable",
    entityCount: entities.length,
    statusCode: result.status,
  };
}

async function fetchRuntimeSummary(
  fetcher: Fetcher,
  flowList: {
    status: OpsAvailability;
    flows: OpsSummaryFlow[];
    message: string;
    statusCode?: number;
  },
  activeFlow: OpsSummaryFlow | null,
): Promise<OpsRuntimeSummary> {
  const flowListEndpoint: OpsRuntimeEndpointSummary = {
    status: flowList.status,
    message: flowList.message,
    statusCode: flowList.statusCode,
    count: flowList.flows.length,
  };
  const flowCount = flowList.flows.length;

  if (!activeFlow) {
    const emptyEndpoint = {
      status: "unknown" as const,
      message: "No active flow selected",
    };
    const flowListUnavailable = flowList.status === "unavailable";

    return {
      status: flowCount > 0 ? "unknown" : "unavailable",
      message:
        flowCount > 0
          ? "No active flow selected"
          : flowListUnavailable
            ? flowList.message
            : "No flows available",
      flowCount,
      flowList: flowListEndpoint,
      activeFlow: null,
      health: emptyEndpoint,
      metrics: emptyEndpoint,
      messages: emptyEndpoint,
    };
  }

  const encodedFlowId = encodeURIComponent(activeFlow.id);
  const [health, metrics, messages] = await Promise.all([
    fetchRuntimeHealth(fetcher, encodedFlowId),
    fetchRuntimeMetrics(fetcher, encodedFlowId),
    fetchRuntimeMessages(fetcher, encodedFlowId),
  ]);

  return {
    status: deriveRuntimeStatus(activeFlow, health, metrics, messages),
    message: runtimeMessage(activeFlow, health, metrics, messages),
    flowCount,
    flowList: flowListEndpoint,
    activeFlow,
    health,
    metrics,
    messages,
  };
}

async function fetchTrajectorySummary(
  fetcher: Fetcher,
): Promise<OpsTrajectorySummary> {
  const result = await fetchJson(fetcher, "/trajectories?limit=5", {
    cache: "no-store",
  });

  if (!result.ok) {
    return {
      status: "unavailable",
      message: result.message ?? `Trajectories failed: ${result.statusText}`,
      total: 0,
      items: [],
      statusCode: result.status,
    };
  }

  const payload = result.data as TrajectoryListResponse;
  const items = Array.isArray(payload.trajectories)
    ? payload.trajectories.map(normalizeTrajectoryItem)
    : [];
  const total =
    typeof payload.total === "number" ? payload.total : items.length;

  return {
    status: "healthy",
    message:
      total > 0
        ? "Trajectory summaries are available"
        : "Trajectory endpoint is reachable",
    total,
    items,
    statusCode: result.status,
  };
}

function normalizeTrajectoryItem(
  item: TrajectoryListItemResponse,
): OpsTrajectoryItem {
  return {
    loopId: item.loop_id ?? "unknown-loop",
    taskId: item.task_id ?? "unknown-task",
    role: item.role ?? "unknown-role",
    outcome: item.outcome ?? "unknown",
    workflowSlug: item.workflow_slug,
    startTime: item.start_time ?? "",
    durationMs: item.duration ?? 0,
    iterations: item.iterations ?? 0,
  };
}

async function fetchRuntimeHealth(
  fetcher: Fetcher,
  encodedFlowId: string,
): Promise<OpsRuntimeEndpointSummary> {
  const result = await fetchJson(
    fetcher,
    `/flowbuilder/flows/${encodedFlowId}/runtime/health`,
  );

  if (!result.ok) {
    return unavailableRuntimeEndpoint("Runtime health", result);
  }

  const payload = result.data as RuntimeHealthResponse;
  const summary = payload.summary;
  const errorCount = summary?.error ?? 0;
  const degradedCount = summary?.degraded ?? 0;
  const runningCount = summary?.running ?? 0;

  return {
    status:
      errorCount > 0 ? "degraded" : degradedCount > 0 ? "degraded" : "healthy",
    message:
      errorCount > 0
        ? `${errorCount} runtime components have errors`
        : degradedCount > 0
          ? `${degradedCount} runtime components are degraded`
          : "Runtime health endpoint is reachable",
    statusCode: result.status,
    count: Array.isArray(payload.components)
      ? payload.components.length
      : runningCount + degradedCount + errorCount,
  };
}

async function fetchRuntimeMetrics(
  fetcher: Fetcher,
  encodedFlowId: string,
): Promise<OpsRuntimeEndpointSummary> {
  const result = await fetchJson(
    fetcher,
    `/flowbuilder/flows/${encodedFlowId}/runtime/metrics`,
  );

  if (!result.ok) {
    return unavailableRuntimeEndpoint("Runtime metrics", result);
  }

  const payload = result.data as RuntimeMetricsResponse;
  return {
    status: "healthy",
    message: "Runtime metrics endpoint is reachable",
    statusCode: result.status,
    count: Array.isArray(payload.components) ? payload.components.length : 0,
  };
}

async function fetchRuntimeMessages(
  fetcher: Fetcher,
  encodedFlowId: string,
): Promise<OpsRuntimeEndpointSummary> {
  const result = await fetchJson(
    fetcher,
    `/flowbuilder/flows/${encodedFlowId}/runtime/messages?limit=1`,
  );

  if (!result.ok) {
    return unavailableRuntimeEndpoint("Runtime messages", result);
  }

  const payload = result.data as RuntimeMessagesResponse;
  return {
    status: "healthy",
    message: "Runtime messages endpoint is reachable",
    statusCode: result.status,
    count: payload.total ?? payload.messages?.length ?? 0,
  };
}

function unavailableRuntimeEndpoint(
  label: string,
  result: JsonResult,
): OpsRuntimeEndpointSummary {
  return {
    status: "unavailable",
    message: result.message ?? `${label} failed: ${result.statusText}`,
    statusCode: result.status,
  };
}

function selectActiveFlow(
  flows: OpsSummaryFlow[],
  requestedFlowId?: string,
): OpsSummaryFlow | null {
  if (flows.length === 0) return null;

  if (requestedFlowId) {
    const requested = flows.find((flow) => flow.id === requestedFlowId);
    if (requested) return requested;
  }

  return flows.find((flow) => flow.runtime_state === "running") ?? flows[0];
}

function deriveRuntimeStatus(
  activeFlow: OpsSummaryFlow,
  health: OpsRuntimeEndpointSummary,
  metrics: OpsRuntimeEndpointSummary,
  messages: OpsRuntimeEndpointSummary,
): OpsAvailability {
  if (activeFlow.runtime_state === "error") return "degraded";

  if (
    health.status === "unavailable" ||
    metrics.status === "unavailable" ||
    messages.status === "unavailable"
  ) {
    return "degraded";
  }

  if (activeFlow.runtime_state === "running") return "healthy";

  return "unknown";
}

function runtimeMessage(
  activeFlow: OpsSummaryFlow,
  health: OpsRuntimeEndpointSummary,
  metrics: OpsRuntimeEndpointSummary,
  messages: OpsRuntimeEndpointSummary,
): string {
  if (activeFlow.runtime_state === "error") {
    return "Active flow is in an error state";
  }

  if (
    health.status === "unavailable" ||
    metrics.status === "unavailable" ||
    messages.status === "unavailable"
  ) {
    return "One or more runtime endpoints are unavailable";
  }

  if (activeFlow.runtime_state === "running") {
    return "Active flow runtime endpoints are reachable";
  }

  return `Active flow is ${activeFlow.runtime_state}`;
}

function deriveSourceSummary(
  health: OpsEndpointSummary,
  graph: OpsGraphSummary,
  runtime: OpsRuntimeSummary,
): OpsSourceSummary {
  if (health.status === "unavailable" && graph.status === "unavailable") {
    return {
      status: "unavailable",
      message: "Backend and graph read paths are unavailable",
      basis: "generic-read-path",
    };
  }

  if (
    health.status === "healthy" &&
    graph.status === "available" &&
    runtime.status !== "degraded" &&
    runtime.status !== "unavailable"
  ) {
    return {
      status: "healthy",
      message: "Generic backend, graph, and runtime read paths are reachable",
      basis: "generic-read-path",
    };
  }

  return {
    status: "degraded",
    message: "One or more generic ops read paths are degraded",
    basis: "generic-read-path",
  };
}

async function fetchJson(
  fetcher: Fetcher,
  input: string,
  init?: FetchInit,
): Promise<JsonResult> {
  try {
    const response = await fetcher(input, init);
    const data = await response.json().catch(() => null);

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      data,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      statusText: "Network Error",
      data: null,
      message:
        error instanceof Error ? error.message : "Unable to reach endpoint",
    };
  }
}
