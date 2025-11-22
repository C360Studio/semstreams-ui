import { test } from '@playwright/test';
import { FlowCanvasPage } from './pages/FlowCanvasPage';
import { ComponentPalettePage } from './pages/ComponentPalettePage';
import { ConfigPanelPage } from './pages/ConfigPanelPage';
import { FlowListPage } from './pages/FlowListPage';

/**
 * Component Configuration E2E Tests
 *
 * IMPORTANT: These tests verify the click handler and ConfigPanel opening.
 * For port-based configuration tests, see port-configuration.spec.ts
 */

test.describe('Component Configuration', () => {
	test('Scenario: Click component → Config panel opens', async ({ page }) => {
		// Navigate to flow list
		const flowList = new FlowListPage(page);
		await flowList.goto();
		await page.waitForLoadState('networkidle');

		// Create new flow
		await flowList.clickCreateNewFlow();
		await page.waitForURL(/\/flows\/.+/);

		// Wait for canvas to load
		const canvas = new FlowCanvasPage(page);
		await canvas.expectCanvasLoaded();

		// Add a component to the canvas
		const palette = new ComponentPalettePage(page);
		await palette.dragComponentToCanvas('UDP Input', 200, 200);
		await page.waitForTimeout(500);

		// Verify config panel is initially hidden
		const configPanel = new ConfigPanelPage(page);
		await configPanel.expectPanelHidden();

		// Click the component node
		const node = canvas.nodes.first();
		await node.click();

		// Verify config panel opens
		await configPanel.expectPanelVisible();

		// Verify panel shows component info
		// Note: ConfigPanel displays "Configure: <type>" format, not component name
		await configPanel.expectComponentTitle('Configure: udp');
	});

	// NOTE: Scenarios 10 & 11 removed - they tested flat fields (port, bind, subject)
	// which were replaced by PortConfigEditor in the schema tag system migration.
	// See port-configuration.spec.ts for port-based configuration tests.
});
