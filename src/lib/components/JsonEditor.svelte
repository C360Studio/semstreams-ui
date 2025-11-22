<script lang="ts">
	/**
	 * JsonEditor - Fallback component for raw JSON editing.
	 * T094: Used when schema is missing or for complex types (object/array).
	 */
	interface JsonEditorProps {
		/** Current configuration object */
		config?: Record<string, any>;
		/** Warning message to display */
		warning?: string;
		/** Parse error (bindable) - exposed to parent */
		parseError?: string | null;
	}

	let { config = $bindable({}), warning, parseError = $bindable(null) }: JsonEditorProps = $props();

	// Convert config object to formatted JSON string
	let jsonString = $state(JSON.stringify(config, null, 2));

	// Update JSON string when config changes externally
	$effect(() => {
		try {
			jsonString = JSON.stringify(config, null, 2);
		} catch {
			// Keep existing jsonString if config is invalid
		}
	});

	// Handle JSON text changes
	function handleInput(event: Event) {
		const target = event.target as HTMLTextAreaElement;
		jsonString = target.value;

		try {
			const parsed = JSON.parse(jsonString);
			config = parsed;
			parseError = null;
		} catch (e) {
			parseError = e instanceof Error ? e.message : 'Invalid JSON';
		}
	}
</script>

<div class="json-editor">
	{#if warning}
		<div class="warning" role="alert">
			⚠️ {warning}
		</div>
	{/if}

	<label for="json-config">Configuration (JSON)</label>
	<textarea
		id="json-config"
		value={jsonString}
		oninput={handleInput}
		rows="15"
		aria-invalid={parseError ? 'true' : undefined}
		aria-describedby={parseError ? 'json-error' : undefined}
	></textarea>

	{#if parseError}
		<span class="error" id="json-error" role="alert">{parseError}</span>
	{/if}

	<p class="help-text">Enter valid JSON configuration for this component.</p>
</div>

<style>
	.json-editor {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.warning {
		padding: 0.75rem 1rem;
		background-color: var(--pico-mark-background-color, #fff3cd);
		border: 1px solid var(--pico-mark-color, #ffc107);
		border-radius: 0.25rem;
		color: var(--pico-mark-color, #856404);
		font-size: 0.875rem;
	}

	label {
		font-weight: 500;
		margin-bottom: 0.25rem;
	}

	textarea {
		font-family: 'Courier New', monospace;
		font-size: 0.875rem;
		width: 100%;
		padding: 0.75rem;
		border: 1px solid var(--pico-muted-border-color, #dee2e6);
		border-radius: 0.25rem;
		resize: vertical;
	}

	textarea[aria-invalid='true'] {
		border-color: var(--pico-del-color, #d32f2f);
	}

	.error {
		display: block;
		font-size: 0.875rem;
		color: var(--pico-del-color, #d32f2f);
	}

	.help-text {
		font-size: 0.875rem;
		color: var(--pico-muted-color, #6c757d);
		margin: 0;
	}
</style>
