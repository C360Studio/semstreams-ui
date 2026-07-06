import type { components } from "$lib/types/api.generated";

type BackendTrajectory = components["schemas"]["Trajectory"];
type BackendTrajectoryStep = components["schemas"]["TrajectoryStep"];

type Fetcher = typeof fetch;
type FetchInit = Parameters<Fetcher>[1];

export interface TrajectoryDetailStep {
  index: number;
  stepType: string;
  timestamp: string;
  durationMs: number;
  summary: string;
  capability?: string;
  errorCategory?: string;
  errorMessage?: string;
  model?: string;
  provider?: string;
  requestId?: string;
  retryCount?: number;
  tokensIn?: number;
  tokensOut?: number;
  toolName?: string;
  toolStatus?: string;
  utilization?: number;
}

export interface TrajectoryDetail {
  loopId: string;
  outcome: string;
  startTime: string;
  endTime?: string | null;
  durationMs: number;
  totalTokensIn: number;
  totalTokensOut: number;
  steps: TrajectoryDetailStep[];
}

export interface FetchTrajectoryDetailOptions {
  fetcher?: Fetcher;
  limit?: number;
}

export class TrajectoryApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = "TrajectoryApiError";
  }
}

export const trajectoryApi = {
  async fetchDetail(
    loopId: string,
    options: FetchTrajectoryDetailOptions = {},
  ): Promise<TrajectoryDetail> {
    const fetcher = options.fetcher ?? fetch;
    const url = buildTrajectoryDetailUrl(loopId, options.limit);
    const result = await fetchJson(fetcher, url, { cache: "no-store" });

    if (!result.ok) {
      throw new TrajectoryApiError(
        result.message ?? `Trajectory detail failed: ${result.statusText}`,
        result.status,
      );
    }

    return normalizeTrajectoryDetail(result.data as Partial<BackendTrajectory>);
  },
};

function buildTrajectoryDetailUrl(loopId: string, limit?: number): string {
  const encodedLoopId = encodeURIComponent(loopId);
  if (typeof limit !== "number") return `/trajectories/${encodedLoopId}`;

  const params = new URLSearchParams({ limit: String(limit) });
  return `/trajectories/${encodedLoopId}?${params.toString()}`;
}

function normalizeTrajectoryDetail(
  payload: Partial<BackendTrajectory>,
): TrajectoryDetail {
  const steps = Array.isArray(payload.steps)
    ? payload.steps.map(normalizeTrajectoryStep)
    : [];

  return {
    loopId: payload.loop_id ?? "unknown-loop",
    outcome: payload.outcome ?? "unknown",
    startTime: payload.start_time ?? "",
    endTime: payload.end_time,
    durationMs: payload.duration ?? 0,
    totalTokensIn: payload.total_tokens_in ?? 0,
    totalTokensOut: payload.total_tokens_out ?? 0,
    steps,
  };
}

function normalizeTrajectoryStep(
  step: BackendTrajectoryStep,
  index: number,
): TrajectoryDetailStep {
  return {
    index: index + 1,
    stepType: step.step_type,
    timestamp: step.timestamp,
    durationMs: step.duration,
    summary: summarizeStep(step),
    capability: step.capability,
    errorCategory: step.error_category,
    errorMessage: step.error_message,
    model: step.model,
    provider: step.provider,
    requestId: step.request_id,
    retryCount: step.retry_count,
    tokensIn: step.tokens_in,
    tokensOut: step.tokens_out,
    toolName: step.tool_name,
    toolStatus: step.tool_status,
    utilization: step.utilization,
  };
}

function summarizeStep(step: BackendTrajectoryStep): string {
  if (step.error_message) return step.error_message;
  if (step.tool_name) {
    return [step.tool_name, step.tool_status].filter(Boolean).join(" ");
  }
  if (step.response) return step.response;
  if (step.prompt) return step.prompt;
  if (step.messages && step.messages.length > 0) {
    const firstContent = step.messages.find((message) => message.content);
    if (firstContent?.content) return firstContent.content;
  }
  return step.step_type;
}

async function fetchJson(
  fetcher: Fetcher,
  input: string,
  init?: FetchInit,
): Promise<{
  ok: boolean;
  status: number;
  statusText: string;
  data: unknown;
  message?: string;
}> {
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
      message: error instanceof Error ? error.message : "Network error",
    };
  }
}
