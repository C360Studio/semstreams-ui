import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import GraphFilters from "./GraphFilters.svelte";
import { DEFAULT_GRAPH_FILTERS } from "$lib/types/graph";
import { buildGraphEntity } from "$lib/stores/graphStore.svelte";

describe("GraphFilters search results", () => {
  it("renders filtered entities as selectable search results", async () => {
    const user = userEvent.setup();
    const onEntitySelect = vi.fn();
    const entity = buildGraphEntity({
      id: "e2e.semsource.golang.data-fixture.function.src-main-go-main",
    });

    render(GraphFilters, {
      props: {
        filters: { ...DEFAULT_GRAPH_FILTERS, search: "main" },
        availableTypes: ["function"],
        availableDomains: ["golang"],
        searchResults: [entity],
        selectedEntityId: null,
        onFilterChange: vi.fn(),
        onEntitySelect,
        onReset: vi.fn(),
      },
    });

    const result = screen.getByTestId("entity-search-result");
    expect(result).toHaveAttribute("data-entity-id", entity.id);
    expect(result).toHaveTextContent("src-main-go-main");
    expect(result).toHaveTextContent("golang / function");

    await user.click(result);

    expect(onEntitySelect).toHaveBeenCalledOnce();
    expect(onEntitySelect).toHaveBeenCalledWith(entity.id);
  });

  it("shows an empty search result state when a search has no matches", () => {
    render(GraphFilters, {
      props: {
        filters: { ...DEFAULT_GRAPH_FILTERS, search: "missing" },
        availableTypes: [],
        availableDomains: [],
        searchResults: [],
        onFilterChange: vi.fn(),
        onReset: vi.fn(),
      },
    });

    expect(screen.getByTestId("entity-search-empty")).toHaveTextContent(
      "No matching entities",
    );
  });
});
