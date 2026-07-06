import { render, screen, within } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import OpsReadinessMatrix from "./OpsReadinessMatrix.svelte";
import type { OpsSummary } from "$lib/services/opsSummaryApi";

function makeSummary(overrides: Partial<OpsSummary> = {}): OpsSummary {
  const summary: OpsSummary = {
    generatedAt: "2026-07-06T00:00:00.000Z",
    health: {
      status: "healthy",
      message: "Backend health endpoint is reachable",
      statusCode: 200,
    },
    graph: {
      status: "available",
      message: "Graph endpoint is reachable",
      entityCount: 12,
      statusCode: 200,
    },
    runtime: {
      status: "healthy",
      message: "Active flow runtime endpoints are reachable",
      flowCount: 2,
      flowList: {
        status: "healthy",
        message: "Flows discovered",
        statusCode: 200,
        count: 2,
      },
      activeFlow: {
        id: "flow-123",
        name: "Runtime ingest",
        runtime_state: "running",
      },
      health: {
        status: "healthy",
        message: "Runtime health endpoint is reachable",
        statusCode: 200,
        count: 3,
      },
      metrics: {
        status: "healthy",
        message: "Runtime metrics endpoint is reachable",
        statusCode: 200,
        count: 3,
      },
      messages: {
        status: "healthy",
        message: "Runtime messages endpoint is reachable",
        statusCode: 200,
        count: 8,
      },
    },
    trajectories: {
      status: "healthy",
      message: "Trajectory summaries are available",
      total: 1,
      items: [],
      statusCode: 200,
    },
    source: {
      status: "healthy",
      message: "Generic backend, graph, and runtime read paths are reachable",
      basis: "generic-read-path",
    },
  };

  return {
    ...summary,
    ...overrides,
  };
}

describe("OpsReadinessMatrix", () => {
  it("renders healthy generic read-path rows with HTTP and count evidence", () => {
    render(OpsReadinessMatrix, {
      props: {
        summary: makeSummary(),
      },
    });

    const matrix = screen.getByRole("table", { name: /readiness matrix/i });
    expect(matrix).toBeVisible();

    const backend = screen.getByTestId("ops-readiness-row-backend-health");
    expect(within(backend).getByText("Backend health")).toBeVisible();
    expect(within(backend).getByText("/health")).toBeVisible();
    expect(within(backend).getByText("Healthy")).toBeVisible();
    expect(within(backend).getByText("HTTP 200")).toBeVisible();

    const graph = screen.getByTestId("ops-readiness-row-graph-query");
    expect(within(graph).getByText("Graph query")).toBeVisible();
    expect(within(graph).getByText("/graphql")).toBeVisible();
    expect(within(graph).getByText("Available")).toBeVisible();
    expect(within(graph).getByText("Count 12")).toBeVisible();

    const flowList = screen.getByTestId("ops-readiness-row-flow-list");
    expect(within(flowList).getByText("Flow list")).toBeVisible();
    expect(within(flowList).getByText("/flowbuilder/flows")).toBeVisible();
    expect(within(flowList).getByText("Count 2")).toBeVisible();

    expect(
      within(screen.getByTestId("ops-readiness-row-runtime-health")).getByText(
        "/flowbuilder/flows/flow-123/runtime/health",
      ),
    ).toBeVisible();
    expect(
      within(
        screen.getByTestId("ops-readiness-row-runtime-messages"),
      ).getByText("/flowbuilder/flows/flow-123/runtime/messages?limit=1"),
    ).toBeVisible();
    expect(
      within(
        screen.getByTestId("ops-readiness-row-trajectory-summary"),
      ).getByText("/trajectories?limit=5"),
    ).toBeVisible();
    expect(
      within(
        screen.getByTestId("ops-readiness-row-source-readiness"),
      ).getByText("generic-read-path"),
    ).toBeVisible();
  });

  it("keeps degraded and unavailable endpoint evidence independent", () => {
    render(OpsReadinessMatrix, {
      props: {
        summary: makeSummary({
          graph: {
            status: "unavailable",
            message: "Graph query failed: Bad Gateway",
            statusCode: 502,
          },
          runtime: {
            status: "degraded",
            message: "One or more runtime endpoints are unavailable",
            flowCount: 1,
            flowList: {
              status: "healthy",
              message: "Flows discovered",
              statusCode: 200,
              count: 1,
            },
            activeFlow: {
              id: "flow-123",
              name: "Runtime ingest",
              runtime_state: "running",
            },
            health: {
              status: "degraded",
              message: "1 runtime components are degraded",
              statusCode: 200,
              count: 3,
            },
            metrics: {
              status: "unavailable",
              message: "Runtime metrics failed: Not Found",
              statusCode: 404,
            },
            messages: {
              status: "healthy",
              message: "Runtime messages endpoint is reachable",
              statusCode: 200,
              count: 0,
            },
          },
          trajectories: {
            status: "unavailable",
            message: "Trajectories failed: Service Unavailable",
            total: 0,
            items: [],
            statusCode: 503,
          },
          source: {
            status: "degraded",
            message: "One or more generic ops read paths are degraded",
            basis: "generic-read-path",
          },
        }),
      },
    });

    const graph = screen.getByTestId("ops-readiness-row-graph-query");
    expect(within(graph).getByText("Unavailable")).toBeVisible();
    expect(within(graph).getByText("HTTP 502")).toBeVisible();
    expect(
      within(graph).getByText("Graph query failed: Bad Gateway"),
    ).toBeVisible();

    const runtimeHealth = screen.getByTestId(
      "ops-readiness-row-runtime-health",
    );
    expect(within(runtimeHealth).getByText("Degraded")).toBeVisible();
    expect(within(runtimeHealth).getByText("Count 3")).toBeVisible();

    const runtimeMetrics = screen.getByTestId(
      "ops-readiness-row-runtime-metrics",
    );
    expect(within(runtimeMetrics).getByText("Unavailable")).toBeVisible();
    expect(within(runtimeMetrics).getByText("HTTP 404")).toBeVisible();
    expect(
      within(screen.getByTestId("ops-readiness-row-flow-list")).getByText(
        "Healthy",
      ),
    ).toBeVisible();

    const trajectories = screen.getByTestId(
      "ops-readiness-row-trajectory-summary",
    );
    expect(within(trajectories).getByText("Unavailable")).toBeVisible();
    expect(within(trajectories).getByText("HTTP 503")).toBeVisible();
  });

  it("renders derived runtime basis rows when no active flow is selected", () => {
    render(OpsReadinessMatrix, {
      props: {
        summary: makeSummary({
          runtime: {
            status: "unavailable",
            message: "No flows available",
            flowCount: 0,
            flowList: {
              status: "healthy",
              message: "No flows discovered",
              statusCode: 200,
              count: 0,
            },
            activeFlow: null,
            health: {
              status: "unknown",
              message: "No active flow selected",
            },
            metrics: {
              status: "unknown",
              message: "No active flow selected",
            },
            messages: {
              status: "unknown",
              message: "No active flow selected",
            },
          },
        }),
      },
    });

    expect(
      within(screen.getByTestId("ops-readiness-row-runtime-health")).getByText(
        "active-flow runtime health",
      ),
    ).toBeVisible();
    expect(
      within(screen.getByTestId("ops-readiness-row-runtime-health")).getByText(
        "Unknown",
      ),
    ).toBeVisible();
  });

  it("shows an empty state and no controls before a summary is loaded", () => {
    render(OpsReadinessMatrix, {
      props: {
        summary: null,
      },
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Ops summary not loaded",
    );
    expect(
      screen.queryByRole("table", { name: /readiness matrix/i }),
    ).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("exposes only read-only route evidence without mutation controls or product labels", () => {
    render(OpsReadinessMatrix, {
      props: {
        summary: makeSummary(),
      },
    });

    const matrix = screen.getByTestId("ops-readiness-matrix");
    expect(within(matrix).queryByRole("button")).toBeNull();
    expect(within(matrix).queryByRole("link")).toBeNull();
    expect(
      within(matrix).queryByText(
        /create|update|delete|approve|retry|cancel|resume|score|classify/i,
      ),
    ).toBeNull();
    expect(within(matrix).queryByText(/SemSource|SemDev/)).toBeNull();
  });
});
