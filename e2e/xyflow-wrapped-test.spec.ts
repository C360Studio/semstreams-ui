import { test, expect } from '@playwright/test';

test.describe('XYFlow Wrapped Test (with $bindable)', () => {
	test('should render edges through wrapped component', async ({ page }) => {
		page.on('console', msg => {
			if (msg.type() === 'log' || msg.type() === 'error') {
				console.log(`[BROWSER ${msg.type()}]`, msg.text());
			}
		});

		await page.goto('http://localhost/test-xyflow-wrapped');
		await page.waitForLoadState('networkidle');

		// Wait for edges to be added
		await page.waitForTimeout(2000);

		const nodes = page.locator('.svelte-flow__node');
		const nodeCount = await nodes.count();
		console.log('[TEST] Node count:', nodeCount);
		expect(nodeCount).toBe(4);

		const edgeContainer = page.locator('.svelte-flow__edges');
		const edgeHTML = await edgeContainer.innerHTML();
		console.log('[TEST] Edge container HTML:', edgeHTML.substring(0, 500));

		const edgePaths = page.locator('.svelte-flow__edge path');
		const edgeCount = await edgePaths.count();
		console.log('[TEST] Edge path count:', edgeCount);

		expect(edgeCount).toBeGreaterThan(0);
	});
});
