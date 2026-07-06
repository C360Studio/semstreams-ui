import { expect, test, type Locator, type Page } from "@playwright/test";

const SCHEDULER_ENTITY_ID = "c360.ops.source.opsprofile.function.scheduler";
const LOOP_ID = "loop-ops-profile-001";
const MOBILE_VIEWPORT = { width: 390, height: 844 };

async function expectInFirstViewport(
  locator: Locator,
  viewportHeight: number,
  minimumVisibleHeight: number,
) {
  await expect(locator).toBeVisible({ timeout: 10000 });

  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box?.y ?? Number.POSITIVE_INFINITY).toBeLessThan(viewportHeight);
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(minimumVisibleHeight);
}

async function degradeGenericReadPaths(page: Page) {
  await page.route(/\/graphql$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        errors: [{ message: "ops-profile graph degraded" }],
      }),
    });
  });

  await page.route(/\/trajectories\?limit=5$/, async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "trajectory summary degraded" }),
    });
  });

  await page.route(
    /\/flowbuilder\/flows\/[^/]+\/runtime\/messages\?limit=1$/,
    async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "runtime messages degraded" }),
      });
    },
  );
}

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
    const matrix = page.locator('[data-testid="ops-readiness-matrix"]');
    await expect(matrix).toBeVisible();
    await expect(matrix).toContainText("Backend health");
    await expect(matrix).toContainText("/health");
    await expect(matrix).toContainText("Graph query");
    await expect(matrix).toContainText("/graphql");
    await expect(matrix).toContainText("Flow list");
    await expect(matrix).toContainText("/flowbuilder/flows");
    await expect(matrix).toContainText("Runtime health");
    await expect(matrix).toContainText("Trajectory summary");
    await expect(matrix).toContainText("/trajectories?limit=5");
    await expect(matrix).toContainText("Source readiness");
    await expect(matrix).toContainText("generic-read-path");
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

  test("keeps graph usable first on a narrow viewport", async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto("/");

    await expect(page.locator('[data-testid="ops-console-shell"]')).toBeVisible(
      { timeout: 10000 },
    );
    await expect(page.locator('[data-testid="ops-area-graph"]')).toContainText(
      "Available",
      { timeout: 10000 },
    );

    await expectInFirstViewport(
      page.locator('[data-testid="data-view"]'),
      MOBILE_VIEWPORT.height,
      300,
    );
    await expect(page.locator('[data-testid="sigma-canvas"]')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator(".loading-overlay")).not.toBeVisible({
      timeout: 10000,
    });

    const admin = page.locator('[data-testid="ops-admin-panel"]');
    await admin.scrollIntoViewIfNeeded();
    await expect(admin).toBeVisible();

    const matrix = page.locator('[data-testid="ops-readiness-matrix"]');
    await expect(matrix).toBeVisible();
    await expect(matrix).toContainText("Flow list");
    await expect(matrix).toContainText("/flowbuilder/flows");
  });

  test("keeps ops shell usable when generic read paths degrade", async ({
    page,
  }) => {
    await degradeGenericReadPaths(page);
    await page.goto("/");

    await expect(page.locator('[data-testid="ops-console-shell"]')).toBeVisible(
      { timeout: 10000 },
    );
    await expect(page.locator('[data-testid="ops-area-graph"]')).toContainText(
      "Unavailable",
      { timeout: 10000 },
    );
    await expect(
      page.locator('[data-testid="ops-area-runtime"]'),
    ).toContainText("Running");
    await expect(page.locator('[data-testid="ops-area-source"]')).toContainText(
      "Degraded",
    );

    await expect(
      page.locator('[data-testid="data-view"]').getByRole("alert"),
    ).toContainText("ops-profile graph degraded", { timeout: 10000 });
    await expect(
      page.getByRole("navigation", { name: "Ops console" }),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="ops-admin-panel"]'),
    ).toBeVisible();

    const matrix = page.locator('[data-testid="ops-readiness-matrix"]');
    await expect(matrix).toBeVisible();
    await expect(
      page.locator('[data-testid="ops-readiness-row-backend-health"]'),
    ).toContainText("Healthy");
    await expect(
      page.locator('[data-testid="ops-readiness-row-flow-list"]'),
    ).toContainText("Healthy");
    await expect(
      page.locator('[data-testid="ops-readiness-row-graph-query"]'),
    ).toContainText("ops-profile graph degraded");
    await expect(
      page.locator('[data-testid="ops-readiness-row-graph-query"]'),
    ).toContainText("HTTP 200");
    await expect(
      page.locator('[data-testid="ops-readiness-row-trajectory-summary"]'),
    ).toContainText("Trajectories failed: Service Unavailable");
    await expect(
      page.locator('[data-testid="ops-readiness-row-trajectory-summary"]'),
    ).toContainText("HTTP 503");
    await expect(
      page.locator('[data-testid="ops-readiness-row-runtime-messages"]'),
    ).toContainText("Runtime messages failed: Service Unavailable");
    await expect(
      page.locator('[data-testid="ops-readiness-row-runtime-messages"]'),
    ).toContainText("HTTP 503");
    await expect(
      page.locator('[data-testid="ops-readiness-row-source-readiness"]'),
    ).toContainText("One or more generic ops read paths are degraded");
  });
});
