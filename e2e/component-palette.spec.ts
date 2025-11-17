import { expect, test } from '@playwright/test';
import { FlowCanvasPage } from './pages/FlowCanvasPage';
import { ComponentPalettePage } from './pages/ComponentPalettePage';
import { FlowListPage } from './pages/FlowListPage';

/**
 * Component Palette E2E Tests
 * Tests scenarios 4-5 from spec.md
 */

test.describe('Component Palette', () => {
	test('Scenario 4: View canvas → See component palette with 7 types', async ({ page }) => {
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

		// Verify component palette is visible
		const palette = new ComponentPalettePage(page);
		await palette.expectPaletteVisible();

		// Verify all 7 component types are present
		// Input types
		await palette.expectComponentInPalette('UDP Input');

		// Processor types
		await palette.expectComponentInPalette('Robotics Processor');
		await palette.expectComponentInPalette('Graph Processor');
		await palette.expectComponentInPalette('Rule Processor');
		await palette.expectComponentInPalette('Context Processor');

		// Output types
		await palette.expectComponentInPalette('WebSocket Output');

		// Storage types
		await palette.expectComponentInPalette('Object Store');

		// Verify total component count (at least 7)
		const componentCount = await palette.componentCards.count();
		expect(componentCount).toBeGreaterThanOrEqual(7);
	});

	test('Scenario 5: Check categories → See Input, Output, Processor, Storage groups', async ({ page }) => {
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

		// Verify palette is visible
		const palette = new ComponentPalettePage(page);
		await palette.expectPaletteVisible();

		// Verify all 4 categories are present (categories are lowercase in HTML)
		await palette.expectCategoryVisible('input');
		await palette.expectCategoryVisible('output');
		await palette.expectCategoryVisible('processor');
		await palette.expectCategoryVisible('storage');

		// Verify categories can be expanded/collapsed
		// (Optional: Click to expand/collapse if implemented)
		// await palette.clickCategory('Input');
		// await palette.expectCategoryExpanded('Input');
	});
});
