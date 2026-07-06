/**
 * Ops Console - SemSource Acceptance E2E Tests
 *
 * Validates the graph-first homepage path against real SemSource fixture
 * entities. This covers the operator journey from landing on the ops console
 * through selecting a search result into the entity detail panel.
 */

import { test, expect } from "@playwright/test";
import {
  KNOWN_ENTITIES,
  waitForSemsourceEntities,
} from "./helpers/semsource-helpers";

test.describe("Ops Console - SemSource Acceptance", () => {
  test("homepage graph landing selects a fixture entity from search results", async ({
    page,
  }) => {
    await waitForSemsourceEntities(page, 3);

    await page.goto("/");

    await expect(page.locator('[data-testid="ops-console-shell"]')).toBeVisible(
      { timeout: 10000 },
    );
    await expect(page.locator('[data-testid="ops-area-graph"]')).toBeVisible();
    await expect(page.locator('[data-testid="ops-area-search"]')).toBeVisible();
    await expect(page.locator('[data-testid="data-view"]')).toBeVisible();
    await expect(page.locator('[data-testid="sigma-canvas"]')).toBeVisible({
      timeout: 10000,
    });
    await page
      .locator(".loading-overlay")
      .waitFor({ state: "hidden", timeout: 10000 });

    await page
      .locator('[data-testid="entity-search"]')
      .fill("src-main-go-main");

    const searchResult = page.locator(
      `[data-testid="entity-search-result"][data-entity-id="${KNOWN_ENTITIES.mainFunc}"]`,
    );
    await expect(searchResult).toBeVisible({ timeout: 10000 });
    await expect(searchResult).toContainText("src-main-go-main");

    await searchResult.click();

    const detailPanel = page.locator('[data-testid="graph-detail-panel"]');
    await expect(detailPanel).toBeVisible({ timeout: 5000 });
    await expect(detailPanel).toContainText("src-main-go-main");
    await expect(detailPanel).toContainText("function");

    await expect(page.locator('[data-testid="sigma-canvas"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="ops-console-shell"]'),
    ).toBeVisible();
  });
});
