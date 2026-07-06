<script lang="ts">
  import {
    ArrowTopRightOnSquare,
    ClipboardDocument,
    ClipboardDocumentCheck,
    ExclamationTriangle,
    Icon,
  } from "svelte-hero-icons";
  import type { OpsTrajectoryItem, OpsTrajectorySummary } from "$lib/services/opsSummaryApi";
  import {
    trajectoryApi,
    type TrajectoryDetail,
    type TrajectoryDetailStep,
  } from "$lib/services/trajectoryApi";

  interface Props {
    summary?: OpsTrajectorySummary | null;
    fetchDetail?: (loopId: string) => Promise<TrajectoryDetail>;
    writeClipboard?: (value: string) => void | Promise<void>;
  }

  let {
    summary = null,
    fetchDetail = trajectoryApi.fetchDetail,
    writeClipboard = writeClipboardValue,
  }: Props = $props();

  let selectedLoopId = $state<string | null>(null);
  let detail = $state<TrajectoryDetail | null>(null);
  let detailLoading = $state(false);
  let detailError = $state<string | null>(null);
  let copiedTarget = $state<"loop" | "task" | null>(null);

  const items = $derived(summary?.items ?? []);
  const selectedSummary = $derived(
    items.find((item) => item.loopId === selectedLoopId) ?? null,
  );
  const hasItems = $derived(items.length > 0);
  const isUnavailable = $derived(summary?.status === "unavailable");

  async function inspectTrajectory(item: OpsTrajectoryItem) {
    if (detailLoading) return;

    selectedLoopId = item.loopId;
    detail = null;
    detailError = null;
    detailLoading = true;

    try {
      detail = await fetchDetail(item.loopId);
    } catch (error) {
      detailError =
        error instanceof Error ? error.message : "Trajectory detail unavailable";
    } finally {
      detailLoading = false;
    }
  }

  async function copyValue(target: "loop" | "task", value: string | null) {
    if (!value) return;

    try {
      await writeClipboard(value);
      copiedTarget = target;
      setTimeout(() => {
        if (copiedTarget === target) copiedTarget = null;
      }, 1800);
    } catch {
      copiedTarget = null;
    }
  }

  function handleCopyLoopId() {
    void copyValue("loop", selectedSummary?.loopId ?? detail?.loopId ?? null);
  }

  function handleCopyTaskId() {
    void copyValue("task", selectedSummary?.taskId ?? null);
  }

  function trajectoryHref(loopId: string): string {
    return `/trajectories/${encodeURIComponent(loopId)}`;
  }

  function formatContext(item: OpsTrajectoryItem): string {
    return item.workflowSlug ?? item.role;
  }

  function formatDateTime(value: string): string {
    if (!value) return "Unknown time";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  function formatDuration(ms: number): string {
    if (!Number.isFinite(ms) || ms <= 0) return "0 ms";
    if (ms < 1000) return `${Math.round(ms)} ms`;
    const seconds = ms / 1000;
    if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 1 : 0)} s`;
    const minutes = Math.floor(seconds / 60);
    const remaining = Math.round(seconds % 60);
    return `${minutes}m ${remaining}s`;
  }

  function formatStepContext(step: TrajectoryDetailStep): string {
    if (step.toolName) {
      return [step.toolName, step.toolStatus].filter(Boolean).join(" / ");
    }
    return [step.provider, step.model, step.capability].filter(Boolean).join(" / ");
  }

  async function writeClipboardValue(value: string) {
    const clipboard =
      globalThis.navigator?.clipboard ??
      (typeof window !== "undefined" ? window.navigator.clipboard : null);

    if (typeof clipboard?.writeText === "function") {
      await clipboard.writeText(value);
    }
  }
</script>

<section
  class="trajectory-inspector"
  aria-label="Trajectory inspector"
  data-testid="trajectory-inspector"
>
  <header class="inspector-header">
    <div>
      <span class="eyebrow">Trajectory inspector</span>
      <h2>Recent loops</h2>
    </div>
    <p>{summary?.message ?? "Trajectory summaries not loaded"}</p>
  </header>

  {#if isUnavailable}
    <div class="state-box" role="alert">
      <Icon src={ExclamationTriangle} size="16" mini />
      <span>{summary?.message ?? "Trajectory endpoint unavailable"}</span>
    </div>
  {:else if !hasItems}
    <div class="state-box">
      <span>No trajectories yet</span>
    </div>
  {:else}
    <div class="inspector-body">
      <div class="trajectory-list" aria-label="Recent trajectories">
        {#each items as item (item.loopId)}
          <button
            type="button"
            class="trajectory-row"
            class:active={item.loopId === selectedLoopId}
            onclick={() => inspectTrajectory(item)}
            aria-label="Inspect trajectory {item.loopId}"
          >
            <span class="row-main">
              <strong>{formatContext(item)}</strong>
              <span>{item.loopId}</span>
            </span>
            <span class="row-meta">
              <span data-outcome={item.outcome}>{item.outcome}</span>
              <span>{item.iterations} steps</span>
            </span>
          </button>
        {/each}
      </div>

      <article class="detail-panel" data-testid="trajectory-detail-panel">
        {#if detailLoading}
          <div class="state-box">Loading trajectory detail...</div>
        {:else if detailError}
          <div class="state-box" role="alert">
            <Icon src={ExclamationTriangle} size="16" mini />
            <span>{detailError}</span>
          </div>
        {:else if detail && selectedSummary}
          <div class="detail-heading">
            <div>
              <span class="eyebrow">Selected loop</span>
              <h3>{formatContext(selectedSummary)}</h3>
              <p>{detail.loopId}</p>
            </div>
            <div class="detail-actions">
              <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
              <a href={trajectoryHref(detail.loopId)}
                class="icon-button"
                aria-label="Open raw trajectory"
                title="Open raw trajectory"
              >
                <Icon src={ArrowTopRightOnSquare} size="16" mini />
              </a>
              <button
                type="button"
                class="icon-button"
                aria-label="Copy loop ID"
                title="Copy loop ID"
                onclick={handleCopyLoopId}
              >
                <Icon
                  src={copiedTarget === "loop"
                    ? ClipboardDocumentCheck
                    : ClipboardDocument}
                  size="16"
                  mini
                />
              </button>
              <button
                type="button"
                class="icon-button"
                aria-label="Copy task ID"
                title="Copy task ID"
                onclick={handleCopyTaskId}
              >
                <Icon
                  src={copiedTarget === "task"
                    ? ClipboardDocumentCheck
                    : ClipboardDocument}
                  size="16"
                  mini
                />
              </button>
            </div>
          </div>

          <dl class="detail-stats">
            <div>
              <dt>Task</dt>
              <dd>{selectedSummary.taskId}</dd>
            </div>
            <div>
              <dt>Outcome</dt>
              <dd data-outcome={detail.outcome}>{detail.outcome}</dd>
            </div>
            <div>
              <dt>Started</dt>
              <dd>{formatDateTime(detail.startTime)}</dd>
            </div>
            <div>
              <dt>Duration</dt>
              <dd>{formatDuration(detail.durationMs)}</dd>
            </div>
            <div>
              <dt>Tokens</dt>
              <dd>{detail.totalTokensIn} in / {detail.totalTokensOut} out</dd>
            </div>
          </dl>

          {#if detail.steps.length > 0}
            <ol class="timeline" aria-label="Trajectory steps">
              {#each detail.steps as step (step.index)}
                <li>
                  <div class="step-marker">{step.index}</div>
                  <div class="step-body">
                    <div class="step-heading">
                      <strong>{step.stepType}</strong>
                      <span>{formatDateTime(step.timestamp)}</span>
                    </div>
                    <p>{step.summary}</p>
                    <dl class="step-meta">
                      {#if formatStepContext(step)}
                        <div>
                          <dt>Context</dt>
                          <dd>{formatStepContext(step)}</dd>
                        </div>
                      {/if}
                      <div>
                        <dt>Duration</dt>
                        <dd>{formatDuration(step.durationMs)}</dd>
                      </div>
                      {#if typeof step.retryCount === "number"}
                        <div>
                          <dt>Retries</dt>
                          <dd>{step.retryCount}</dd>
                        </div>
                      {/if}
                      {#if typeof step.tokensIn === "number" || typeof step.tokensOut === "number"}
                        <div>
                          <dt>Tokens</dt>
                          <dd>{step.tokensIn ?? 0} in / {step.tokensOut ?? 0} out</dd>
                        </div>
                      {/if}
                      {#if step.errorMessage}
                        <div>
                          <dt>Error</dt>
                          <dd>{step.errorCategory ?? step.errorMessage}</dd>
                        </div>
                      {/if}
                    </dl>
                  </div>
                </li>
              {/each}
            </ol>
          {:else}
            <div class="state-box">No trajectory steps returned</div>
          {/if}
        {:else}
          <div class="state-box">No trajectory selected</div>
        {/if}
      </article>
    </div>
  {/if}
</section>

<style>
  .trajectory-inspector {
    display: grid;
    grid-template-columns: minmax(160px, 220px) 1fr;
    min-height: 160px;
    max-height: 300px;
    border-bottom: 1px solid var(--ui-border-subtle);
    background: var(--ui-surface-primary);
    flex-shrink: 0;
  }

  .inspector-header {
    padding: 12px 14px;
    border-right: 1px solid var(--ui-border-subtle);
    background: var(--ui-surface-secondary);
    min-width: 0;
  }

  .eyebrow {
    color: var(--ui-text-secondary);
    font-size: 0.72rem;
    font-weight: 650;
    line-height: 1.2;
    text-transform: uppercase;
  }

  h2,
  h3,
  p {
    margin: 0;
  }

  h2 {
    margin-top: 2px;
    color: var(--ui-text-primary);
    font-size: 0.96rem;
    line-height: 1.2;
  }

  .inspector-header p,
  .detail-heading p {
    margin-top: 4px;
    color: var(--ui-text-secondary);
    font-size: 0.78rem;
    line-height: 1.35;
    overflow-wrap: anywhere;
  }

  .inspector-body {
    display: grid;
    grid-template-columns: minmax(190px, 280px) 1fr;
    min-width: 0;
    min-height: 0;
  }

  .trajectory-list {
    display: flex;
    flex-direction: column;
    gap: 0;
    min-width: 0;
    overflow-y: auto;
    border-right: 1px solid var(--ui-border-subtle);
  }

  .trajectory-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 10px;
    align-items: center;
    width: 100%;
    min-height: 58px;
    padding: 10px 12px;
    border: 0;
    border-bottom: 1px solid var(--ui-border-subtle);
    background: transparent;
    color: var(--ui-text-primary);
    cursor: pointer;
    text-align: left;
  }

  .trajectory-row:hover,
  .trajectory-row:focus-visible,
  .trajectory-row.active {
    background: var(--ui-surface-secondary);
    outline: none;
  }

  .trajectory-row.active {
    box-shadow: inset 3px 0 0 var(--ui-interactive-primary);
  }

  .row-main,
  .row-meta {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }

  .row-main strong {
    font-size: 0.84rem;
    line-height: 1.2;
    overflow-wrap: anywhere;
  }

  .row-main span,
  .row-meta span {
    color: var(--ui-text-secondary);
    font-size: 0.74rem;
    line-height: 1.2;
    overflow-wrap: anywhere;
  }

  .detail-panel {
    min-width: 0;
    min-height: 0;
    overflow-y: auto;
    padding: 12px 14px;
  }

  .detail-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;
  }

  .detail-heading h3 {
    margin-top: 2px;
    color: var(--ui-text-primary);
    font-size: 0.96rem;
    line-height: 1.2;
  }

  .detail-actions {
    display: flex;
    gap: 6px;
    flex: 0 0 auto;
  }

  .icon-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    flex: 0 0 30px;
    padding: 0;
    border: 1px solid var(--ui-border-subtle);
    border-radius: 4px;
    background: var(--ui-surface-primary);
    color: var(--ui-text-secondary);
    cursor: pointer;
    text-decoration: none;
  }

  .icon-button:hover,
  .icon-button:focus-visible {
    color: var(--ui-text-primary);
    border-color: var(--ui-border-strong);
    outline: none;
  }

  .detail-stats,
  .step-meta {
    display: grid;
    gap: 6px;
    margin: 0;
  }

  .detail-stats {
    grid-template-columns: repeat(5, minmax(0, 1fr));
    margin-bottom: 12px;
  }

  .detail-stats div,
  .step-meta div {
    min-width: 0;
  }

  dt {
    color: var(--ui-text-secondary);
    font-size: 0.68rem;
    font-weight: 650;
    line-height: 1.2;
    text-transform: uppercase;
  }

  dd {
    margin: 2px 0 0;
    color: var(--ui-text-primary);
    font-size: 0.78rem;
    line-height: 1.25;
    overflow-wrap: anywhere;
  }

  [data-outcome="success"] {
    color: var(--status-success);
  }

  [data-outcome="failed"],
  [data-outcome="cancelled"] {
    color: var(--status-error);
  }

  .timeline {
    display: grid;
    gap: 10px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .timeline li {
    display: grid;
    grid-template-columns: 26px minmax(0, 1fr);
    gap: 10px;
  }

  .step-marker {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: 1px solid var(--ui-border-subtle);
    border-radius: 50%;
    color: var(--ui-text-secondary);
    font-size: 0.72rem;
    font-weight: 700;
  }

  .step-body {
    min-width: 0;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--ui-border-subtle);
  }

  .step-heading {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 4px;
  }

  .step-heading strong {
    font-size: 0.82rem;
    line-height: 1.2;
  }

  .step-heading span {
    color: var(--ui-text-secondary);
    font-size: 0.72rem;
    line-height: 1.2;
    white-space: nowrap;
  }

  .step-body p {
    display: -webkit-box;
    margin-bottom: 8px;
    overflow: hidden;
    color: var(--ui-text-primary);
    font-size: 0.8rem;
    line-height: 1.35;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
  }

  .step-meta {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .state-box {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 44px;
    padding: 12px 14px;
    color: var(--ui-text-secondary);
    font-size: 0.84rem;
    line-height: 1.35;
  }

  .state-box[role="alert"] {
    color: var(--status-error);
  }

  @media (max-width: 900px) {
    .trajectory-inspector,
    .inspector-body {
      grid-template-columns: 1fr;
      max-height: none;
    }

    .inspector-header,
    .trajectory-list {
      border-right: none;
      border-bottom: 1px solid var(--ui-border-subtle);
    }

    .trajectory-list {
      max-height: 180px;
    }

    .detail-stats,
    .step-meta {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 560px) {
    .detail-heading,
    .trajectory-row,
    .step-heading {
      align-items: flex-start;
      grid-template-columns: 1fr;
      flex-direction: column;
    }

    .detail-stats,
    .step-meta {
      grid-template-columns: 1fr;
    }
  }
</style>
