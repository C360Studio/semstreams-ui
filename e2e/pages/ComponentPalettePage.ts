import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for the Component Palette panel
 * Encapsulates interactions with the component browser/palette
 */
export class ComponentPalettePage {
	constructor(private page: Page) {}

	// Locators
	get palette(): Locator {
		return this.page.locator('.component-palette');
	}

	get componentCards(): Locator {
		return this.page.locator('.component-card');
	}

	get categories(): Locator {
		return this.page.locator('.category');
	}

	get searchInput(): Locator {
		return this.page.locator('input[placeholder*="Search"]');
	}

	// Actions
	getComponentByName(name: string): Locator {
		return this.page.locator(`.component-card:has-text("${name}")`);
	}

	getCategoryByName(name: string): Locator {
		// Match category header specifically to avoid matching component card text
		return this.page.locator(`.category-header:has-text("${name}")`);
	}

	async clickComponent(name: string): Promise<void> {
		const component = this.getComponentByName(name);
		await component.click();
	}

	/**
	 * Drag component to canvas (legacy method - has Playwright limitations)
	 * Note: Playwright's dragTo() doesn't trigger HTML5 drop events properly.
	 * Prefer addComponentToCanvas() for more reliable testing.
	 */
	async dragComponentToCanvas(componentName: string, x: number, y: number): Promise<void> {
		const component = this.getComponentByName(componentName);
		const canvas = this.page.locator('#flow-canvas');

		await component.dragTo(canvas, {
			targetPosition: { x, y }
		});
	}

	/**
	 * Add component to canvas via double-click (preferred method)
	 * This adds the component to canvas center and is more reliable than drag-and-drop.
	 */
	async addComponentToCanvas(componentName: string): Promise<void> {
		const component = this.getComponentByName(componentName);
		await component.dblclick();
	}

	/**
	 * Add component to canvas via keyboard (accessibility testing)
	 * This simulates pressing Enter on the component card.
	 */
	async addComponentToCanvasViaKeyboard(componentName: string): Promise<void> {
		const component = this.getComponentByName(componentName);
		await component.focus();
		await this.page.keyboard.press('Enter');
	}

	async searchComponent(query: string): Promise<void> {
		await this.searchInput.fill(query);
	}

	async clickCategory(name: string): Promise<void> {
		const category = this.getCategoryByName(name);
		await category.click();
	}

	// Assertions
	async expectPaletteVisible(): Promise<void> {
		await expect(this.palette).toBeVisible();
	}

	async expectComponentInPalette(name: string): Promise<void> {
		const component = this.getComponentByName(name);
		await expect(component).toBeVisible();
	}

	async expectComponentCount(count: number): Promise<void> {
		await expect(this.componentCards).toHaveCount(count);
	}

	async expectCategoryVisible(name: string): Promise<void> {
		const category = this.getCategoryByName(name);
		await expect(category).toBeVisible();
	}

	async expectCategoryExpanded(name: string): Promise<void> {
		const category = this.getCategoryByName(name);
		await expect(category).toHaveAttribute('aria-expanded', 'true');
	}
}
