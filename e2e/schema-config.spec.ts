import { test, expect } from "@playwright/test";
import { FlowListPage } from "./pages/FlowListPage";
import { FlowCanvasPage } from "./pages/FlowCanvasPage";
import { ComponentPalettePage } from "./pages/ComponentPalettePage";
import { ConfigPanelPage } from "./pages/ConfigPanelPage";

/**
 * E2E Tests for Component Schema Support (Schema Tag System)
 *
 * These tests validate the schema-driven configuration UI end-to-end,
 * from backend schema API to frontend form rendering.
 *
 * After the D3 canvas refactor, configuration is done via EditComponentModal
 * accessed by clicking the Edit (⚙️) button in the sidebar.
 */

test.describe.skip("Schema-Driven Configuration", () => {
  let flowList: FlowListPage;
  let canvas: FlowCanvasPage;
  let palette: ComponentPalettePage;
  let configPanel: ConfigPanelPage;

  test.beforeEach(async ({ page }) => {
    // Initialize Page Object Models
    flowList = new FlowListPage(page);
    canvas = new FlowCanvasPage(page);
    palette = new ComponentPalettePage(page);
    configPanel = new ConfigPanelPage(page);

    // Navigate to flow list and create new flow
    await flowList.goto();
    await page.waitForLoadState("networkidle");

    // Create a new flow
    await flowList.clickCreateNewFlow();
    await page.waitForURL(/\/flows\/.+/);

    // Wait for canvas to load
    await canvas.expectCanvasLoaded();
  });

  // Schema form rendering (general test)
  test("should display schema-driven form for UDP component", async ({
    page,
  }) => {
    // Add UDP component to flow
    await palette.addComponentToCanvas("UDP Input");

    // Wait for component to be added
    await canvas.expectNodeCount(1);

    // Click Edit button in sidebar to open config modal
    const nodeName = await canvas.getFirstNodeName();
    await canvas.clickEditButton(nodeName);

    // Wait for config modal to open
    await configPanel.expectPanelVisible();

    // Should display schema-driven form (not JSON editor)
    await configPanel.expectSchemaFormVisible();

    // UDP now uses PortConfigEditor (type:ports), not flat fields
    await configPanel.expectPortConfigEditorVisible();
  });

  // Basic Configuration section rendering
  test("should render Basic Configuration section", async ({ page }) => {
    // Add UDP component
    await palette.addComponentToCanvas("UDP Input");
    await canvas.expectNodeCount(1);

    // Click Edit button in sidebar to open config modal
    const nodeName = await canvas.getFirstNodeName();
    await canvas.clickEditButton(nodeName);

    // Wait for config modal to open
    await configPanel.expectPanelVisible();

    // Should have Basic Configuration section
    await configPanel.expectBasicSectionVisible();

    // Ports field should be in Basic section (category:basic in schema)
    const portsInBasic = configPanel.basicConfigSection.locator(
      ".port-config-editor",
    );
    await expect(portsInBasic).toBeVisible();
  });

  // General schema feature tests (independent of specific component schemas)

  test("should render enum field as dropdown", async () => {
    // Note: Skipped until we have a component with enum fields
    test.skip(true, "No components with enum fields available yet");
  });

  test("should show JSON editor fallback for component without schema", async () => {
    // Note: Skipped since all current components have schemas
    test.skip(true, "All components currently have schemas");
  });

  // NOTE: The following tests were removed as they tested flat fields (port, bind, subject):
  // - "should prevent save with validation errors"
  // - "should successfully save valid configuration"
  // - "should display required field markers"
  // - "should show debounced real-time validation"
  //
  // Port-based validation and configuration tests are in port-configuration.spec.ts
});
