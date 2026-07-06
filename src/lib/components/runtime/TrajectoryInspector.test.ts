import { render, screen, waitFor, within } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import TrajectoryInspector from "./TrajectoryInspector.svelte";
import type { OpsTrajectorySummary } from "$lib/services/opsSummaryApi";
import type { TrajectoryDetail } from "$lib/services/trajectoryApi";

function makeSummary(): OpsTrajectorySummary {
  return {
    status: "healthy",
    message: "Trajectory summaries are available",
    total: 2,
    statusCode: 200,
    items: [
      {
        loopId: "loop-1",
        taskId: "task-1",
        role: "developer",
        outcome: "success",
        workflowSlug: "inspect-code",
        startTime: "2026-07-06T00:00:00Z",
        durationMs: 12000,
        iterations: 3,
      },
      {
        loopId: "loop-2",
        taskId: "task-2",
        role: "reviewer",
        outcome: "failed",
        workflowSlug: "review-code",
        startTime: "2026-07-06T00:01:00Z",
        durationMs: 4000,
        iterations: 1,
      },
    ],
  };
}

function makeDetail(): TrajectoryDetail {
  return {
    loopId: "loop-1",
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
        summary: "Plan accepted",
      },
      {
        index: 2,
        stepType: "tool_call",
        timestamp: "2026-07-06T00:00:04Z",
        durationMs: 800,
        toolName: "read_file",
        toolStatus: "success",
        retryCount: 1,
        tokensIn: 10,
        tokensOut: 2,
        summary: "read_file success",
      },
    ],
  };
}

describe("TrajectoryInspector", () => {
  it("lists recent trajectories and fetches detail on selection", async () => {
    const user = userEvent.setup();
    const fetchDetail = vi.fn().mockResolvedValue(makeDetail());

    render(TrajectoryInspector, {
      props: {
        summary: makeSummary(),
        fetchDetail,
      },
    });

    expect(screen.getByTestId("trajectory-inspector")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /inspect trajectory loop-1/i }),
    ).toBeVisible();
    expect(screen.getByText("No trajectory selected")).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: /inspect trajectory loop-1/i }),
    );

    await waitFor(() => {
      expect(fetchDetail).toHaveBeenCalledWith("loop-1");
    });
    expect(screen.getByText("Plan accepted")).toBeVisible();
    expect(screen.getByText("read_file success")).toBeVisible();
    expect(screen.getAllByText("Tokens").length).toBeGreaterThan(0);
    expect(screen.getByText("100 in / 42 out")).toBeVisible();
  });

  it("copies loop and task identifiers and exposes the raw detail link", async () => {
    const user = userEvent.setup();
    const writeClipboard = vi.fn().mockResolvedValue(undefined);
    const fetchDetail = vi.fn().mockResolvedValue(makeDetail());

    render(TrajectoryInspector, {
      props: {
        summary: makeSummary(),
        fetchDetail,
        writeClipboard,
      },
    });

    await user.click(
      screen.getByRole("button", { name: /inspect trajectory loop-1/i }),
    );

    const panel = await screen.findByTestId("trajectory-detail-panel");
    expect(
      within(panel).getByRole("link", { name: /open raw trajectory/i }),
    ).toHaveAttribute("href", "/trajectories/loop-1");

    await user.click(screen.getByRole("button", { name: /copy loop id/i }));
    await user.click(screen.getByRole("button", { name: /copy task id/i }));

    await waitFor(() => {
      expect(writeClipboard).toHaveBeenNthCalledWith(1, "loop-1");
      expect(writeClipboard).toHaveBeenNthCalledWith(2, "task-1");
    });
  });

  it("shows a detail-level error without hiding the summary list", async () => {
    const user = userEvent.setup();
    const fetchDetail = vi
      .fn()
      .mockRejectedValue(new Error("trajectory detail unavailable"));

    render(TrajectoryInspector, {
      props: {
        summary: makeSummary(),
        fetchDetail,
      },
    });

    await user.click(
      screen.getByRole("button", { name: /inspect trajectory loop-2/i }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "trajectory detail unavailable",
    );
    expect(
      screen.getByRole("button", { name: /inspect trajectory loop-1/i }),
    ).toBeVisible();
  });

  it("renders empty and unavailable states", async () => {
    const emptySummary: OpsTrajectorySummary = {
      status: "healthy",
      message: "Trajectory endpoint is reachable",
      total: 0,
      items: [],
    };

    const { rerender } = render(TrajectoryInspector, {
      props: { summary: emptySummary },
    });

    expect(screen.getByText("No trajectories yet")).toBeVisible();

    await rerender({
      summary: {
        status: "unavailable",
        message: "Trajectory storage unavailable",
        total: 0,
        items: [],
      },
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Trajectory storage unavailable",
    );
  });

  it("does not render mutation or judgment controls", async () => {
    const user = userEvent.setup();
    const fetchDetail = vi.fn().mockResolvedValue(makeDetail());

    render(TrajectoryInspector, {
      props: {
        summary: makeSummary(),
        fetchDetail,
      },
    });

    await user.click(
      screen.getByRole("button", { name: /inspect trajectory loop-1/i }),
    );
    await screen.findByText("Plan accepted");

    expect(
      screen.queryByRole("button", {
        name: /approve|retry|cancel|resume|delete|score|classify/i,
      }),
    ).toBeNull();
  });
});
