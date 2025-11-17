<script lang="ts">
	/**
	 * NavigationDialog - Warns users before navigating away from unsaved changes.
	 * Provides three options: Save, Discard, or Cancel.
	 */
	interface NavigationDialogProps {
		/** Whether dialog is visible */
		isOpen: boolean;
		/** Callback when user clicks Save */
		onSave?: () => void;
		/** Callback when user clicks Discard */
		onDiscard?: () => void;
		/** Callback when user clicks Cancel or closes dialog */
		onCancel?: () => void;
	}

	let { isOpen, onSave, onDiscard, onCancel }: NavigationDialogProps = $props();

	// Handle ESC key
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && isOpen) {
			onCancel?.();
		}
	}

	// Handle background click
	function handleBackgroundClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			onCancel?.();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<div
		class="dialog-overlay"
		onclick={handleBackgroundClick}
		role="dialog"
		aria-modal="true"
		aria-labelledby="navigation-dialog-title"
	>
		<div class="dialog-content">
			<h2 id="navigation-dialog-title">You have unsaved changes</h2>
			<p>You have unsaved changes. Are you sure you want to leave?</p>

			<div class="dialog-actions">
				<button
					type="button"
					class="button-save"
					onclick={onSave}
					autofocus
				>
					Save Changes
				</button>
				<button
					type="button"
					class="button-discard"
					onclick={onDiscard}
				>
					Discard Changes
				</button>
				<button
					type="button"
					class="button-cancel"
					onclick={onCancel}
				>
					Cancel
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.dialog-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 9999;
	}

	.dialog-content {
		background: var(--pico-background-color, white);
		padding: 2rem;
		border-radius: var(--pico-border-radius, 8px);
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
		max-width: 500px;
		width: 90%;
	}

	h2 {
		margin: 0 0 1rem 0;
		font-size: 1.5rem;
		color: var(--pico-color, #000);
	}

	p {
		margin: 0 0 1.5rem 0;
		color: var(--pico-muted-color, #666);
	}

	.dialog-actions {
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
	}

	button {
		padding: 0.5rem 1rem;
		border-radius: var(--pico-border-radius, 4px);
		border: 1px solid transparent;
		cursor: pointer;
		font-weight: 500;
		transition: all 0.2s;
	}

	.button-save {
		background: var(--pico-primary, #0066cc);
		color: white;
		border-color: var(--pico-primary, #0066cc);
	}

	.button-save:hover {
		background: var(--pico-primary-hover, #0052a3);
	}

	.button-discard {
		background: var(--pico-del-color, #dc3545);
		color: white;
		border-color: var(--pico-del-color, #dc3545);
	}

	.button-discard:hover {
		background: #c82333;
	}

	.button-cancel {
		background: transparent;
		color: var(--pico-color, #000);
		border-color: var(--pico-muted-border-color, #dee2e6);
	}

	.button-cancel:hover {
		background: var(--pico-secondary-background, #f8f9fa);
	}
</style>
