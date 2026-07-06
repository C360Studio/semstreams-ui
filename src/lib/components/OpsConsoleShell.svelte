<script lang="ts">
  import { resolve } from "$app/paths";
  import {
    ArrowPath,
    ArrowTopRightOnSquare,
    ClipboardDocument,
    ClipboardDocumentCheck,
    Icon,
    InformationCircle,
  } from "svelte-hero-icons";
  import type { Snippet } from "svelte";
  import TrajectoryInspector from "$lib/components/runtime/TrajectoryInspector.svelte";
  import {
    trajectoryApi,
    type TrajectoryDetail,
  } from "$lib/services/trajectoryApi";
  import type { Flow } from "$lib/types/flow";
  import type { RuntimeState } from "$lib/types/ui-state";
  import type {
    OpsAvailability,
    OpsRuntimeEndpointSummary,
    OpsSummary,
  } from "$lib/services/opsSummaryApi";

  type ActiveFlow = Pick<Flow, "id" | "name" | "runtime_state">;

  interface OpsConsoleShellProps {
    productName?: string;
    activeFlow?: ActiveFlow | null;
    opsSummary?: OpsSummary | null;
    summaryLoading?: boolean;
    selectedEntityId?: string | null;
    graphStatus?: "loading" | "available" | "unavailable" | "unknown";
    sourceStatus?: "healthy" | "degraded" | "unavailable" | "unknown";
    onRefreshSummary?: () => void | Promise<void>;
    fetchTrajectoryDetail?: (loopId: string) => Promise<TrajectoryDetail>;
    writeClipboard?: (value: string) => void | Promise<void>;
    main: Snippet;
  }

  let {
    productName = "SemStreams",
    activeFlow = null,
    opsSummary = null,
    summaryLoading = false,
    selectedEntityId = null,
    graphStatus = "unknown",
    sourceStatus = "unknown",
    onRefreshSummary,
    fetchTrajectoryDetail = trajectoryApi.fetchDetail,
    writeClipboard = writeClipboardValue,
    main,
  }: OpsConsoleShellProps = $props();

  let refreshInFlight = $state(false);
  let copiedIdTarget = $state<"entity" | "flow" | "trajectory" | null>(null);

  const runtimeValue = $derived(
    activeFlow
      ? formatRuntimeState(activeFlow.runtime_state)
      : "No active flow",
  );
  const runtimeTone = $derived(
    activeFlow ? toneForRuntime(activeFlow.runtime_state) : "neutral",
  );
  const graphValue = $derived(formatGraphStatus(graphStatus));
  const graphTone = $derived(toneForAvailability(graphStatus));
  const sourceValue = $derived(formatSourceStatus(sourceStatus));
  const sourceTone = $derived(toneForAvailability(sourceStatus));
  const panelFlow = $derived(opsSummary?.runtime.activeFlow ?? activeFlow);
  const canRefreshSummary = $derived(
    Boolean(onRefreshSummary) && !summaryLoading && !refreshInFlight,
  );
  const healthValue = $derived(
    opsSummary ? formatAvailability(opsSummary.health.status) : "Unknown",
  );
  const runtimeSummaryValue = $derived(
    opsSummary ? formatAvailability(opsSummary.runtime.status) : runtimeValue,
  );
  const generatedAtValue = $derived(
    opsSummary ? formatGeneratedAt(opsSummary.generatedAt) : "Not loaded",
  );
  const trajectoryValue = $derived(
    opsSummary ? formatAvailability(opsSummary.trajectories.status) : "Unknown",
  );
  const latestTrajectory = $derived(
    opsSummary?.trajectories.items[0] ?? null,
  );

  async function handleRefreshSummary() {
    if (!onRefreshSummary || !canRefreshSummary) return;

    refreshInFlight = true;
    try {
      await onRefreshSummary();
    } finally {
      refreshInFlight = false;
    }
  }

  async function copyId(target: "entity" | "flow" | "trajectory", value: string | null) {
    if (!value) return;

    try {
      await writeClipboard(value);
      copiedIdTarget = target;
      setTimeout(() => {
        if (copiedIdTarget === target) copiedIdTarget = null;
      }, 1800);
    } catch {
      copiedIdTarget = null;
    }
  }

  function handleCopyEntityId() {
    void copyId("entity", selectedEntityId);
  }

  function handleCopyFlowId() {
    void copyId("flow", panelFlow?.id ?? null);
  }

  function handleCopyTrajectoryId() {
    void copyId("trajectory", latestTrajectory?.loopId ?? null);
  }

  function trajectoryProxyHref(loopId: string): string {
    return `/trajectories/${encodeURIComponent(loopId)}`;
  }

  async function writeClipboardValue(value: string) {
    const clipboard =
      globalThis.navigator?.clipboard ??
      (typeof window !== "undefined" ? window.navigator.clipboard : null);

    if (typeof clipboard?.writeText === "function") {
      await clipboard.writeText(value);
    }
  }

  function formatRuntimeState(state: RuntimeState): string {
    switch (state) {
      case "running":
        return "Running";
      case "deployed_stopped":
        return "Stopped";
      case "error":
        return "Error";
      case "not_deployed":
        return "Not deployed";
    }
  }

  function formatGraphStatus(
    status: OpsConsoleShellProps["graphStatus"],
  ): string {
    switch (status) {
      case "available":
        return "Available";
      case "loading":
        return "Loading";
      case "unavailable":
        return "Unavailable";
      case "unknown":
      default:
        return "Unknown";
    }
  }

  function formatSourceStatus(
    status: OpsConsoleShellProps["sourceStatus"],
  ): string {
    switch (status) {
      case "healthy":
        return "Healthy";
      case "degraded":
        return "Degraded";
      case "unavailable":
        return "Unavailable";
      case "unknown":
      default:
        return "Unknown";
    }
  }

  function formatAvailability(status: OpsAvailability): string {
    switch (status) {
      case "healthy":
        return "Healthy";
      case "degraded":
        return "Degraded";
      case "unavailable":
        return "Unavailable";
      case "unknown":
      default:
        return "Unknown";
    }
  }

  function formatEndpointSummary(endpoint: OpsRuntimeEndpointSummary): string {
    const status = formatAvailability(endpoint.status);
    const count =
      typeof endpoint.count === "number" ? ` (${endpoint.count})` : "";
    return `${status}${count}`;
  }

  function formatGeneratedAt(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown";
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  function formatTrajectoryLabel(): string {
    if (!latestTrajectory) return "No trajectory selected";
    return latestTrajectory.workflowSlug ?? latestTrajectory.role;
  }

  function toneForRuntime(
    state: RuntimeState,
  ): "success" | "warning" | "danger" | "neutral" {
    switch (state) {
      case "running":
        return "success";
      case "deployed_stopped":
      case "not_deployed":
        return "warning";
      case "error":
        return "danger";
    }
  }

  function toneForAvailability(
    status:
      | OpsConsoleShellProps["graphStatus"]
      | OpsConsoleShellProps["sourceStatus"],
  ): "success" | "warning" | "danger" | "neutral" {
    switch (status) {
      case "available":
      case "healthy":
        return "success";
      case "loading":
      case "degraded":
        return "warning";
      case "unavailable":
        return "danger";
      case "unknown":
      default:
        return "neutral";
    }
  }
</script>

<section class="ops-console-shell" data-testid="ops-console-shell">
  <header class="ops-header">
    <div class="title-block">
      <span class="section-label">Ops Console</span>
      <h1>{productName}</h1>
    </div>

    <nav class="ops-nav" aria-label="Ops console">
      <a href="#graph-explorer">Graph</a>
      <a href="#search-surface">Search</a>
      {#if activeFlow}
        <a href={resolve("/flows/[id]", { id: activeFlow.id })}>Admin</a>
      {:else}
        <a href={resolve("/flows")}>Admin</a>
      {/if}
      <a href={resolve("/flows")}>Flows</a>
    </nav>
  </header>

  <section
    class="ops-strip"
    aria-label="Ops console composition"
    data-testid="ops-strip"
  >
    <a
      class="ops-cell"
      data-tone={graphTone}
      href="#graph-explorer"
      data-testid="ops-area-graph"
    >
      <span class="cell-label">Graph</span>
      <strong>{graphValue}</strong>
    </a>

    <a
      class="ops-cell"
      data-tone="neutral"
      href="#search-surface"
      data-testid="ops-area-search"
    >
      <span class="cell-label">Search</span>
      <strong>Entity lookup</strong>
    </a>

    {#if activeFlow}
      <a
        class="ops-cell"
        data-tone={runtimeTone}
        href={resolve("/flows/[id]", { id: activeFlow.id })}
        data-testid="ops-area-runtime"
      >
        <span class="cell-label">Runtime/Admin</span>
        <strong>{runtimeValue}</strong>
        <span class="cell-detail">{activeFlow.name}</span>
      </a>
    {:else}
      <a
        class="ops-cell"
        data-tone={runtimeTone}
        href={resolve("/flows")}
        data-testid="ops-area-runtime"
      >
        <span class="cell-label">Runtime/Admin</span>
        <strong>{runtimeValue}</strong>
      </a>
    {/if}

    <div class="ops-cell" data-tone={sourceTone} data-testid="ops-area-source">
      <span class="cell-label">Source</span>
      <strong>{sourceValue}</strong>
    </div>
  </section>

  <section
    class="ops-admin-panel"
    aria-label="Read-side admin"
    data-testid="ops-admin-panel"
  >
    <div class="admin-toolbar">
      <div class="admin-title">
        <span class="cell-label">Read-side admin</span>
        <strong>{healthValue}</strong>
        <span class="cell-detail">Updated {generatedAtValue}</span>
      </div>

      <button
        type="button"
        class="icon-button"
        aria-label="Refresh ops summary"
        title="Refresh ops summary"
        onclick={handleRefreshSummary}
        disabled={!canRefreshSummary}
        data-testid="ops-refresh-summary"
      >
        <Icon src={ArrowPath} size="16" mini />
      </button>
    </div>

    <div class="admin-grid">
      <div class="admin-section">
        <div class="admin-section-heading">
          <Icon src={InformationCircle} size="16" mini />
          <span>Health inspection</span>
        </div>
        <dl class="status-list">
          <div>
            <dt>Backend</dt>
            <dd data-tone={opsSummary?.health.status ?? "unknown"}>
              {opsSummary?.health.message ?? "Health endpoint not loaded"}
            </dd>
          </div>
          <div>
            <dt>Graph</dt>
            <dd data-tone={opsSummary?.graph.status ?? "unknown"}>
              {opsSummary?.graph.message ?? "Graph endpoint not loaded"}
              {#if typeof opsSummary?.graph.entityCount === "number"}
                <span class="muted">({opsSummary.graph.entityCount} sampled)</span>
              {/if}
            </dd>
          </div>
          <div>
            <dt>Source</dt>
            <dd data-tone={opsSummary?.source.status ?? "unknown"}>
              {opsSummary?.source.message ?? "Source status not loaded"}
            </dd>
          </div>
        </dl>
      </div>

      <div class="admin-section">
        <div class="admin-section-heading">
          <Icon src={InformationCircle} size="16" mini />
          <span>Runtime</span>
        </div>
        <div class="flow-row">
          <div class="flow-copy-target">
            <span class="cell-label">Flow</span>
            <strong>{panelFlow?.name ?? "No active flow"}</strong>
            <span class="cell-detail">{panelFlow?.id ?? "No flow ID"}</span>
          </div>
          <div class="flow-actions">
            {#if panelFlow}
              <a
                class="icon-button"
                aria-label="Open active flow"
                title="Open active flow"
                href={resolve("/flows/[id]", { id: panelFlow.id })}
              >
                <Icon src={ArrowTopRightOnSquare} size="16" mini />
              </a>
            {/if}
            <button
              type="button"
              class="icon-button"
              aria-label="Copy flow ID"
              title="Copy flow ID"
              onclick={handleCopyFlowId}
              disabled={!panelFlow}
            >
              <Icon
                src={copiedIdTarget === "flow"
                  ? ClipboardDocumentCheck
                  : ClipboardDocument}
                size="16"
                mini
              />
            </button>
          </div>
        </div>
        <dl class="status-list compact">
          <div>
            <dt>Runtime</dt>
            <dd data-tone={opsSummary?.runtime.status ?? "unknown"}>
              {runtimeSummaryValue}
            </dd>
          </div>
          <div>
            <dt>Health</dt>
            <dd data-tone={opsSummary?.runtime.health.status ?? "unknown"}>
              {#if opsSummary}
                {formatEndpointSummary(opsSummary.runtime.health)}
              {:else}
                Unknown
              {/if}
            </dd>
          </div>
          <div>
            <dt>Metrics</dt>
            <dd data-tone={opsSummary?.runtime.metrics.status ?? "unknown"}>
              {#if opsSummary}
                {formatEndpointSummary(opsSummary.runtime.metrics)}
              {:else}
                Unknown
              {/if}
            </dd>
          </div>
          <div>
            <dt>Messages</dt>
            <dd data-tone={opsSummary?.runtime.messages.status ?? "unknown"}>
              {#if opsSummary}
                {formatEndpointSummary(opsSummary.runtime.messages)}
              {:else}
                Unknown
              {/if}
            </dd>
          </div>
        </dl>
      </div>

      <div class="admin-section">
        <div class="admin-section-heading">
          <Icon src={InformationCircle} size="16" mini />
          <span>Trajectories</span>
        </div>
        <div class="flow-row">
          <div class="flow-copy-target">
            <span class="cell-label">Latest</span>
            <strong>{formatTrajectoryLabel()}</strong>
            <span class="cell-detail">
              {latestTrajectory?.loopId ?? "No loop ID"}
            </span>
          </div>
          <div class="flow-actions">
            {#if latestTrajectory}
              <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
              <a href={trajectoryProxyHref(latestTrajectory.loopId)}
                class="icon-button"
                aria-label="Open latest trajectory"
                title="Open latest trajectory"
              >
                <Icon src={ArrowTopRightOnSquare} size="16" mini />
              </a>
            {/if}
            <button
              type="button"
              class="icon-button"
              aria-label="Copy trajectory ID"
              title="Copy trajectory ID"
              onclick={handleCopyTrajectoryId}
              disabled={!latestTrajectory}
            >
              <Icon
                src={copiedIdTarget === "trajectory"
                  ? ClipboardDocumentCheck
                  : ClipboardDocument}
                size="16"
                mini
              />
            </button>
          </div>
        </div>
        <dl class="status-list compact">
          <div>
            <dt>Status</dt>
            <dd data-tone={opsSummary?.trajectories.status ?? "unknown"}>
              {trajectoryValue}
            </dd>
          </div>
          <div>
            <dt>Total</dt>
            <dd data-tone={opsSummary?.trajectories.status ?? "unknown"}>
              {opsSummary?.trajectories.total ?? 0}
            </dd>
          </div>
          <div>
            <dt>Outcome</dt>
            <dd data-tone={opsSummary?.trajectories.status ?? "unknown"}>
              {latestTrajectory?.outcome ?? "Unknown"}
            </dd>
          </div>
          <div>
            <dt>Steps</dt>
            <dd data-tone={opsSummary?.trajectories.status ?? "unknown"}>
              {latestTrajectory?.iterations ?? 0}
            </dd>
          </div>
        </dl>
      </div>

      <div class="admin-section entity-section">
        <div class="admin-section-heading">
          <Icon src={InformationCircle} size="16" mini />
          <span>Entity</span>
        </div>
        <div class="flow-row">
          <div class="flow-copy-target">
            <span class="cell-label">Selected</span>
            <strong>{selectedEntityId ? "Entity selected" : "No entity selected"}</strong>
            <span class="cell-detail">{selectedEntityId ?? "Select a graph entity first"}</span>
          </div>
          <button
            type="button"
            class="icon-button"
            aria-label="Copy entity ID"
            title="Copy entity ID"
            onclick={handleCopyEntityId}
            disabled={!selectedEntityId}
          >
            <Icon
              src={copiedIdTarget === "entity"
                ? ClipboardDocumentCheck
                : ClipboardDocument}
              size="16"
              mini
            />
          </button>
        </div>
      </div>
    </div>
  </section>

  <TrajectoryInspector
    summary={opsSummary?.trajectories ?? null}
    fetchDetail={fetchTrajectoryDetail}
    {writeClipboard}
  />

  <div id="search-surface" class="search-anchor" aria-hidden="true"></div>

  <main id="graph-explorer" class="ops-main" data-testid="ops-main">
    {@render main()}
  </main>
</section>

<style>
  .ops-console-shell {
    display: flex;
    flex-direction: column;
    height: 100vh;
    min-height: 0;
    background: var(--ui-surface-primary);
    color: var(--ui-text-primary);
    overflow: hidden;
  }

  .ops-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    padding: 10px 16px;
    border-bottom: 1px solid var(--ui-border-subtle);
    background: var(--ui-surface-primary);
    flex-shrink: 0;
  }

  .title-block {
    display: flex;
    align-items: baseline;
    gap: 10px;
    min-width: 0;
  }

  .section-label {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--ui-text-secondary);
    white-space: nowrap;
  }

  h1 {
    margin: 0;
    font-size: 1.125rem;
    line-height: 1.2;
    font-weight: 650;
    color: var(--ui-text-primary);
    white-space: nowrap;
  }

  .ops-nav {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .ops-nav a {
    color: var(--ui-text-secondary);
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 500;
    padding: 6px 8px;
    border-radius: 4px;
  }

  .ops-nav a:hover,
  .ops-nav a:focus-visible {
    color: var(--ui-text-primary);
    background: var(--ui-surface-secondary);
    outline: none;
  }

  .ops-strip {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    border-bottom: 1px solid var(--ui-border-subtle);
    background: var(--ui-surface-secondary);
    flex-shrink: 0;
  }

  .ops-cell {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: 2px;
    min-width: 0;
    min-height: 58px;
    padding: 8px 14px;
    border-right: 1px solid var(--ui-border-subtle);
    color: var(--ui-text-primary);
    text-decoration: none;
    background: transparent;
  }

  .ops-cell:last-child {
    border-right: none;
  }

  .ops-cell:is(a):hover,
  .ops-cell:is(a):focus-visible {
    background: var(--ui-surface-tertiary);
    outline: none;
  }

  .cell-label {
    color: var(--ui-text-secondary);
    font-size: 0.72rem;
    font-weight: 650;
    line-height: 1.2;
    text-transform: uppercase;
  }

  .ops-cell strong {
    font-size: 0.9rem;
    line-height: 1.25;
    font-weight: 650;
    overflow-wrap: anywhere;
  }

  .cell-detail {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--ui-text-secondary);
    font-size: 0.78rem;
    line-height: 1.2;
  }

  .ops-cell[data-tone="success"] {
    box-shadow: inset 3px 0 0 var(--status-success);
  }

  .ops-cell[data-tone="warning"] {
    box-shadow: inset 3px 0 0 var(--status-warning);
  }

  .ops-cell[data-tone="danger"] {
    box-shadow: inset 3px 0 0 var(--status-error);
  }

  .ops-cell[data-tone="neutral"] {
    box-shadow: inset 3px 0 0 var(--ui-border-strong);
  }

  .ops-admin-panel {
    display: grid;
    grid-template-columns: minmax(160px, 220px) 1fr;
    gap: 0;
    min-height: 86px;
    border-bottom: 1px solid var(--ui-border-subtle);
    background: var(--ui-surface-primary);
    flex-shrink: 0;
  }

  .admin-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 14px;
    border-right: 1px solid var(--ui-border-subtle);
    background: var(--ui-surface-secondary);
    min-width: 0;
  }

  .admin-title {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .admin-title strong {
    font-size: 0.92rem;
    line-height: 1.2;
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

  .icon-button:hover:not(:disabled),
  .icon-button:focus-visible {
    color: var(--ui-text-primary);
    border-color: var(--ui-border-strong);
    outline: none;
  }

  .icon-button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  .admin-grid {
    display: grid;
    grid-template-columns:
      minmax(0, 1.15fr) minmax(0, 1fr) minmax(0, 1fr)
      minmax(0, 0.9fr);
    min-width: 0;
  }

  .admin-section {
    min-width: 0;
    padding: 10px 14px;
    border-right: 1px solid var(--ui-border-subtle);
  }

  .admin-section:last-child {
    border-right: none;
  }

  .admin-section-heading {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
    color: var(--ui-text-primary);
    font-size: 0.78rem;
    font-weight: 650;
    line-height: 1.2;
  }

  .status-list {
    display: grid;
    gap: 6px;
    margin: 0;
  }

  .status-list.compact {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin-top: 8px;
  }

  .status-list div {
    display: grid;
    grid-template-columns: 68px minmax(0, 1fr);
    gap: 8px;
    align-items: baseline;
    min-width: 0;
  }

  .status-list dt {
    color: var(--ui-text-secondary);
    font-size: 0.72rem;
    font-weight: 650;
    text-transform: uppercase;
  }

  .status-list dd {
    margin: 0;
    color: var(--ui-text-primary);
    font-size: 0.78rem;
    line-height: 1.25;
    overflow-wrap: anywhere;
  }

  .status-list dd[data-tone="healthy"],
  .status-list dd[data-tone="available"] {
    color: var(--status-success);
  }

  .status-list dd[data-tone="degraded"],
  .status-list dd[data-tone="loading"] {
    color: var(--status-warning);
  }

  .status-list dd[data-tone="unavailable"] {
    color: var(--status-error);
  }

  .muted {
    margin-left: 4px;
    color: var(--ui-text-secondary);
  }

  .flow-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    min-width: 0;
  }

  .flow-copy-target {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .flow-copy-target strong {
    font-size: 0.84rem;
    line-height: 1.2;
    overflow-wrap: anywhere;
  }

  .flow-actions {
    display: flex;
    gap: 6px;
    flex: 0 0 auto;
  }

  .search-anchor {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
  }

  .ops-main {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  @media (max-width: 900px) {
    .ops-header {
      align-items: flex-start;
      flex-direction: column;
      gap: 8px;
    }

    .ops-nav {
      justify-content: flex-start;
    }

    .ops-strip {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .ops-admin-panel {
      grid-template-columns: 1fr;
    }

    .admin-toolbar {
      border-right: none;
      border-bottom: 1px solid var(--ui-border-subtle);
    }

    .admin-grid {
      grid-template-columns: 1fr;
    }

    .admin-section {
      border-right: none;
      border-bottom: 1px solid var(--ui-border-subtle);
    }

    .admin-section:last-child {
      border-bottom: none;
    }

    .ops-cell:nth-child(2) {
      border-right: none;
    }
  }

  @media (max-width: 560px) {
    .title-block {
      align-items: flex-start;
      flex-direction: column;
      gap: 2px;
    }

    .ops-strip {
      grid-template-columns: 1fr;
    }

    .ops-cell {
      border-right: none;
      border-bottom: 1px solid var(--ui-border-subtle);
    }

    .ops-cell:last-child {
      border-bottom: none;
    }

    .status-list.compact {
      grid-template-columns: 1fr;
    }

    .status-list div {
      grid-template-columns: 82px minmax(0, 1fr);
    }
  }
</style>
