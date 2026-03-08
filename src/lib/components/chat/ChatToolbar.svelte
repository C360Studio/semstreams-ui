<script lang="ts">
  interface Props {
    onLoadJson: (data: unknown) => void;
    onExportJson: () => void;
    onNewChat: () => void;
  }

  let { onLoadJson, onExportJson, onNewChat }: Props = $props();

  let fileInput: HTMLInputElement;

  function handleLoadJsonClick() {
    fileInput.click();
  }

  function handleFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const data = JSON.parse(text);
        onLoadJson(data);
      } catch {
        // ignore parse errors
      }
    };
    reader.readAsText(file);
  }
</script>

<div data-testid="chat-toolbar">
  <input
    type="file"
    accept=".json,application/json"
    style="display: none;"
    bind:this={fileInput}
    onchange={handleFileChange}
  />
  <button
    data-testid="chat-load-json"
    type="button"
    aria-label="Load JSON"
    onclick={handleLoadJsonClick}
  >
    Load JSON
  </button>
  <button
    data-testid="chat-export-json"
    type="button"
    aria-label="Export JSON"
    onclick={onExportJson}
  >
    Export JSON
  </button>
  <button
    data-testid="chat-new-chat"
    type="button"
    aria-label="New Chat"
    onclick={onNewChat}
  >
    New Chat
  </button>
</div>
