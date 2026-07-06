import { describe, expect, it, vi } from "vitest";
import { opsSummaryApi } from "./opsSummaryApi";

function jsonResponse(
  body: unknown,
  status = 200,
  statusText = "OK",
): Response {
  return new Response(JSON.stringify(body), {
    status,
    statusText,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function makeFetch(
  responses: Record<string, Response | Error>,
): ReturnType<typeof vi.fn> {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const response = responses[url];

    if (response instanceof Error) {
      throw response;
    }

    if (!response) {
      throw new Error(`Unexpected fetch: ${url}`);
    }

    return response;
  });
}

describe("opsSummaryApi", () => {
  it("hydrates health, graph, and active runtime summaries", async () => {
    const fetcher = makeFetch({
      "/health": jsonResponse({ status: "ok", version: "test" }),
      "/flowbuilder/flows": jsonResponse({
        flows: [
          {
            id: "flow-1",
            name: "Source ingest",
            runtime_state: "running",
          },
        ],
      }),
      "/graphql": jsonResponse({
        data: {
          entitiesByPrefix: [{ id: "entity-1" }],
        },
      }),
      "/trajectories?limit=5": jsonResponse({
        total: 1,
        trajectories: [
          {
            loop_id: "loop-1",
            task_id: "task-1",
            role: "developer",
            outcome: "success",
            workflow_slug: "inspect-code",
            start_time: "2026-07-06T00:00:00Z",
            duration: 1200,
            iterations: 3,
          },
        ],
      }),
      "/flowbuilder/flows/flow-1/runtime/health": jsonResponse({
        summary: { running: 2, degraded: 0, error: 0 },
        components: [{ name: "reader" }, { name: "indexer" }],
      }),
      "/flowbuilder/flows/flow-1/runtime/metrics": jsonResponse({
        components: [{ name: "reader" }],
      }),
      "/flowbuilder/flows/flow-1/runtime/messages?limit=1": jsonResponse({
        messages: [{ message_id: "msg-1" }],
        total: 14,
      }),
    });

    const summary = await opsSummaryApi.fetchSummary({ fetcher });

    expect(summary.health.status).toBe("healthy");
    expect(summary.graph.status).toBe("available");
    expect(summary.graph.entityCount).toBe(1);
    expect(summary.runtime.status).toBe("healthy");
    expect(summary.runtime.activeFlow?.id).toBe("flow-1");
    expect(summary.runtime.flowList).toEqual({
      status: "healthy",
      message: "Flows discovered",
      statusCode: 200,
      count: 1,
    });
    expect(summary.runtime.health.count).toBe(2);
    expect(summary.runtime.metrics.count).toBe(1);
    expect(summary.runtime.messages.count).toBe(14);
    expect(summary.trajectories.status).toBe("healthy");
    expect(summary.trajectories.total).toBe(1);
    expect(summary.trajectories.items[0]).toMatchObject({
      loopId: "loop-1",
      taskId: "task-1",
      role: "developer",
      outcome: "success",
      workflowSlug: "inspect-code",
    });
    expect(summary.source).toEqual({
      status: "healthy",
      message: "Generic backend, graph, and runtime read paths are reachable",
      basis: "generic-read-path",
    });

    expect(fetcher).toHaveBeenCalledWith("/health", { cache: "no-store" });
    expect(fetcher).toHaveBeenCalledWith("/flowbuilder/flows", undefined);
    expect(fetcher).toHaveBeenCalledWith(
      "/flowbuilder/flows/flow-1/runtime/health",
      undefined,
    );
    expect(fetcher).toHaveBeenCalledWith(
      "/flowbuilder/flows/flow-1/runtime/metrics",
      undefined,
    );
    expect(fetcher).toHaveBeenCalledWith(
      "/flowbuilder/flows/flow-1/runtime/messages?limit=1",
      undefined,
    );
    expect(fetcher).toHaveBeenCalledWith("/trajectories?limit=5", {
      cache: "no-store",
    });
  });

  it("prefers the requested active flow before falling back to the running flow", async () => {
    const fetcher = makeFetch({
      "/health": jsonResponse({ status: "ok" }),
      "/flowbuilder/flows": jsonResponse({
        flows: [
          {
            id: "flow-running",
            name: "Running flow",
            runtime_state: "running",
          },
          {
            id: "flow-requested",
            name: "Requested flow",
            runtime_state: "deployed_stopped",
          },
        ],
      }),
      "/graphql": jsonResponse({
        data: {
          entitiesByPrefix: [],
        },
      }),
      "/trajectories?limit=5": jsonResponse({
        total: 0,
        trajectories: [],
      }),
      "/flowbuilder/flows/flow-requested/runtime/health": jsonResponse({
        summary: { running: 0, degraded: 0, error: 0 },
      }),
      "/flowbuilder/flows/flow-requested/runtime/metrics": jsonResponse({
        components: [],
      }),
      "/flowbuilder/flows/flow-requested/runtime/messages?limit=1":
        jsonResponse({
          messages: [],
        }),
    });

    const summary = await opsSummaryApi.fetchSummary({
      fetcher,
      activeFlowId: "flow-requested",
    });

    expect(summary.runtime.activeFlow?.id).toBe("flow-requested");
    expect(summary.runtime.status).toBe("unknown");
    expect(summary.runtime.message).toBe("Active flow is deployed_stopped");
  });

  it("does not request runtime endpoints when no flow is available", async () => {
    const fetcher = makeFetch({
      "/health": jsonResponse({ status: "ok" }),
      "/flowbuilder/flows": jsonResponse({ flows: [] }),
      "/graphql": jsonResponse({
        data: {
          entitiesByPrefix: [],
        },
      }),
      "/trajectories?limit=5": jsonResponse({
        total: 0,
        trajectories: [],
      }),
    });

    const summary = await opsSummaryApi.fetchSummary({ fetcher });

    expect(summary.runtime.activeFlow).toBeNull();
    expect(summary.runtime.status).toBe("unavailable");
    expect(summary.runtime.flowList).toEqual({
      status: "healthy",
      message: "No flows discovered",
      statusCode: 200,
      count: 0,
    });
    expect(summary.runtime.health.message).toBe("No active flow selected");
    expect(fetcher).toHaveBeenCalledTimes(4);
  });

  it("preserves flow-list endpoint failures separately from active runtime endpoints", async () => {
    const fetcher = makeFetch({
      "/health": jsonResponse({ status: "ok" }),
      "/flowbuilder/flows": jsonResponse(
        { error: "flow list unavailable" },
        503,
        "Service Unavailable",
      ),
      "/graphql": jsonResponse({
        data: {
          entitiesByPrefix: [],
        },
      }),
      "/trajectories?limit=5": jsonResponse({
        total: 0,
        trajectories: [],
      }),
    });

    const summary = await opsSummaryApi.fetchSummary({ fetcher });

    expect(summary.runtime.activeFlow).toBeNull();
    expect(summary.runtime.status).toBe("unavailable");
    expect(summary.runtime.message).toBe(
      "Flow list failed: Service Unavailable",
    );
    expect(summary.runtime.flowList).toEqual({
      status: "unavailable",
      message: "Flow list failed: Service Unavailable",
      statusCode: 503,
      count: 0,
    });
    expect(summary.runtime.health.status).toBe("unknown");
    expect(summary.runtime.health.message).toBe("No active flow selected");
    expect(fetcher).toHaveBeenCalledTimes(4);
  });

  it("degrades instead of throwing when graph, trajectory, or runtime endpoints fail", async () => {
    const fetcher = makeFetch({
      "/health": jsonResponse({ status: "ok" }),
      "/flowbuilder/flows": jsonResponse({
        flows: [
          {
            id: "flow-1",
            name: "Source ingest",
            runtime_state: "running",
          },
        ],
      }),
      "/graphql": jsonResponse(
        {
          errors: [{ message: "graph unavailable" }],
        },
        200,
      ),
      "/trajectories?limit=5": jsonResponse(
        { error: "trajectory storage unavailable" },
        503,
        "Service Unavailable",
      ),
      "/flowbuilder/flows/flow-1/runtime/health": jsonResponse(
        { error: "missing" },
        404,
        "Not Found",
      ),
      "/flowbuilder/flows/flow-1/runtime/metrics": jsonResponse({
        components: [],
      }),
      "/flowbuilder/flows/flow-1/runtime/messages?limit=1": new Error(
        "Failed to fetch",
      ),
    });

    const summary = await opsSummaryApi.fetchSummary({ fetcher });

    expect(summary.graph.status).toBe("unavailable");
    expect(summary.graph.message).toBe("graph unavailable");
    expect(summary.runtime.status).toBe("degraded");
    expect(summary.runtime.health.status).toBe("unavailable");
    expect(summary.runtime.messages.status).toBe("unavailable");
    expect(summary.trajectories.status).toBe("unavailable");
    expect(summary.trajectories.message).toBe(
      "Trajectories failed: Service Unavailable",
    );
    expect(summary.source.status).toBe("degraded");
  });
});
