import { render, screen, waitFor, within } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import OpsSearchPanel from "./OpsSearchPanel.svelte";
import type { GraphEntity } from "$lib/types/graph";
import { parseEntityId } from "$lib/types/graph";

function makeEntity(id: string): GraphEntity {
  return {
    id,
    idParts: parseEntityId(id),
    properties: [
      {
        predicate: "source.name",
        object: id.split(".").at(-1) ?? id,
        confidence: 1,
        source: "test",
        timestamp: 0,
      },
    ],
    outgoing: [],
    incoming: [],
  };
}

describe("OpsSearchPanel", () => {
  it("searches entities and renders selectable results", async () => {
    const user = userEvent.setup();
    const results = [
      makeEntity("c360.source.repo.main.function.parseConfig"),
      makeEntity("c360.source.repo.main.document.readme"),
    ];
    const searchEntities = vi.fn().mockResolvedValue(results);
    const onEntitySelect = vi.fn();

    render(OpsSearchPanel, {
      props: {
        searchEntities,
        onEntitySelect,
      },
    });

    await user.type(
      screen.getByRole("searchbox", { name: /search graph entities/i }),
      "c360.source.repo",
    );
    await user.click(screen.getByRole("button", { name: /search entities/i }));

    await waitFor(() => {
      expect(searchEntities).toHaveBeenCalledWith("c360.source.repo", 8);
    });

    const panel = screen.getByTestId("ops-search-panel");
    expect(within(panel).getByText("2 results")).toBeVisible();
    expect(within(panel).getByText("parseConfig")).toBeVisible();
    expect(within(panel).getByText("repo / function")).toBeVisible();

    await user.click(
      within(panel).getByRole("button", {
        name: /select entity c360\.source\.repo\.main\.function\.parseconfig/i,
      }),
    );

    expect(onEntitySelect).toHaveBeenCalledWith(results[0]);
  });

  it("renders an empty result state for valid searches with no matches", async () => {
    const user = userEvent.setup();
    const searchEntities = vi.fn().mockResolvedValue([]);

    render(OpsSearchPanel, {
      props: {
        searchEntities,
      },
    });

    await user.type(
      screen.getByRole("searchbox", { name: /search graph entities/i }),
      "missing.entity",
    );
    await user.keyboard("{Enter}");

    expect(await screen.findByText("No matching entities")).toBeVisible();
    expect(screen.getByText(/Try another entity prefix/i)).toBeVisible();
  });

  it("keeps search errors local to the panel", async () => {
    const user = userEvent.setup();
    const searchEntities = vi
      .fn()
      .mockRejectedValue(new Error("GraphQL unavailable"));

    render(OpsSearchPanel, {
      props: {
        searchEntities,
      },
    });

    await user.type(
      screen.getByRole("searchbox", { name: /search graph entities/i }),
      "c360.source",
    );
    await user.click(screen.getByRole("button", { name: /search entities/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "GraphQL unavailable",
    );
    expect(screen.getByTestId("ops-search-panel")).toBeVisible();
  });

  it("does not render mutation or judgment controls", async () => {
    const user = userEvent.setup();
    const searchEntities = vi
      .fn()
      .mockResolvedValue([makeEntity("c360.source.repo.main.config.app")]);

    render(OpsSearchPanel, {
      props: {
        searchEntities,
      },
    });

    await user.type(
      screen.getByRole("searchbox", { name: /search graph entities/i }),
      "c360.source",
    );
    await user.keyboard("{Enter}");
    await screen.findByText("app");

    expect(
      screen.queryByRole("button", {
        name: /create|update|delete|approve|retry|classify|score/i,
      }),
    ).toBeNull();
  });
});
