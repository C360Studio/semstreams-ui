import { render, screen, within } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import GraphOverviewPanel from "./GraphOverviewPanel.svelte";
import type { GraphEntity } from "$lib/types/graph";
import { parseEntityId } from "$lib/types/graph";
import type { OpsGraphOverview } from "$lib/types/opsConsole";

function makeEntity(id: string): GraphEntity {
  return {
    id,
    idParts: parseEntityId(id),
    properties: [],
    outgoing: [],
    incoming: [],
  };
}

function makeOverview(
  overrides: Partial<OpsGraphOverview> = {},
): OpsGraphOverview {
  return {
    entityCount: 12,
    relationshipCount: 7,
    filteredEntityCount: 8,
    filteredRelationshipCount: 4,
    activeFilterCount: 2,
    selectedEntity: makeEntity("c360.source.repo.main.function.parseConfig"),
    loading: false,
    error: null,
    connected: true,
    ...overrides,
  };
}

describe("GraphOverviewPanel", () => {
  it("renders graph counts, filtered counts, and selected entity context", () => {
    render(GraphOverviewPanel, {
      props: {
        overview: makeOverview(),
      },
    });

    const panel = screen.getByTestId("graph-overview-panel");
    expect(within(panel).getByText("Available")).toBeVisible();
    expect(within(panel).getByText("12")).toBeVisible();
    expect(within(panel).getByText("7")).toBeVisible();
    expect(within(panel).getByText("8 shown")).toBeVisible();
    expect(within(panel).getByText("4 shown")).toBeVisible();
    expect(within(panel).getByText("2 active")).toBeVisible();
    expect(within(panel).getByText("parseConfig")).toBeVisible();
    expect(
      within(panel).getByText("c360.source.repo.main.function.parseConfig"),
    ).toBeVisible();
  });

  it("calls frontend-only clear and reset callbacks", async () => {
    const user = userEvent.setup();
    const onClearSelection = vi.fn();
    const onResetFilters = vi.fn();

    render(GraphOverviewPanel, {
      props: {
        overview: makeOverview(),
        onClearSelection,
        onResetFilters,
      },
    });

    await user.click(
      screen.getByRole("button", { name: /clear graph selection/i }),
    );
    await user.click(
      screen.getByRole("button", { name: /reset graph filters/i }),
    );

    expect(onClearSelection).toHaveBeenCalledOnce();
    expect(onResetFilters).toHaveBeenCalledOnce();
  });

  it("renders loading, empty, and error states", async () => {
    const { rerender } = render(GraphOverviewPanel, {
      props: {
        overview: makeOverview({
          loading: true,
          connected: false,
          selectedEntity: null,
          entityCount: 0,
          relationshipCount: 0,
          filteredEntityCount: 0,
          filteredRelationshipCount: 0,
          activeFilterCount: 0,
        }),
      },
    });

    expect(screen.getByText("Loading")).toBeVisible();
    expect(screen.getByText("No entity selected")).toBeVisible();

    await rerender({
      overview: makeOverview({
        loading: false,
        connected: false,
        error: "Unable to connect to graph service",
        selectedEntity: null,
        entityCount: 0,
        relationshipCount: 0,
        filteredEntityCount: 0,
        filteredRelationshipCount: 0,
        activeFilterCount: 0,
      }),
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Unable to connect to graph service",
    );

    await rerender({
      overview: makeOverview({
        selectedEntity: null,
        entityCount: 0,
        relationshipCount: 0,
        filteredEntityCount: 0,
        filteredRelationshipCount: 0,
        activeFilterCount: 0,
      }),
    });

    expect(screen.getByText("Empty")).toBeVisible();
  });

  it("does not render backend mutation or product judgment controls", () => {
    render(GraphOverviewPanel, {
      props: {
        overview: makeOverview(),
      },
    });

    expect(
      screen.queryByRole("button", {
        name: /create|update|delete|approve|retry|classify|score/i,
      }),
    ).toBeNull();
  });
});
