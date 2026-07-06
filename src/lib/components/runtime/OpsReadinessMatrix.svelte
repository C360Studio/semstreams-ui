<script lang="ts">
  import type {
    OpsAvailability,
    OpsGraphStatus,
    OpsSummary,
  } from "$lib/services/opsSummaryApi";

  export interface OpsReadinessMatrixProps {
    summary?: OpsSummary | null;
  }

  type ReadinessStatus = OpsAvailability | OpsGraphStatus;

  interface ReadinessRow {
    id: string;
    label: string;
    basis: string;
    status: ReadinessStatus;
    message: string;
    statusCode?: number;
    count?: number;
  }

  let { summary = null }: OpsReadinessMatrixProps = $props();

  const rows = $derived.by((): ReadinessRow[] => {
    if (!summary) return [];

    const activeFlowId = summary.runtime.activeFlow?.id ?? null;
    const runtimeBasis = (path: string, fallback: string) =>
      activeFlowId
        ? `/flowbuilder/flows/${encodeURIComponent(activeFlowId)}/runtime/${path}`
        : fallback;

    return [
      {
        id: "backend-health",
        label: "Backend health",
        basis: "/health",
        status: summary.health.status,
        message: summary.health.message,
        statusCode: summary.health.statusCode,
      },
      {
        id: "graph-query",
        label: "Graph query",
        basis: "/graphql",
        status: summary.graph.status,
        message: summary.graph.message,
        statusCode: summary.graph.statusCode,
        count: summary.graph.entityCount,
      },
      {
        id: "flow-list",
        label: "Flow list",
        basis: "/flowbuilder/flows",
        status: summary.runtime.flowList.status,
        message: summary.runtime.flowList.message,
        statusCode: summary.runtime.flowList.statusCode,
        count: summary.runtime.flowList.count,
      },
      {
        id: "runtime-health",
        label: "Runtime health",
        basis: runtimeBasis("health", "active-flow runtime health"),
        status: summary.runtime.health.status,
        message: summary.runtime.health.message,
        statusCode: summary.runtime.health.statusCode,
        count: summary.runtime.health.count,
      },
      {
        id: "runtime-metrics",
        label: "Runtime metrics",
        basis: runtimeBasis("metrics", "active-flow runtime metrics"),
        status: summary.runtime.metrics.status,
        message: summary.runtime.metrics.message,
        statusCode: summary.runtime.metrics.statusCode,
        count: summary.runtime.metrics.count,
      },
      {
        id: "runtime-messages",
        label: "Runtime messages",
        basis: runtimeBasis("messages?limit=1", "active-flow runtime messages"),
        status: summary.runtime.messages.status,
        message: summary.runtime.messages.message,
        statusCode: summary.runtime.messages.statusCode,
        count: summary.runtime.messages.count,
      },
      {
        id: "trajectory-summary",
        label: "Trajectory summary",
        basis: "/trajectories?limit=5",
        status: summary.trajectories.status,
        message: summary.trajectories.message,
        statusCode: summary.trajectories.statusCode,
        count: summary.trajectories.total,
      },
      {
        id: "source-readiness",
        label: "Source readiness",
        basis: summary.source.basis,
        status: summary.source.status,
        message: summary.source.message,
      },
    ];
  });

  function formatStatus(status: ReadinessStatus): string {
    switch (status) {
      case "available":
        return "Available";
      case "healthy":
        return "Healthy";
      case "degraded":
        return "Degraded";
      case "loading":
        return "Loading";
      case "unavailable":
        return "Unavailable";
      case "unknown":
      default:
        return "Unknown";
    }
  }

  function toneForStatus(
    status: ReadinessStatus,
  ): "success" | "warning" | "danger" | "neutral" {
    switch (status) {
      case "available":
      case "healthy":
        return "success";
      case "degraded":
      case "loading":
        return "warning";
      case "unavailable":
        return "danger";
      case "unknown":
      default:
        return "neutral";
    }
  }
</script>

<section
  class="ops-readiness-panel"
  aria-labelledby="ops-readiness-heading"
>
  <header class="matrix-heading">
    <div>
      <span class="eyebrow">Endpoint readiness</span>
      <h2 id="ops-readiness-heading">Readiness matrix</h2>
    </div>
    <p>Generic read-path evidence</p>
  </header>

  {#if rows.length === 0}
    <p class="empty-state" role="status">Ops summary not loaded</p>
  {:else}
    <div class="table-scroll">
      <table
        aria-label="Readiness matrix"
        class="readiness-table"
        data-testid="ops-readiness-matrix"
      >
        <caption>Readiness matrix</caption>
        <thead>
          <tr>
            <th scope="col">Read path</th>
            <th scope="col">Path or basis</th>
            <th scope="col">Status</th>
            <th scope="col">Message</th>
            <th scope="col">HTTP</th>
            <th scope="col">Count</th>
          </tr>
        </thead>
        <tbody>
          {#each rows as row (row.id)}
            <tr
              data-testid={`ops-readiness-row-${row.id}`}
              data-tone={toneForStatus(row.status)}
            >
              <th scope="row">{row.label}</th>
              <td class="basis-cell">{row.basis}</td>
              <td>
                <span class="status-pill" data-tone={toneForStatus(row.status)}>
                  {formatStatus(row.status)}
                </span>
              </td>
              <td class="message-cell">{row.message}</td>
              <td>
                {#if typeof row.statusCode === "number"}
                  HTTP {row.statusCode}
                {:else}
                  Not reported
                {/if}
              </td>
              <td>
                {#if typeof row.count === "number"}
                  Count {row.count}
                {:else}
                  Not reported
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</section>

<style>
  .ops-readiness-panel {
    display: grid;
    grid-template-columns: minmax(160px, 220px) minmax(0, 1fr);
    min-width: 0;
    background: var(--ui-surface-primary);
  }

  .matrix-heading {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 8px;
    min-width: 0;
    padding: 10px 14px;
    border-right: 1px solid var(--ui-border-subtle);
    background: var(--ui-surface-secondary);
  }

  .eyebrow {
    color: var(--ui-text-secondary);
    font-size: 0.7rem;
    font-weight: 650;
    line-height: 1.2;
    text-transform: uppercase;
  }

  h2 {
    margin: 2px 0 0;
    color: var(--ui-text-primary);
    font-size: 0.96rem;
    line-height: 1.2;
  }

  p {
    margin: 0;
    color: var(--ui-text-secondary);
    font-size: 0.78rem;
    line-height: 1.3;
  }

  .empty-state {
    display: flex;
    align-items: center;
    min-height: 72px;
    padding: 12px 14px;
    color: var(--ui-text-secondary);
  }

  .table-scroll {
    min-width: 0;
    max-height: 184px;
    overflow: auto;
  }

  table {
    width: 100%;
    min-width: 760px;
    border-collapse: collapse;
  }

  caption {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }

  th,
  td {
    padding: 7px 10px;
    border-bottom: 1px solid var(--ui-border-subtle);
    color: var(--ui-text-primary);
    font-size: 0.76rem;
    line-height: 1.25;
    text-align: left;
    vertical-align: top;
  }

  thead th {
    position: sticky;
    top: 0;
    z-index: 1;
    background: var(--ui-surface-secondary);
    color: var(--ui-text-secondary);
    font-size: 0.68rem;
    font-weight: 650;
    text-transform: uppercase;
  }

  tbody th {
    width: 136px;
    font-weight: 650;
  }

  .basis-cell,
  .message-cell {
    overflow-wrap: anywhere;
  }

  .status-pill {
    display: inline-flex;
    align-items: center;
    padding: 2px 7px;
    border: 1px solid var(--ui-border-subtle);
    border-radius: 999px;
    color: var(--ui-text-secondary);
    font-size: 0.72rem;
    font-weight: 650;
    line-height: 1.2;
    white-space: nowrap;
  }

  .status-pill[data-tone="success"] {
    color: var(--status-success);
  }

  .status-pill[data-tone="warning"] {
    color: var(--status-warning);
  }

  .status-pill[data-tone="danger"] {
    color: var(--status-error);
  }

  tr[data-tone="danger"] {
    box-shadow: inset 3px 0 0 var(--status-error);
  }

  tr[data-tone="warning"] {
    box-shadow: inset 3px 0 0 var(--status-warning);
  }

  tr[data-tone="success"] {
    box-shadow: inset 3px 0 0 var(--status-success);
  }

  @media (max-width: 900px) {
    .ops-readiness-panel {
      grid-template-columns: 1fr;
    }

    .matrix-heading {
      border-right: none;
      border-bottom: 1px solid var(--ui-border-subtle);
    }
  }
</style>
