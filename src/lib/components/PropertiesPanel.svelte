<script lang="ts">
	/**
	 * PropertiesPanel - Context-aware right panel
	 *
	 * Modes:
	 * - Empty: Nothing selected, show placeholder
	 * - Type Preview: Hovering in Palette, show component type info
	 * - Edit: Component selected, show editable config form
	 */

	import type { FlowNode } from '$lib/types/flow';
	import type { ComponentType, PropertySchema } from '$lib/types/component';
	import type { PropertiesPanelMode } from '$lib/types/ui-state';
	import { getTypeColor } from '$lib/utils/category-colors';
	import PortsEditor from './PortsEditor.svelte';

	interface PropertiesPanelProps {
		/** Panel display mode */
		mode?: PropertiesPanelMode;
		/** Component type for preview mode */
		componentType?: ComponentType | null;
		/** Flow node for edit mode */
		node?: FlowNode | null;
		/** Component type definition for the node (for schema) */
		nodeComponentType?: ComponentType | null;
		/** Callback when config is saved */
		onSave?: (nodeId: string, name: string, config: Record<string, unknown>) => void;
		/** Callback when node is deleted */
		onDelete?: (nodeId: string) => void;
	}

	let {
		mode = 'empty',
		componentType = null,
		node = null,
		nodeComponentType = null,
		onSave,
		onDelete
	}: PropertiesPanelProps = $props();

	// Edit form state
	let editedName = $state('');
	let editedConfig = $state<Record<string, unknown>>({});
	let showDeleteConfirm = $state(false);

	// Initialize form when node changes
	$effect(() => {
		if (node) {
			editedName = node.name;
			editedConfig = { ...node.config };
		} else {
			editedName = '';
			editedConfig = {};
		}
		showDeleteConfirm = false;
	});

	// Dirty state - check if form has changes
	const isDirty = $derived.by(() => {
		if (!node) return false;
		if (editedName !== node.name) return true;

		const originalConfig = node.config;
		const editedKeys = Object.keys(editedConfig);
		const originalKeys = Object.keys(originalConfig);

		if (editedKeys.length !== originalKeys.length) return true;

		for (const key of editedKeys) {
			if (editedConfig[key] !== originalConfig[key]) return true;
		}

		return false;
	});

	// Validation
	const isFormValid = $derived.by(() => {
		if (!editedName.trim()) return false;

		if (nodeComponentType?.schema) {
			const required = nodeComponentType.schema.required || [];
			for (const field of required) {
				const value = editedConfig[field];
				if (value === undefined || value === null || value === '') return false;

				const schema = nodeComponentType.schema.properties[field];
				if (schema?.type === 'number') {
					const numValue = Number(value);
					if (isNaN(numValue)) return false;
					if (schema.minimum !== undefined && numValue < schema.minimum) return false;
					if (schema.maximum !== undefined && numValue > schema.maximum) return false;
				}
			}
		}

		return true;
	});

	const canSave = $derived(isFormValid && isDirty);

	// Get validation error for a field
	function getFieldError(fieldName: string, schema: PropertySchema): string | null {
		const value = editedConfig[fieldName];
		if (value === undefined || value === null || value === '') return null;

		if (schema.type === 'number') {
			const numValue = Number(value);
			if (isNaN(numValue)) return 'Must be a valid number';
			if (schema.minimum !== undefined && numValue < schema.minimum) {
				return `Minimum: ${schema.minimum}`;
			}
			if (schema.maximum !== undefined && numValue > schema.maximum) {
				return `Maximum: ${schema.maximum}`;
			}
		}

		return null;
	}

	// Handlers
	function handleSave() {
		if (!canSave || !node) return;
		onSave?.(node.id, editedName, editedConfig);
	}

	function handleDelete() {
		showDeleteConfirm = true;
	}

	function handleConfirmDelete() {
		if (!node) return;
		onDelete?.(node.id);
		showDeleteConfirm = false;
	}

	function handleCancelDelete() {
		showDeleteConfirm = false;
	}

	function handleReset() {
		if (node) {
			editedName = node.name;
			editedConfig = { ...node.config };
		}
	}

	// Auto-save on blur (if valid and dirty)
	function handleBlur() {
		if (canSave && node) {
			onSave?.(node.id, editedName, editedConfig);
		}
	}
</script>

<div class="properties-panel" data-testid="properties-panel">
	{#if mode === 'empty'}
		<!-- Empty State -->
		<div class="empty-state" data-testid="properties-empty">
			<div class="empty-icon">
				<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
					<rect x="3" y="3" width="18" height="18" rx="2" />
					<line x1="9" y1="9" x2="15" y2="15" />
					<line x1="15" y1="9" x2="9" y2="15" />
				</svg>
			</div>
			<p class="empty-title">No Selection</p>
			<p class="empty-hint">Select a component from the canvas or list to view its properties</p>
		</div>

	{:else if mode === 'type-preview' && componentType}
		<!-- Type Preview -->
		{@const categoryColor = getTypeColor(componentType.type)}
		<div class="type-preview" data-testid="properties-type-preview">
			<header class="preview-header" style="border-left-color: {categoryColor};">
				<h3>{componentType.name}</h3>
				<span class="preview-category">{componentType.type}</span>
			</header>

			<div class="preview-content">
				<section class="preview-section">
					<h4>Description</h4>
					<p>{componentType.description || 'No description available'}</p>
				</section>

				{#if componentType.protocol}
					<section class="preview-section">
						<h4>Protocol</h4>
						<code class="protocol-badge">{componentType.protocol}</code>
					</section>
				{/if}

				{#if componentType.ports && componentType.ports.length > 0}
					<section class="preview-section">
						<h4>Ports</h4>
						<ul class="ports-list">
							{#each componentType.ports as port (port.id)}
								<li class="port-item">
									<span class="port-direction" class:input={port.direction === 'input'} class:output={port.direction === 'output'}>
										{port.direction}
									</span>
									<span class="port-name">{port.name}</span>
									{#if port.required}
										<span class="port-required">required</span>
									{/if}
								</li>
							{/each}
						</ul>
					</section>
				{/if}

				{#if componentType.schema}
					<section class="preview-section">
						<h4>Configuration</h4>
						<ul class="config-schema-list">
							{#each Object.entries(componentType.schema.properties) as [key, schema] (key)}
								{@const isRequired = componentType.schema.required?.includes(key)}
								<li class="config-item">
									<span class="config-key">{key}</span>
									<span class="config-type">{schema.type}</span>
									{#if isRequired}
										<span class="config-required">*</span>
									{/if}
								</li>
							{/each}
						</ul>
					</section>
				{/if}

				<p class="preview-hint">Click to add this component to your flow</p>
			</div>
		</div>

	{:else if mode === 'edit' && node}
		<!-- Edit Mode -->
		{@const categoryColor = getTypeColor(node.type)}
		<div class="edit-panel" data-testid="properties-edit">
			<header class="edit-header" style="border-left-color: {categoryColor};">
				<div class="header-top">
					<h3>{node.name}</h3>
					<div class="header-badges">
						{#if node.type}
							<span class="badge badge-{node.type}">
								{node.type}
							</span>
						{/if}
						{#if nodeComponentType?.domain}
							<span class="badge badge-domain">{nodeComponentType.domain}</span>
						{/if}
					</div>
				</div>
				<span class="edit-type">{nodeComponentType?.name || node.component}</span>
				{#if nodeComponentType?.description}
					<p class="component-description">{nodeComponentType.description}</p>
				{/if}
			</header>

			<form class="edit-form" onsubmit={(e) => e.preventDefault()}>
				<!-- Component Name -->
				<div class="form-group">
					<label for="prop-name">Name</label>
					<input
						id="prop-name"
						type="text"
						bind:value={editedName}
						onblur={handleBlur}
						required
						data-testid="prop-name-input"
					/>
				</div>

				<!-- Config Fields -->
				{#if nodeComponentType?.schema}
					<div class="config-section">
						<h4>Configuration</h4>
						{#each Object.entries(nodeComponentType.schema.properties) as [fieldName, schema] (fieldName)}
							{@const isRequired = nodeComponentType.schema.required?.includes(fieldName)}
							{@const error = getFieldError(fieldName, schema)}

							<div class="form-group" class:has-error={error}>
								<label for="prop-{fieldName}">
									{fieldName}
									{#if isRequired}<span class="required-marker">*</span>{/if}
								</label>
								{#if schema.description}
									<p class="field-hint">{schema.description}</p>
								{/if}

								{#if schema.type === 'string'}
									<input
										id="prop-{fieldName}"
										type="text"
										bind:value={editedConfig[fieldName]}
										onblur={handleBlur}
										required={isRequired}
										data-testid="prop-{fieldName}-input"
									/>
								{:else if schema.type === 'int' || schema.type === 'integer' || schema.type === 'number'}
									<input
										id="prop-{fieldName}"
										type="number"
										bind:value={editedConfig[fieldName]}
										onblur={handleBlur}
										required={isRequired}
										min={schema.minimum}
										max={schema.maximum}
										data-testid="prop-{fieldName}-input"
									/>
								{:else if schema.type === 'bool' || schema.type === 'boolean'}
									<label class="checkbox-label">
										<input
											id="prop-{fieldName}"
											type="checkbox"
											checked={editedConfig[fieldName] === true}
											onchange={(e) => {
												editedConfig[fieldName] = e.currentTarget.checked;
												handleBlur();
											}}
											data-testid="prop-{fieldName}-input"
										/>
										<span>Enabled</span>
									</label>
								{:else if schema.type === 'enum' && schema.enum}
									<select
										id="prop-{fieldName}"
										bind:value={editedConfig[fieldName]}
										onchange={handleBlur}
										required={isRequired}
										data-testid="prop-{fieldName}-input"
									>
										<option value="">Select...</option>
										{#each schema.enum as option (option)}
											<option value={option}>{option}</option>
										{/each}
									</select>
								{:else if schema.type === 'ports'}
									<!-- Ports editor -->
									<PortsEditor
										value={(editedConfig[fieldName] ?? { inputs: [], outputs: [] }) as { inputs?: Record<string, unknown>[]; outputs?: Record<string, unknown>[] }}
										portFields={schema.portFields}
										onChange={(v) => {
											editedConfig[fieldName] = v;
											handleBlur();
										}}
									/>
								{:else}
									<!-- object, array - JSON editor -->
									<textarea
										id="prop-{fieldName}"
										class="json-editor"
										value={JSON.stringify(editedConfig[fieldName] ?? {}, null, 2)}
										onchange={(e) => {
											try {
												editedConfig[fieldName] = JSON.parse(e.currentTarget.value);
												handleBlur();
											} catch {
												// Invalid JSON - keep current value
											}
										}}
										data-testid="prop-{fieldName}-input"
									></textarea>
								{/if}

								{#if error}
									<p class="field-error">{error}</p>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</form>

			<!-- Actions -->
			<footer class="edit-footer">
				{#if isDirty}
					<div class="dirty-indicator">
						<span class="dirty-dot"></span>
						Unsaved changes
					</div>
				{/if}

				<div class="action-buttons">
					{#if isDirty}
						<button type="button" class="btn-secondary" onclick={handleReset}>
							Reset
						</button>
						<button type="button" class="btn-primary" onclick={handleSave} disabled={!canSave}>
							Save
						</button>
					{/if}
					<button type="button" class="btn-danger" onclick={handleDelete}>
						Delete
					</button>
				</div>
			</footer>

			<!-- Delete Confirmation -->
			{#if showDeleteConfirm}
				<div class="confirm-overlay" data-testid="delete-confirm">
					<div class="confirm-dialog">
						<h4>Delete Component?</h4>
						<p>Are you sure you want to delete "{node.name}"?</p>
						<p class="confirm-warning">This cannot be undone.</p>
						<div class="confirm-actions">
							<button class="btn-secondary" onclick={handleCancelDelete}>Cancel</button>
							<button class="btn-danger" onclick={handleConfirmDelete}>Delete</button>
						</div>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.properties-panel {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--properties-background, var(--ui-surface-secondary));
	}

	/* Empty State */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		padding: 2rem;
		text-align: center;
		color: var(--properties-empty-state-text, var(--ui-text-tertiary));
	}

	.empty-icon {
		margin-bottom: 1rem;
		opacity: 0.5;
	}

	.empty-title {
		margin: 0 0 0.5rem;
		font-weight: 600;
		font-size: 1rem;
		color: var(--ui-text-secondary);
	}

	.empty-hint {
		margin: 0;
		font-size: 0.875rem;
		line-height: 1.4;
	}

	/* Type Preview */
	.type-preview {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.preview-header {
		padding: 1rem;
		background: var(--properties-header-bg, var(--ui-surface-tertiary));
		border-bottom: 1px solid var(--ui-border-subtle);
		border-left: 4px solid;
	}

	.preview-header h3 {
		margin: 0 0 0.25rem;
		font-size: 1rem;
	}

	.preview-category {
		font-size: 0.75rem;
		color: var(--ui-text-secondary);
		text-transform: uppercase;
	}

	.preview-content {
		flex: 1;
		overflow-y: auto;
		padding: 1rem;
	}

	.preview-section {
		margin-bottom: 1.25rem;
	}

	.preview-section h4 {
		margin: 0 0 0.5rem;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		color: var(--ui-text-secondary);
	}

	.preview-section p {
		margin: 0;
		font-size: 0.875rem;
		color: var(--ui-text-primary);
		line-height: 1.4;
	}

	.protocol-badge {
		display: inline-block;
		padding: 0.25rem 0.5rem;
		background: var(--ui-surface-tertiary);
		border-radius: 4px;
		font-size: 0.75rem;
		font-family: monospace;
	}

	.ports-list,
	.config-schema-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.port-item,
	.config-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.375rem 0;
		font-size: 0.8125rem;
		border-bottom: 1px solid var(--ui-border-subtle);
	}

	.port-direction {
		font-size: 0.6875rem;
		padding: 0.125rem 0.375rem;
		border-radius: 3px;
		text-transform: uppercase;
	}

	.port-direction.input {
		background: var(--domain-network-container);
		color: var(--domain-network);
	}

	.port-direction.output {
		background: var(--domain-storage-container);
		color: var(--domain-storage);
	}

	.port-name,
	.config-key {
		font-weight: 500;
	}

	.port-required,
	.config-required {
		font-size: 0.6875rem;
		color: var(--status-error);
	}

	.config-type {
		font-size: 0.6875rem;
		color: var(--ui-text-tertiary);
		font-family: monospace;
	}

	.preview-hint {
		margin-top: 1.5rem;
		padding: 0.75rem;
		background: var(--ui-surface-primary);
		border-radius: 4px;
		font-size: 0.8125rem;
		color: var(--ui-text-secondary);
		text-align: center;
	}

	/* Edit Panel */
	.edit-panel {
		display: flex;
		flex-direction: column;
		height: 100%;
		position: relative;
	}

	.edit-header {
		padding: 1rem;
		background: var(--properties-header-bg, var(--ui-surface-tertiary));
		border-bottom: 1px solid var(--ui-border-subtle);
		border-left: 4px solid;
	}

	.edit-header h3 {
		margin: 0 0 0.25rem;
		font-size: 1rem;
		word-break: break-word;
	}

	.edit-type {
		font-size: 0.75rem;
		color: var(--ui-text-secondary);
		font-family: monospace;
	}

	.header-top {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 0.5rem;
	}

	.header-badges {
		display: flex;
		gap: 0.25rem;
		flex-shrink: 0;
	}

	.badge {
		font-size: 0.625rem;
		padding: 0.125rem 0.375rem;
		border-radius: 4px;
		text-transform: uppercase;
		font-weight: 600;
		white-space: nowrap;
	}

	.badge-input {
		background: var(--status-success-container);
		color: var(--status-success-on-container);
	}

	.badge-output {
		background: var(--status-warning-container);
		color: var(--status-warning-on-container);
	}

	.badge-processor {
		background: var(--ui-interactive-primary);
		color: white;
	}

	.badge-domain {
		background: var(--ui-surface-tertiary);
		color: var(--ui-text-secondary);
		border: 1px solid var(--ui-border-subtle);
	}

	.component-description {
		font-size: 0.75rem;
		color: var(--ui-text-secondary);
		margin: 0.5rem 0 0 0;
		line-height: 1.4;
	}

	.edit-form {
		flex: 1;
		overflow-y: auto;
		padding: 1rem;
	}

	.form-group {
		margin-bottom: 1rem;
	}

	.form-group label {
		display: block;
		margin-bottom: 0.375rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--ui-text-primary);
	}

	.required-marker {
		color: var(--status-error);
		margin-left: 0.25rem;
	}

	.field-hint {
		margin: 0 0 0.375rem;
		font-size: 0.75rem;
		color: var(--ui-text-tertiary);
	}

	.form-group input[type='text'],
	.form-group input[type='number'],
	.form-group select {
		width: 100%;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--ui-border-subtle);
		border-radius: 4px;
		font-size: 0.875rem;
		background: var(--ui-surface-primary);
		color: var(--ui-text-primary);
	}

	.form-group input:focus,
	.form-group select:focus {
		outline: none;
		border-color: var(--ui-interactive-primary);
		box-shadow: 0 0 0 2px var(--ui-focus-ring);
	}

	.json-editor {
		width: 100%;
		min-height: 100px;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--ui-border-subtle);
		border-radius: 4px;
		font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
		font-size: 0.75rem;
		background: var(--ui-surface-primary);
		color: var(--ui-text-primary);
		resize: vertical;
		white-space: pre;
		tab-size: 2;
	}

	.json-editor:focus {
		outline: none;
		border-color: var(--ui-interactive-primary);
		box-shadow: 0 0 0 2px var(--ui-focus-ring);
	}

	.form-group.has-error input {
		border-color: var(--status-error);
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
	}

	.checkbox-label input {
		width: auto;
	}

	.field-error {
		margin: 0.375rem 0 0;
		font-size: 0.75rem;
		color: var(--status-error);
	}

	.config-section {
		margin-top: 1.5rem;
		padding-top: 1rem;
		border-top: 1px solid var(--ui-border-subtle);
	}

	.config-section h4 {
		margin: 0 0 1rem;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--ui-text-secondary);
		text-transform: uppercase;
	}

	/* Footer */
	.edit-footer {
		padding: 0.75rem 1rem;
		border-top: 1px solid var(--ui-border-subtle);
		background: var(--ui-surface-tertiary);
	}

	.dirty-indicator {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
		font-size: 0.75rem;
		color: var(--status-warning-on-container);
	}

	.dirty-dot {
		width: 8px;
		height: 8px;
		background: var(--status-warning);
		border-radius: 50%;
	}

	.action-buttons {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
	}

	.btn-primary,
	.btn-secondary,
	.btn-danger {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 4px;
		font-size: 0.8125rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.btn-primary {
		background: var(--ui-interactive-primary);
		color: var(--ui-text-on-primary);
	}

	.btn-primary:hover:not(:disabled) {
		background: var(--ui-interactive-primary-hover);
	}

	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-secondary {
		background: var(--ui-surface-primary);
		color: var(--ui-text-primary);
		border: 1px solid var(--ui-border-subtle);
	}

	.btn-secondary:hover {
		background: var(--ui-surface-secondary);
	}

	.btn-danger {
		background: var(--status-error);
		color: white;
	}

	.btn-danger:hover {
		background: var(--status-error-hover);
	}

	/* Delete Confirmation */
	.confirm-overlay {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}

	.confirm-dialog {
		background: var(--ui-surface-primary);
		padding: 1.5rem;
		border-radius: 8px;
		max-width: 300px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
	}

	.confirm-dialog h4 {
		margin: 0 0 0.75rem;
		color: var(--status-error);
	}

	.confirm-dialog p {
		margin: 0 0 0.5rem;
		font-size: 0.875rem;
	}

	.confirm-warning {
		color: var(--ui-text-tertiary);
		font-style: italic;
	}

	.confirm-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
		margin-top: 1rem;
	}
</style>
