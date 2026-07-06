import { describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { createRawSnippet, type Snippet } from "svelte";
import OpsConsoleShell from "./OpsConsoleShell.svelte";
import type { OpsSummary } from "$lib/services/opsSummaryApi";
import type { TrajectoryDetail } from "$lib/services/trajectoryApi";
import type { GraphEntity } from "$lib/types/graph";
import { parseEntityId } from "$lib/types/graph";
import type { OpsGraphOverview } from "$lib/types/opsConsole";

function textSnippet(text: string): Snippet {
  return createRawSnippet(() => ({
    render: () => `<span data-testid="test-main-content">${text}</span>`,
  }));
}

function makeSummary(): OpsSummary {
  return {
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
      activeFlow: {
        id: "flow-123",
        name: "SemSource ingest",
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
      items: [
        {
          loopId: "loop-123",
          taskId: "task-123",
          role: "developer",
          outcome: "success",
          workflowSlug: "inspect-code",
          startTime: "2026-07-06T00:00:00Z",
          durationMs: 1200,
          iterations: 3,
        },
      ],
      statusCode: 200,
    },
    source: {
      status: "healthy",
      message: "Generic backend, graph, and runtime read paths are reachable",
      basis: "generic-read-path",
    },
  };
}

function makeTrajectoryDetail(): TrajectoryDetail {
  return {
    loopId: "loop-123",
    outcome: "success",
    startTime: "2026-07-06T00:00:00Z",
    endTime: "2026-07-06T00:00:12Z",
    durationMs: 12000,
    totalTokensIn: 100,
    totalTokensOut: 42,
    steps: [
      {
        index: 1,
        stepType: "model_response",
        timestamp: "2026-07-06T00:00:01Z",
        durationMs: 2000,
        model: "gpt-test",
        provider: "openai",
        tokensIn: 90,
        tokensOut: 40,
        summary: "Trajectory detail rendered",
      },
    ],
  };
}

function makeGraphEntity(id: string): GraphEntity {
  return {
    id,
    idParts: parseEntityId(id),
    properties: [],
    outgoing: [],
    incoming: [],
  };
}

function makeGraphOverview(
  overrides: Partial<OpsGraphOverview> = {},
): OpsGraphOverview {
  return {
    entityCount: 12,
    relationshipCount: 7,
    filteredEntityCount: 8,
    filteredRelationshipCount: 4,
    activeFilterCount: 2,
    selectedEntity: makeGraphEntity(
      "c360.source.repo.main.function.parseConfig",
    ),
    loading: false,
    error: null,
    connected: true,
    ...overrides,
  };
}

describe("OpsConsoleShell", () => {
  it("renders the four first-slice ops areas around the graph surface", () => {
    render(OpsConsoleShell, {
      props: {
        productName: "SemStreams",
        activeFlow: {
          id: "flow-123",
          name: "SemSource ingest",
          runtime_state: "running",
        },
        graphStatus: "available",
        sourceStatus: "unknown",
        main: textSnippet("Graph explorer"),
      },
    });

    expect(screen.getByTestId("ops-console-shell")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "SemStreams" })).toBeVisible();

    const graphArea = screen.getByTestId("ops-area-graph");
    expect(within(graphArea).getByText("Graph")).toBeVisible();
    expect(within(graphArea).getByText("Available")).toBeVisible();

    const searchArea = screen.getByTestId("ops-area-search");
    expect(within(searchArea).getByText("Search")).toBeVisible();
    expect(within(searchArea).getByText("Entity lookup")).toBeVisible();

    const runtimeArea = screen.getByTestId("ops-area-runtime");
    expect(within(runtimeArea).getByText("Runtime/Admin")).toBeVisible();
    expect(within(runtimeArea).getByText("Running")).toBeVisible();
    expect(within(runtimeArea).getByText("SemSource ingest")).toBeVisible();

    const sourceArea = screen.getByTestId("ops-area-source");
    expect(within(sourceArea).getByText("Source")).toBeVisible();
    expect(within(sourceArea).getByText("Unknown")).toBeVisible();

    expect(screen.getByTestId("ops-main")).toHaveTextContent("Graph explorer");
  });

  it("links runtime/admin to the active flow when one is discovered", () => {
    render(OpsConsoleShell, {
      props: {
        activeFlow: {
          id: "flow-abc",
          name: "Runtime flow",
          runtime_state: "deployed_stopped",
        },
        main: textSnippet("Graph"),
      },
    });

    const runtimeArea = screen.getByTestId("ops-area-runtime");
    expect(runtimeArea).toHaveAttribute("href", "/flows/flow-abc");
    expect(runtimeArea).toHaveAttribute("data-tone", "warning");
  });

  it("keeps admin navigation available without an active flow", () => {
    render(OpsConsoleShell, {
      props: {
        activeFlow: null,
        graphStatus: "unavailable",
        sourceStatus: "unavailable",
        main: textSnippet("Graph fallback"),
      },
    });

    const runtimeArea = screen.getByTestId("ops-area-runtime");
    expect(runtimeArea).toHaveAttribute("href", "/flows");
    expect(runtimeArea).toHaveTextContent("No active flow");
    expect(screen.getByTestId("ops-area-graph")).toHaveAttribute(
      "data-tone",
      "danger",
    );
    expect(screen.getByTestId("ops-area-source")).toHaveAttribute(
      "data-tone",
      "danger",
    );
  });

  it("exposes graph, search, admin, and flows navigation targets", () => {
    render(OpsConsoleShell, {
      props: {
        activeFlow: {
          id: "flow-nav",
          name: "Navigation flow",
          runtime_state: "not_deployed",
        },
        main: textSnippet("Graph"),
      },
    });

    const nav = screen.getByRole("navigation", { name: "Ops console" });

    expect(within(nav).getByRole("link", { name: "Graph" })).toHaveAttribute(
      "href",
      "#graph-explorer",
    );
    expect(within(nav).getByRole("link", { name: "Search" })).toHaveAttribute(
      "href",
      "#search-surface",
    );
    expect(within(nav).getByRole("link", { name: "Admin" })).toHaveAttribute(
      "href",
      "/flows/flow-nav",
    );
    expect(within(nav).getByRole("link", { name: "Flows" })).toHaveAttribute(
      "href",
      "/flows",
    );
  });

  it("shows read-side admin inspection with flow and runtime drill-downs", () => {
    render(OpsConsoleShell, {
      props: {
        activeFlow: {
          id: "flow-123",
          name: "SemSource ingest",
          runtime_state: "running",
        },
        opsSummary: makeSummary(),
        main: textSnippet("Graph"),
      },
    });

    const panel = screen.getByTestId("ops-admin-panel");
    expect(within(panel).getByText("Backend")).toBeVisible();
    expect(within(panel).getByText("Graph")).toBeVisible();
    expect(within(panel).getAllByText("Runtime").length).toBeGreaterThan(0);
    expect(within(panel).getByText("Source")).toBeVisible();
    expect(within(panel).getByText("Health")).toBeVisible();
    expect(within(panel).getByText("Metrics")).toBeVisible();
    expect(within(panel).getByText("Messages")).toBeVisible();
    expect(within(panel).getByText("Trajectories")).toBeVisible();
    expect(
      within(panel).getByRole("link", { name: /open active flow/i }),
    ).toHaveAttribute("href", "/flows/flow-123");
    expect(
      within(panel).getByRole("link", { name: /open latest trajectory/i }),
    ).toHaveAttribute("href", "/trajectories/loop-123");
  });

  it("calls the provided read-side refresh action", async () => {
    const user = userEvent.setup();
    let refreshes = 0;

    render(OpsConsoleShell, {
      props: {
        opsSummary: makeSummary(),
        onRefreshSummary: () => {
          refreshes += 1;
        },
        main: textSnippet("Graph"),
      },
    });

    await user.click(
      screen.getByRole("button", { name: /refresh ops summary/i }),
    );

    expect(refreshes).toBe(1);
  });

  it("copies selected entity and active flow IDs without mutation controls", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const summary = makeSummary();
    summary.runtime.activeFlow = {
      id: "flow-copy",
      name: "Copy flow",
      runtime_state: "running",
    };

    render(OpsConsoleShell, {
      props: {
        activeFlow: {
          id: "flow-copy",
          name: "Copy flow",
          runtime_state: "running",
        },
        opsSummary: summary,
        selectedEntityId: "entity-copy",
        writeClipboard: writeText,
        main: textSnippet("Graph"),
      },
    });

    const copyEntity = screen.getByRole("button", { name: /copy entity id/i });
    const copyFlow = screen.getByRole("button", { name: /copy flow id/i });
    const copyTrajectory = screen.getByRole("button", {
      name: /copy trajectory id/i,
    });

    expect(screen.getByText("entity-copy")).toBeVisible();
    expect(screen.getAllByText("loop-123").length).toBeGreaterThan(0);
    expect(copyEntity).toBeEnabled();
    expect(copyFlow).toBeEnabled();
    expect(copyTrajectory).toBeEnabled();

    await fireEvent.click(copyEntity);
    await fireEvent.click(copyFlow);
    await fireEvent.click(copyTrajectory);

    await waitFor(() => {
      expect(writeText).toHaveBeenNthCalledWith(1, "entity-copy");
      expect(writeText).toHaveBeenNthCalledWith(2, "flow-copy");
      expect(writeText).toHaveBeenNthCalledWith(3, "loop-123");
    });
    expect(screen.queryByRole("button", { name: /start|delete|stop/i })).toBe(
      null,
    );
  });

  it("wires the read-only trajectory inspector to detail loading and copy actions", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    const fetchTrajectoryDetail = vi.fn().mockResolvedValue(makeTrajectoryDetail());

    render(OpsConsoleShell, {
      props: {
        opsSummary: makeSummary(),
        fetchTrajectoryDetail,
        writeClipboard: writeText,
        main: textSnippet("Graph"),
      },
    });

    const inspector = screen.getByTestId("trajectory-inspector");
    await user.click(
      within(inspector).getByRole("button", {
        name: /inspect trajectory loop-123/i,
      }),
    );

    await waitFor(() => {
      expect(fetchTrajectoryDetail).toHaveBeenCalledWith("loop-123");
    });
    expect(within(inspector).getByText("Trajectory detail rendered")).toBeVisible();

    await user.click(
      within(inspector).getByRole("button", { name: /copy loop id/i }),
    );

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("loop-123");
    });
    expect(
      within(inspector).queryByRole("button", {
        name: /approve|retry|cancel|resume|delete|score|classify/i,
      }),
    ).toBeNull();
  });

  it("wires the ops search panel to entity selection without hiding graph context", async () => {
    const user = userEvent.setup();
    const entity = makeGraphEntity("c360.source.repo.main.function.parseConfig");
    const searchEntities = vi.fn().mockResolvedValue([entity]);
    const onSearchEntitySelect = vi.fn();

    render(OpsConsoleShell, {
      props: {
        opsSummary: makeSummary(),
        searchEntities,
        onSearchEntitySelect,
        main: textSnippet("Graph remains visible"),
      },
    });

    const searchPanel = screen.getByTestId("ops-search-panel");
    await user.type(
      within(searchPanel).getByRole("searchbox", {
        name: /search graph entities/i,
      }),
      "c360.source",
    );
    await user.click(
      within(searchPanel).getByRole("button", { name: /search entities/i }),
    );

    await waitFor(() => {
      expect(searchEntities).toHaveBeenCalledWith("c360.source", 8);
    });
    expect(await within(searchPanel).findByText("parseConfig")).toBeVisible();

    await user.click(
      within(searchPanel).getByRole("button", {
        name: /select entity c360\.source\.repo\.main\.function\.parseconfig/i,
      }),
    );

    expect(onSearchEntitySelect).toHaveBeenCalledWith(entity);
    expect(screen.getByTestId("ops-admin-panel")).toBeVisible();
    expect(screen.getByTestId("ops-main")).toHaveTextContent(
      "Graph remains visible",
    );
  });

  it("wires graph overview data and frontend-only controls", async () => {
    const user = userEvent.setup();
    const onClearGraphSelection = vi.fn();
    const onResetGraphFilters = vi.fn();

    render(OpsConsoleShell, {
      props: {
        opsSummary: makeSummary(),
        graphOverview: makeGraphOverview(),
        onClearGraphSelection,
        onResetGraphFilters,
        main: textSnippet("Graph context"),
      },
    });

    const overview = screen.getByTestId("graph-overview-panel");
    expect(within(overview).getByText("Available")).toBeVisible();
    expect(within(overview).getByText("parseConfig")).toBeVisible();
    expect(within(overview).getByText("8 shown")).toBeVisible();
    expect(within(overview).getByText("2 active")).toBeVisible();

    await user.click(
      within(overview).getByRole("button", {
        name: /clear graph selection/i,
      }),
    );
    await user.click(
      within(overview).getByRole("button", { name: /reset graph filters/i }),
    );

    expect(onClearGraphSelection).toHaveBeenCalledOnce();
    expect(onResetGraphFilters).toHaveBeenCalledOnce();
    expect(
      within(overview).queryByRole("button", {
        name: /create|update|delete|approve|retry|classify|score/i,
      }),
    ).toBeNull();
  });
});
