import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for the Configuration Panel
 * Encapsulates interactions with component configuration UI
 */
export class ConfigPanelPage {
	constructor(private page: Page) {}

	// Locators
	get panel(): Locator {
		return this.page.locator('.config-panel');
	}

	get configTextarea(): Locator {
		return this.page.locator('textarea#config-json');
	}

	get applyButton(): Locator {
		return this.page.locator('button:has-text("Apply")');
	}

	get cancelButton(): Locator {
		return this.page.locator('button:has-text("Cancel")');
	}

	get errorMessage(): Locator {
		return this.page.locator('#config-error');
	}

	get componentTitle(): Locator {
		// Use .first() to get only the main title (not section headings like "Basic Configuration")
		return this.page.locator('.config-panel h3').first();
	}

	// Schema form locators
	get schemaForm(): Locator {
		return this.page.locator('.schema-form');
	}

	get basicConfigSection(): Locator {
		return this.page.locator('.basic-config');
	}

	get advancedConfigSection(): Locator {
		return this.page.locator('details.advanced-config');
	}

	get advancedConfigSummary(): Locator {
		return this.page.locator('details.advanced-config summary');
	}

	get submitButton(): Locator {
		return this.page.locator('button[type="submit"]');
	}

	get validationErrors(): Locator {
		return this.page.locator('.error');
	}

	// Get form field by name (matches ID attribute)
	getFormField(fieldName: string): Locator {
		return this.page.locator(`#${fieldName}`);
	}

	getFieldLabel(fieldName: string): Locator {
		return this.page.locator(`label[for="${fieldName}"]`);
	}

	getFieldError(fieldName: string): Locator {
		return this.page.locator(`.field-group:has(#${fieldName}) .error`);
	}

	// Actions
	async fillConfig(configJson: string): Promise<void> {
		await this.configTextarea.fill(configJson);
	}

	async clearConfig(): Promise<void> {
		await this.configTextarea.clear();
	}

	async clickApply(): Promise<void> {
		await this.applyButton.click();
	}

	async clickCancel(): Promise<void> {
		await this.cancelButton.click();
	}

	async getConfigValue(): Promise<string> {
		return await this.configTextarea.inputValue();
	}

	// Schema form actions
	async fillFormField(fieldName: string, value: string): Promise<void> {
		const field = this.getFormField(fieldName);
		await field.fill(value);
	}

	async clickSubmit(): Promise<void> {
		await this.submitButton.click();
	}

	async expandAdvancedConfig(): Promise<void> {
		await this.advancedConfigSummary.click();
	}

	async getFieldValue(fieldName: string): Promise<string> {
		const field = this.getFormField(fieldName);
		return await field.inputValue();
	}

	// Assertions
	async expectPanelVisible(): Promise<void> {
		await expect(this.panel).toBeVisible();
	}

	async expectPanelHidden(): Promise<void> {
		await expect(this.panel).not.toBeVisible();
	}

	async expectConfigValue(expectedJson: string): Promise<void> {
		const actualValue = await this.getConfigValue();
		// Parse and compare as JSON to handle formatting differences
		expect(JSON.parse(actualValue)).toEqual(JSON.parse(expectedJson));
	}

	async expectErrorVisible(errorText?: string): Promise<void> {
		await expect(this.errorMessage).toBeVisible();
		if (errorText) {
			await expect(this.errorMessage).toContainText(errorText);
		}
	}

	async expectNoError(): Promise<void> {
		await expect(this.errorMessage).not.toBeVisible();
	}

	async expectComponentTitle(title: string): Promise<void> {
		await expect(this.componentTitle).toHaveText(title);
	}

	async expectApplyEnabled(): Promise<void> {
		await expect(this.applyButton).toBeEnabled();
	}

	async expectApplyDisabled(): Promise<void> {
		await expect(this.applyButton).toBeDisabled();
	}

	// Schema form assertions
	async expectSchemaFormVisible(): Promise<void> {
		await expect(this.schemaForm).toBeVisible();
	}

	async expectFieldVisible(fieldName: string): Promise<void> {
		const field = this.getFormField(fieldName);
		await expect(field).toBeVisible();
	}

	async expectFieldValue(fieldName: string, expectedValue: string): Promise<void> {
		const field = this.getFormField(fieldName);
		await expect(field).toHaveValue(expectedValue);
	}

	async expectFieldHasAttribute(fieldName: string, attribute: string, value: string): Promise<void> {
		const field = this.getFormField(fieldName);
		await expect(field).toHaveAttribute(attribute, value);
	}

	async expectValidationError(errorText?: string): Promise<void> {
		await expect(this.validationErrors.first()).toBeVisible();
		if (errorText) {
			await expect(this.validationErrors.first()).toContainText(errorText);
		}
	}

	async expectNoValidationErrors(): Promise<void> {
		await expect(this.validationErrors).not.toBeVisible();
	}

	async expectFieldLabelContainsText(fieldName: string, text: string): Promise<void> {
		const label = this.getFieldLabel(fieldName);
		await expect(label).toContainText(text);
	}

	async expectBasicSectionVisible(): Promise<void> {
		await expect(this.basicConfigSection).toBeVisible();
	}

	async expectAdvancedSectionVisible(): Promise<void> {
		await expect(this.advancedConfigSection).toBeVisible();
	}

	async expectFieldInSection(fieldName: string, section: 'basic' | 'advanced'): Promise<void> {
		const sectionLoc = section === 'basic' ? this.basicConfigSection : this.advancedConfigSection;
		const field = sectionLoc.locator(`#${fieldName}`);
		await expect(field).toBeVisible();
	}

	async expectSubmitDisabled(): Promise<void> {
		await expect(this.submitButton).toBeDisabled();
	}

	async expectSubmitEnabled(): Promise<void> {
		await expect(this.submitButton).toBeEnabled();
	}

	// ==========================================
	// PortConfigEditor Support Methods
	// ==========================================

	// Locators for PortConfigEditor
	get portConfigEditor(): Locator {
		return this.page.locator('.port-config-editor');
	}

	get addInputPortButton(): Locator {
		return this.page.locator('button:has-text("Add Input Port")');
	}

	get addOutputPortButton(): Locator {
		return this.page.locator('button:has-text("Add Output Port")');
	}

	getPortSection(direction: 'input' | 'output'): Locator {
		const heading = direction === 'input' ? 'Input Ports' : 'Output Ports';
		return this.page.locator(`.port-section:has(h4:has-text("${heading}"))`);
	}

	getPortItem(direction: 'input' | 'output', index: number): Locator {
		const section = this.getPortSection(direction);
		return section.locator('.port-item').nth(index);
	}

	getPortFieldInput(direction: 'input' | 'output', portIndex: number, fieldName: string): Locator {
		// ID format: "ports-input-0-subject" or "ports-output-0-subject"
		return this.page.locator(`#ports-${direction}-${portIndex}-${fieldName}`);
	}

	getRemovePortButton(direction: 'input' | 'output', index: number): Locator {
		const portItem = this.getPortItem(direction, index);
		return portItem.locator('button:has-text("Remove")');
	}

	// Actions for PortConfigEditor
	async clickAddInputPort(): Promise<void> {
		await this.addInputPortButton.click();
	}

	async clickAddOutputPort(): Promise<void> {
		await this.addOutputPortButton.click();
	}

	async fillPortField(direction: 'input' | 'output', portIndex: number, fieldName: string, value: string): Promise<void> {
		const field = this.getPortFieldInput(direction, portIndex, fieldName);
		await field.fill(value);
	}

	async removePort(direction: 'input' | 'output', portIndex: number): Promise<void> {
		const removeButton = this.getRemovePortButton(direction, portIndex);
		await removeButton.click();
	}

	async getPortFieldValue(direction: 'input' | 'output', portIndex: number, fieldName: string): Promise<string> {
		const field = this.getPortFieldInput(direction, portIndex, fieldName);
		return await field.inputValue();
	}

	// Assertions for PortConfigEditor
	async expectPortConfigEditorVisible(): Promise<void> {
		await expect(this.portConfigEditor).toBeVisible();
	}

	async expectPortCount(direction: 'input' | 'output', count: number): Promise<void> {
		const section = this.getPortSection(direction);
		const portItems = section.locator('.port-item');
		await expect(portItems).toHaveCount(count);
	}

	async expectPortFieldValue(direction: 'input' | 'output', portIndex: number, fieldName: string, expectedValue: string): Promise<void> {
		const field = this.getPortFieldInput(direction, portIndex, fieldName);
		await expect(field).toHaveValue(expectedValue);
	}

	async expectPortFieldVisible(direction: 'input' | 'output', portIndex: number, fieldName: string): Promise<void> {
		const field = this.getPortFieldInput(direction, portIndex, fieldName);
		await expect(field).toBeVisible();
	}

	async expectEmptyPortsMessage(direction: 'input' | 'output'): Promise<void> {
		const section = this.getPortSection(direction);
		const emptyState = section.locator('.empty-state');
		await expect(emptyState).toBeVisible();
		const text = direction === 'input' ? 'No input ports configured' : 'No output ports configured';
		await expect(emptyState).toContainText(text);
	}
}
