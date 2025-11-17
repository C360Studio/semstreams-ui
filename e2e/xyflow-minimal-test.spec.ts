import { test, expect } from '@playwright/test';

test.describe('XYFlow Minimal Test', () => {
	test('should render edge in minimal example', async ({ page }) => {
		// Enable console logging
		page.on('console', msg => {
			if (msg.type() === 'log' || msg.type() === 'error') {
				console.log(`[BROWSER ${msg.type()}]`, msg.text());
			}
		});

		// Navigate to test page
		await page.goto('http://localhost/test-xyflow');
		await page.waitForLoadState('networkidle');

		// Wait for XYFlow to initialize and for delayed edges to be added
		await page.waitForTimeout(2000);

		// Check if nodes are rendered
		const nodes = page.locator('.svelte-flow__node');
		const nodeCount = await nodes.count();
		console.log('[TEST] Node count:', nodeCount);
		expect(nodeCount).toBe(4);  // 2 without handles, 2 with handles

		// Check if edge container exists
		const edgeContainer = page.locator('.svelte-flow__edges');
		const containerCount = await edgeContainer.count();
		console.log('[TEST] Edge container count:', containerCount);
		expect(containerCount).toBe(1);

		// Check if edge is rendered
		const edgePaths = page.locator('.svelte-flow__edge path');
		const edgeCount = await edgePaths.count();
		console.log('[TEST] Edge path count:', edgeCount);

		// Debug: Show edge container HTML
		const edgeHTML = await edgeContainer.innerHTML();
		console.log('[TEST] Edge container HTML:', edgeHTML.substring(0, 500));

		// This should pass if XYFlow is working
		expect(edgeCount).toBeGreaterThan(0);
	});
});
