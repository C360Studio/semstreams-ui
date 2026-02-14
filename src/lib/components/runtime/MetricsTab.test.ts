import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/svelte";
import { writable, type Writable } from "svelte/store";
import MetricsTab from "./MetricsTab.svelte";
import type {
  RuntimeStoreState,
  MetricValue,
} from "$lib/stores/runtimeStore.svelte";

/**
 * MetricsTab Component Tests
 * Tests for store-based metrics display showing all metrics in flat table
 */

// Create a mock store that we can control
let mockStoreState: Writable<RuntimeStoreState>;

// Mock the runtimeStore module
vi.mock("$lib/stores/runtimeStore.svelte", () => {
  return {
    runtimeStore: {
      subscribe: (fn: (state: RuntimeStoreState) => void) => {
        return mockStoreState.subscribe(fn);
      },
      getMetricsArray: (state: RuntimeStoreState) => {
        const result: Array<{
          component: string;
          metricName: string;
          rate: number | null;
          raw: MetricValue;
        }> = [];

        // Iterate over raw metrics so they show immediately
        for (const [key, raw] of state.metricsRaw) {
          const [component, metricName] = key.split(":");
          result.push({
            component,
            metricName,
            rate: state.metricsRates.get(key) ?? null,
            raw,
          });
        }

        return result.sort((a, b) => a.component.localeCompare(b.component));
      },
    },
  };
});

function createDefaultState(): RuntimeStoreState {
  return {
    connected: false,
    error: null,
    flowId: null,
    flowStatus: null,
    healthOverall: null,
    healthComponents: [],
    logs: [],
    metricsRaw: new Map(),
    metricsRates: new Map(),
    lastMetricsTimestamp: null,
  };
}

function createMetricsState(
  metrics: Array<{
    component: string;
    metric: string;
    value: number;
    rate?: number;
  }>,
): Pick<
  RuntimeStoreState,
  "metricsRaw" | "metricsRates" | "lastMetricsTimestamp"
> {
  const metricsRaw = new Map<string, MetricValue>();
  const metricsRates = new Map<string, number>();

  for (const m of metrics) {
    const key = `${m.component}:${m.metric}`;
    metricsRaw.set(key, {
      name: m.metric,
      type: "counter",
      value: m.value,
      labels: {},
    });
    // Only set rate if provided (allows testing null rate case)
    if (m.rate !== undefined) {
      metricsRates.set(key, m.rate);
    }
  }

  return {
    metricsRaw,
    metricsRates,
    lastMetricsTimestamp: Date.now(),
  };
}

describe("MetricsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState = writable<RuntimeStoreState>(createDefaultState());
  });

  describe("Connection Status", () => {
    it("should show connecting status when not connected", () => {
      mockStoreState.set({
        ...createDefaultState(),
        connected: false,
      });

      render(MetricsTab, { flowId: "test-flow", isActive: true });

      expect(screen.getByText(/Connecting to runtime stream/)).toBeTruthy();
    });

    it("should hide connecting status when connected", async () => {
      mockStoreState.set({
        ...createDefaultState(),
        connected: true,
      });

      render(MetricsTab, { flowId: "test-flow", isActive: true });

      await waitFor(() => {
        expect(screen.queryByText(/Connecting to runtime stream/)).toBeNull();
      });
    });

    it("should show error message when store has error", async () => {
      mockStoreState.set({
        ...createDefaultState(),
        connected: false,
        error: "WebSocket connection failed",
      });

      render(MetricsTab, { flowId: "test-flow", isActive: true });

      await waitFor(() => {
        const alert = screen.getByRole("alert");
        expect(alert).toBeTruthy();
        expect(alert.textContent).toContain("WebSocket connection failed");
      });
    });
  });

  describe("Metrics Display", () => {
    it("should render metrics table with correct columns", async () => {
      const metricsData = createMetricsState([
        {
          component: "udp-source",
          metric: "messages_received_total",
          value: 6170,
          rate: 1234,
        },
      ]);

      mockStoreState.set({
        ...createDefaultState(),
        connected: true,
        ...metricsData,
      });

      render(MetricsTab, { flowId: "test-flow", isActive: true });

      await waitFor(() => {
        // Column headers may have sort indicators, use partial match
        expect(screen.getByText(/^Component/)).toBeTruthy();
        expect(screen.getByText(/^Metric/)).toBeTruthy();
        expect(screen.getByText(/^Value/)).toBeTruthy();
        expect(screen.getByText(/^Rate\/sec/)).toBeTruthy();
      });
    });

    it("should display all metrics in flat table", async () => {
      const metricsData = createMetricsState([
        {
          component: "udp-source",
          metric: "messages_received_total",
          value: 1000,
          rate: 100,
        },
        {
          component: "udp-source",
          metric: "bytes_received_total",
          value: 50000,
          rate: 5000,
        },
        {
          component: "processor",
          metric: "messages_processed_total",
          value: 900,
          rate: 90,
        },
      ]);

      mockStoreState.set({
        ...createDefaultState(),
        connected: true,
        ...metricsData,
      });

      render(MetricsTab, { flowId: "test-flow", isActive: true });

      await waitFor(() => {
        // Should show all 3 metrics as separate rows
        const rows = screen.getAllByTestId("metrics-row");
        expect(rows).toHaveLength(3);
      });
    });

    it("should display metric names (shortened)", async () => {
      const metricsData = createMetricsState([
        {
          component: "objectstore",
          metric: "semstreams_cache_misses_total",
          value: 0,
          rate: 0,
        },
      ]);

      mockStoreState.set({
        ...createDefaultState(),
        connected: true,
        ...metricsData,
      });

      render(MetricsTab, { flowId: "test-flow", isActive: true });

      await waitFor(() => {
        // Should strip 'semstreams_' prefix
        expect(screen.getByText("cache_misses_total")).toBeTruthy();
      });
    });

    it("should display raw value and computed rate", async () => {
      const metricsData = createMetricsState([
        {
          component: "test",
          metric: "messages_total",
          value: 1234,
          rate: 50.5,
        },
      ]);

      mockStoreState.set({
        ...createDefaultState(),
        connected: true,
        ...metricsData,
      });

      render(MetricsTab, { flowId: "test-flow", isActive: true });

      await waitFor(() => {
        // Value: 1,234
        expect(screen.getByText("1,234")).toBeTruthy();
        // Rate: 50.5
        expect(screen.getByText("50.5")).toBeTruthy();
      });
    });

    it("should sort metrics alphabetically by component", async () => {
      const metricsData = createMetricsState([
        { component: "z-component", metric: "metric_a", value: 100, rate: 10 },
        { component: "a-component", metric: "metric_b", value: 200, rate: 20 },
        { component: "m-component", metric: "metric_c", value: 300, rate: 30 },
      ]);

      mockStoreState.set({
        ...createDefaultState(),
        connected: true,
        ...metricsData,
      });

      render(MetricsTab, { flowId: "test-flow", isActive: true });

      await waitFor(() => {
        const rows = screen.getAllByTestId("metrics-row");
        expect(rows[0]).toHaveTextContent("a-component");
        expect(rows[1]).toHaveTextContent("m-component");
        expect(rows[2]).toHaveTextContent("z-component");
      });
    });

    it("should show empty state when no metrics available", async () => {
      mockStoreState.set({
        ...createDefaultState(),
        connected: true,
        // No metrics
      });

      render(MetricsTab, { flowId: "test-flow", isActive: true });

      await waitFor(() => {
        expect(screen.getByText("No metrics available")).toBeTruthy();
      });
    });

    it("should show metrics count in header", async () => {
      const metricsData = createMetricsState([
        { component: "a", metric: "m1", value: 1, rate: 1 },
        { component: "b", metric: "m2", value: 2, rate: 2 },
        { component: "c", metric: "m3", value: 3, rate: 3 },
      ]);

      mockStoreState.set({
        ...createDefaultState(),
        connected: true,
        ...metricsData,
      });

      render(MetricsTab, { flowId: "test-flow", isActive: true });

      await waitFor(() => {
        expect(screen.getByText("3 metrics")).toBeTruthy();
      });
    });

    it("should update when store changes", async () => {
      mockStoreState.set({
        ...createDefaultState(),
        connected: true,
      });

      render(MetricsTab, { flowId: "test-flow", isActive: true });

      // Initially no metrics
      await waitFor(() => {
        expect(screen.getByText("No metrics available")).toBeTruthy();
      });

      // Update store with metrics
      const metricsData = createMetricsState([
        {
          component: "test-component",
          metric: "test_metric",
          value: 500,
          rate: 50,
        },
      ]);

      mockStoreState.update((state) => ({
        ...state,
        ...metricsData,
      }));

      await waitFor(() => {
        expect(screen.getByText("test-component")).toBeTruthy();
        expect(screen.getByText("test_metric")).toBeTruthy();
      });
    });
  });

  describe("Rate Formatting", () => {
    it('should show "-" when rate not yet calculated', async () => {
      // Metric without rate (first data point, no rate yet)
      const metricsData = createMetricsState([
        { component: "test", metric: "counter", value: 100 }, // no rate
      ]);

      mockStoreState.set({
        ...createDefaultState(),
        connected: true,
        ...metricsData,
      });

      render(MetricsTab, { flowId: "test-flow", isActive: true });

      await waitFor(() => {
        expect(screen.getByText("-")).toBeTruthy();
      });
    });

    it('should show zero rate as "0"', async () => {
      const metricsData = createMetricsState([
        { component: "test", metric: "counter", value: 100, rate: 0 },
      ]);

      mockStoreState.set({
        ...createDefaultState(),
        connected: true,
        ...metricsData,
      });

      render(MetricsTab, { flowId: "test-flow", isActive: true });

      await waitFor(() => {
        // Rate column should show "0"
        const rows = screen.getAllByTestId("metrics-row");
        expect(rows[0]).toHaveTextContent("0");
      });
    });

    it('should show very small rates as "<0.01"', async () => {
      const metricsData = createMetricsState([
        { component: "test", metric: "counter", value: 100, rate: 0.001 },
      ]);

      mockStoreState.set({
        ...createDefaultState(),
        connected: true,
        ...metricsData,
      });

      render(MetricsTab, { flowId: "test-flow", isActive: true });

      await waitFor(() => {
        expect(screen.getByText("<0.01")).toBeTruthy();
      });
    });
  });

  describe("Last Updated Timestamp", () => {
    it("should show last updated timestamp when metrics exist", async () => {
      const metricsData = createMetricsState([
        { component: "test", metric: "messages_total", value: 100, rate: 10 },
      ]);

      mockStoreState.set({
        ...createDefaultState(),
        connected: true,
        ...metricsData,
      });

      render(MetricsTab, { flowId: "test-flow", isActive: true });

      await waitFor(() => {
        expect(screen.getByTestId("last-updated")).toBeTruthy();
      });
    });

    it("should not show last updated when no metrics timestamp", async () => {
      mockStoreState.set({
        ...createDefaultState(),
        connected: true,
        lastMetricsTimestamp: null,
      });

      render(MetricsTab, { flowId: "test-flow", isActive: true });

      expect(screen.queryByTestId("last-updated")).toBeNull();
    });
  });

  describe("Filtering", () => {
    it("should filter metrics by component name", async () => {
      const metricsData = createMetricsState([
        {
          component: "udp-input",
          metric: "packets_total",
          value: 100,
          rate: 10,
        },
        {
          component: "processor",
          metric: "messages_total",
          value: 200,
          rate: 20,
        },
        {
          component: "objectstore",
          metric: "cache_hits",
          value: 300,
          rate: 30,
        },
      ]);

      mockStoreState.set({
        ...createDefaultState(),
        connected: true,
        ...metricsData,
      });

      render(MetricsTab, { flowId: "test-flow", isActive: true });

      const filterInput = screen.getByTestId("metrics-filter");
      await filterInput.focus();
      await filterInput.dispatchEvent(new Event("input", { bubbles: true }));

      // Type in filter
      (filterInput as HTMLInputElement).value = "udp";
      filterInput.dispatchEvent(new Event("input", { bubbles: true }));

      await waitFor(() => {
        const rows = screen.getAllByTestId("metrics-row");
        expect(rows).toHaveLength(1);
        expect(rows[0]).toHaveTextContent("udp-input");
      });
    });

    it("should filter metrics by metric name", async () => {
      const metricsData = createMetricsState([
        {
          component: "comp1",
          metric: "cache_hits_total",
          value: 100,
          rate: 10,
        },
        {
          component: "comp2",
          metric: "messages_received",
          value: 200,
          rate: 20,
        },
        {
          component: "comp3",
          metric: "cache_misses_total",
          value: 300,
          rate: 30,
        },
      ]);

      mockStoreState.set({
        ...createDefaultState(),
        connected: true,
        ...metricsData,
      });

      render(MetricsTab, { flowId: "test-flow", isActive: true });

      const filterInput = screen.getByTestId(
        "metrics-filter",
      ) as HTMLInputElement;
      filterInput.value = "cache";
      filterInput.dispatchEvent(new Event("input", { bubbles: true }));

      await waitFor(() => {
        const rows = screen.getAllByTestId("metrics-row");
        expect(rows).toHaveLength(2);
      });
    });

    it("should show filtered count when filtering", async () => {
      const metricsData = createMetricsState([
        { component: "a", metric: "m1", value: 1, rate: 1 },
        { component: "b", metric: "m2", value: 2, rate: 2 },
        { component: "b", metric: "m3", value: 3, rate: 3 },
      ]);

      mockStoreState.set({
        ...createDefaultState(),
        connected: true,
        ...metricsData,
      });

      render(MetricsTab, { flowId: "test-flow", isActive: true });

      const filterInput = screen.getByTestId(
        "metrics-filter",
      ) as HTMLInputElement;
      filterInput.value = "b";
      filterInput.dispatchEvent(new Event("input", { bubbles: true }));

      await waitFor(() => {
        expect(screen.getByTestId("metrics-count")).toHaveTextContent("2 of 3");
      });
    });

    it("should show empty state when filter matches nothing", async () => {
      const metricsData = createMetricsState([
        { component: "test", metric: "counter", value: 100, rate: 10 },
      ]);

      mockStoreState.set({
        ...createDefaultState(),
        connected: true,
        ...metricsData,
      });

      render(MetricsTab, { flowId: "test-flow", isActive: true });

      const filterInput = screen.getByTestId(
        "metrics-filter",
      ) as HTMLInputElement;
      filterInput.value = "nonexistent";
      filterInput.dispatchEvent(new Event("input", { bubbles: true }));

      await waitFor(() => {
        expect(screen.getByText(/No metrics match/)).toBeTruthy();
      });
    });
  });

  describe("Sorting", () => {
    it("should sort by component name by default", async () => {
      const metricsData = createMetricsState([
        { component: "zebra", metric: "m1", value: 1, rate: 1 },
        { component: "alpha", metric: "m2", value: 2, rate: 2 },
        { component: "beta", metric: "m3", value: 3, rate: 3 },
      ]);

      mockStoreState.set({
        ...createDefaultState(),
        connected: true,
        ...metricsData,
      });

      render(MetricsTab, { flowId: "test-flow", isActive: true });

      await waitFor(() => {
        const rows = screen.getAllByTestId("metrics-row");
        expect(rows[0]).toHaveTextContent("alpha");
        expect(rows[1]).toHaveTextContent("beta");
        expect(rows[2]).toHaveTextContent("zebra");
      });
    });

    it("should have sortable column headers", async () => {
      const metricsData = createMetricsState([
        { component: "test", metric: "counter", value: 100, rate: 10 },
      ]);

      mockStoreState.set({
        ...createDefaultState(),
        connected: true,
        ...metricsData,
      });

      render(MetricsTab, { flowId: "test-flow", isActive: true });

      await waitFor(() => {
        const headers = screen.getAllByRole("columnheader");
        headers.forEach((header) => {
          expect(header.classList.contains("sortable")).toBe(true);
        });
      });
    });

    it("should have aria-sort attributes on headers", async () => {
      const metricsData = createMetricsState([
        { component: "test", metric: "counter", value: 100, rate: 10 },
      ]);

      mockStoreState.set({
        ...createDefaultState(),
        connected: true,
        ...metricsData,
      });

      render(MetricsTab, { flowId: "test-flow", isActive: true });

      await waitFor(() => {
        const headers = screen.getAllByRole("columnheader");
        // First column (Component) should be ascending by default
        expect(headers[0].getAttribute("aria-sort")).toBe("ascending");
      });
    });
  });

  describe("Accessibility", () => {
    it("should have proper table structure", async () => {
      const metricsData = createMetricsState([
        { component: "test", metric: "messages_total", value: 100, rate: 10 },
      ]);

      mockStoreState.set({
        ...createDefaultState(),
        connected: true,
        ...metricsData,
      });

      render(MetricsTab, { flowId: "test-flow", isActive: true });

      await waitFor(() => {
        const table = screen.getByRole("table");
        expect(table).toBeTruthy();
      });
    });

    it("should have column headers with scope attributes", async () => {
      const metricsData = createMetricsState([
        { component: "test", metric: "messages_total", value: 100, rate: 10 },
      ]);

      mockStoreState.set({
        ...createDefaultState(),
        connected: true,
        ...metricsData,
      });

      render(MetricsTab, { flowId: "test-flow", isActive: true });

      await waitFor(() => {
        const headers = screen.getAllByRole("columnheader");
        expect(headers).toHaveLength(4); // Component, Metric, Value, Rate/sec
        headers.forEach((header) => {
          expect(header.getAttribute("scope")).toBe("col");
        });
      });
    });

    it("should have accessible error alerts", async () => {
      mockStoreState.set({
        ...createDefaultState(),
        connected: false,
        error: "Connection failed",
      });

      render(MetricsTab, { flowId: "test-flow", isActive: true });

      await waitFor(() => {
        const alert = screen.getByRole("alert");
        expect(alert).toBeTruthy();
      });
    });

    it("should have table with aria-label", async () => {
      const metricsData = createMetricsState([
        { component: "test", metric: "messages_total", value: 100, rate: 10 },
      ]);

      mockStoreState.set({
        ...createDefaultState(),
        connected: true,
        ...metricsData,
      });

      render(MetricsTab, { flowId: "test-flow", isActive: true });

      await waitFor(() => {
        const table = screen.getByRole("table");
        expect(table.getAttribute("aria-label")).toBe("Component metrics");
      });
    });
  });
});
