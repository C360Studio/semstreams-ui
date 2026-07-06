import { expect, test } from "@playwright/test";

const SCHEDULER_ENTITY_ID = "c360.ops.source.opsprofile.function.scheduler";
const LOOP_ID = "loop-ops-profile-001";

test.describe("Ops profile owned E2E gate", () => {
  test("loads ops console, selects graph entity, and inspects trajectory", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.locator('[data-testid="ops-console-shell"]')).toBeVisible(
      { timeout: 10000 },
    );
    await expect(page.locator('[data-testid="ops-area-graph"]')).toContainText(
      "Available",
      { timeout: 10000 },
    );
    await expect(page.locator('[data-testid="ops-area-search"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="ops-area-runtime"]'),
    ).toContainText("Running");
    await expect(page.locator('[data-testid="ops-area-source"]')).toContainText(
      "Healthy",
    );

    await expect(page.locator('[data-testid="ops-admin-panel"]')).toContainText(
      "Generic backend, graph, and runtime read paths are reachable",
    );
    await expect(
      page.locator('[data-testid="trajectory-inspector"]'),
    ).toContainText(LOOP_ID);
    await expect(
      page.locator('[data-testid="ops-search-panel"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="graph-overview-panel"]'),
    ).toContainText("Available");
    await expect(page.locator('[data-testid="data-view"]')).toBeVisible();
    await expect(page.locator('[data-testid="sigma-canvas"]')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator(".loading-overlay")).not.toBeVisible({
      timeout: 10000,
    });

    const overview = page.locator('[data-testid="graph-overview-panel"]');
    await expect(overview).toContainText("Entities");
    await expect(overview).toContainText("4");

    await page.locator("#ops-entity-search").fill(SCHEDULER_ENTITY_ID);
    await page.getByRole("button", { name: "Search entities" }).click();

    const result = page.getByRole("button", {
      name: `Select entity ${SCHEDULER_ENTITY_ID}`,
    });
    await expect(result).toBeVisible({ timeout: 10000 });
    await result.click();

    await expect(
      page.locator('[data-testid="graph-detail-panel"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="graph-detail-panel"]'),
    ).toContainText("scheduler");
    await expect(overview).toContainText(SCHEDULER_ENTITY_ID);
    await expect(page.locator('[data-testid="sigma-canvas"]')).toBeVisible();

    await page
      .getByRole("button", { name: `Inspect trajectory ${LOOP_ID}` })
      .click();
    await expect(
      page.locator('[data-testid="trajectory-detail-panel"]'),
    ).toContainText("ops-profile-dashboard", { timeout: 10000 });
    await expect(
      page.locator('[data-testid="trajectory-detail-panel"]'),
    ).toContainText("Rendered operator trajectory summary");
  });
});
