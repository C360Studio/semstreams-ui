<script lang="ts">
  import type { ChatMessage } from "$lib/types/chat";
  import FlowDiffSummary from "./FlowDiffSummary.svelte";

  interface Props {
    message: ChatMessage;
    onApplyFlow?: (messageId: string) => void;
  }

  let { message, onApplyFlow }: Props = $props();

  let showApplyButton = $derived(
    message.role === "assistant" && message.flow !== undefined,
  );
</script>

<div data-testid="chat-message" role="article">
  <div data-testid="chat-message-{message.role}">
    <p>{message.content}</p>
    <time datetime={message.timestamp.toISOString()}>{message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
    {#if message.flowDiff}
      <FlowDiffSummary diff={message.flowDiff} />
    {/if}
    {#if showApplyButton}
      <button
        data-testid="apply-flow-button"
        type="button"
        disabled={message.applied === true}
        onclick={() => onApplyFlow?.(message.id)}
      >
        {message.applied ? "Applied" : "Apply to Canvas"}
      </button>
    {/if}
  </div>
</div>
