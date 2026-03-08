<script lang="ts">
  interface Props {
    onSubmit: (content: string) => void;
    onCancel?: () => void;
    isStreaming?: boolean;
    disabled?: boolean;
  }

  let { onSubmit, onCancel, isStreaming = false, disabled = false }: Props =
    $props();

  let value = $state("");

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      (event.currentTarget as HTMLTextAreaElement).blur();
      return;
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const trimmed = value.trim();
      if (trimmed) {
        onSubmit(trimmed);
        value = "";
      }
    }
  }

  function handleSubmit() {
    const trimmed = value.trim();
    if (trimmed) {
      onSubmit(trimmed);
      value = "";
    }
  }
</script>

<div>
  <textarea
    data-testid="chat-input"
    aria-label="Chat message"
    placeholder="Describe the flow you want to build..."
    {disabled}
    bind:value
    onkeydown={handleKeydown}
  ></textarea>
  {#if value.length > 0}
    <span data-testid="chat-char-count">{value.length}</span>
  {/if}
  {#if isStreaming}
    <button data-testid="chat-cancel" type="button" onclick={onCancel}>
      Cancel
    </button>
  {:else}
    <button
      data-testid="chat-submit"
      type="button"
      {disabled}
      onclick={handleSubmit}
    >
      Submit
    </button>
  {/if}
</div>
