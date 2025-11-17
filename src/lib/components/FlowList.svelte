<script lang="ts">
	import type { Flow } from '$lib/types/flow';

	interface FlowListProps {
		flows: Flow[];
		onFlowClick?: (flowId: string) => void;
		onCreate?: () => void;
	}

	let { flows, onFlowClick, onCreate }: FlowListProps = $props();
</script>

<div class="flow-list">
	<header>
		<h2>Flows</h2>
		<button onclick={() => onCreate?.()} aria-label="Create New Flow">Create New Flow</button>
	</header>

	{#if flows.length === 0}
		<div class="empty-state">
			<p>No flows yet. Create your first flow to get started.</p>
		</div>
	{:else}
		<div class="flow-grid">
			{#each flows as flow (flow.id)}
				<button class="flow-card" onclick={() => onFlowClick?.(flow.id)}>
					<h3>{flow.name}</h3>
					{#if flow.description}
						<p class="description">{flow.description}</p>
					{/if}
					<span class="runtime-state {flow.runtime_state}">
						{flow.runtime_state}
					</span>
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.flow-list {
		padding: 1rem;
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
	}

	.empty-state {
		text-align: center;
		padding: 3rem;
		color: var(--muted-color, #666);
	}

	.flow-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1rem;
	}

	.flow-card {
		background: var(--card-background, white);
		border: 1px solid var(--card-border, #ddd);
		border-radius: 8px;
		padding: 1.5rem;
		text-align: left;
		cursor: pointer;
		transition: all 0.2s;
	}

	.flow-card:hover {
		border-color: var(--primary-color, #007bff);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.flow-card h3 {
		margin: 0 0 0.5rem 0;
		font-size: 1.25rem;
	}

	.description {
		color: var(--muted-color, #666);
		margin: 0 0 1rem 0;
		font-size: 0.9rem;
	}

	.runtime-state {
		display: inline-block;
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: uppercase;
	}

	.runtime-state.not_deployed {
		background: var(--state-not-deployed, #e9ecef);
		color: var(--state-not-deployed-text, #495057);
	}

	.runtime-state.deployed_stopped {
		background: var(--state-stopped, #fff3cd);
		color: var(--state-stopped-text, #856404);
	}

	.runtime-state.running {
		background: var(--state-running, #d4edda);
		color: var(--state-running-text, #155724);
	}

	.runtime-state.error {
		background: var(--state-error, #f8d7da);
		color: var(--state-error-text, #721c24);
	}
</style>
