import { describe, expect, it, vi } from "vitest";
import { TrajectoryApiError, trajectoryApi } from "./trajectoryApi";

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

describe("trajectoryApi", () => {
  it("fetches and normalizes trajectory detail", async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({
        loop_id: "loop-123",
        outcome: "success",
        start_time: "2026-07-06T00:00:00Z",
        end_time: "2026-07-06T00:00:12Z",
        duration: 12000,
        total_tokens_in: 100,
        total_tokens_out: 42,
        steps: [
          {
            step_type: "model_response",
            timestamp: "2026-07-06T00:00:01Z",
            duration: 2000,
            model: "gpt-test",
            provider: "openai",
            tokens_in: 90,
            tokens_out: 40,
            response: "Plan accepted",
          },
          {
            step_type: "tool_call",
            timestamp: "2026-07-06T00:00:04Z",
            duration: 800,
            tool_name: "read_file",
            tool_status: "success",
            retry_count: 1,
            tokens_in: 10,
            tokens_out: 2,
          },
        ],
      }),
    );

    const detail = await trajectoryApi.fetchDetail("loop-123", { fetcher });

    expect(fetcher).toHaveBeenCalledWith("/trajectories/loop-123", {
      cache: "no-store",
    });
    expect(detail).toMatchObject({
      loopId: "loop-123",
      outcome: "success",
      durationMs: 12000,
      totalTokensIn: 100,
      totalTokensOut: 42,
    });
    expect(detail.steps).toHaveLength(2);
    expect(detail.steps[0]).toMatchObject({
      index: 1,
      stepType: "model_response",
      model: "gpt-test",
      provider: "openai",
      summary: "Plan accepted",
    });
    expect(detail.steps[1]).toMatchObject({
      index: 2,
      toolName: "read_file",
      toolStatus: "success",
      retryCount: 1,
      summary: "read_file success",
    });
  });

  it("URL-encodes loop IDs and passes an optional step limit", async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({
        loop_id: "parent/child loop",
        start_time: "2026-07-06T00:00:00Z",
        duration: 0,
        total_tokens_in: 0,
        total_tokens_out: 0,
        steps: [],
      }),
    );

    await trajectoryApi.fetchDetail("parent/child loop", {
      fetcher,
      limit: 25,
    });

    expect(fetcher).toHaveBeenCalledWith(
      "/trajectories/parent%2Fchild%20loop?limit=25",
      { cache: "no-store" },
    );
  });

  it("normalizes missing steps to an empty timeline", async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({
        loop_id: "loop-empty",
        start_time: "2026-07-06T00:00:00Z",
        duration: 0,
        total_tokens_in: 0,
        total_tokens_out: 0,
      }),
    );

    const detail = await trajectoryApi.fetchDetail("loop-empty", { fetcher });

    expect(detail.steps).toEqual([]);
    expect(detail.outcome).toBe("unknown");
  });

  it("throws a structured error when detail is unavailable", async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({ error: "not found" }, 404, "Not Found"),
    );

    await expect(
      trajectoryApi.fetchDetail("missing-loop", { fetcher }),
    ).rejects.toMatchObject({
      name: "TrajectoryApiError",
      statusCode: 404,
      message: "Trajectory detail failed: Not Found",
    });

    await expect(
      trajectoryApi.fetchDetail("missing-loop", { fetcher }),
    ).rejects.toBeInstanceOf(TrajectoryApiError);
  });
});
