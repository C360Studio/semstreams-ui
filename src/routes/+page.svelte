<script lang="ts">
	import { goto } from '$app/navigation';
	import FlowList from '$lib/components/FlowList.svelte';
	import { flowApi } from '$lib/services/flowApi';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	async function handleCreateFlow() {
		try {
			const newFlow = await flowApi.createFlow({
				name: `Flow ${new Date().toISOString()}`,
				description: 'New flow created from UI'
			});
			// Navigate to the new flow's editor
			await goto(`/flows/${newFlow.id}`);
		} catch (error) {
			console.error('Failed to create flow:', error);
			alert('Failed to create flow: ' + (error instanceof Error ? error.message : 'Unknown error'));
		}
	}

	function handleFlowClick(flowId: string) {
		goto(`/flows/${flowId}`);
	}
</script>

<svelte:head>
	<title>SemStreams - Flow Builder</title>
</svelte:head>

<main>
	<div class="page-header">
		<h1>Visual Flow Builder</h1>
		<p>Create and manage semantic stream processing flows</p>
	</div>

	{#if data.error}
		<div class="error-banner">
			<strong>Error:</strong>
			{data.error}
		</div>
	{/if}

	<FlowList flows={data.flows} onCreate={handleCreateFlow} onFlowClick={handleFlowClick} />
</main>

<style>
	main {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}

	.page-header {
		margin-bottom: 2rem;
	}

	.page-header h1 {
		font-size: 2rem;
		margin: 0 0 0.5rem 0;
		color: var(--heading-color, #212529);
	}

	.page-header p {
		margin: 0;
		color: var(--text-muted, #6c757d);
		font-size: 1.125rem;
	}

	.error-banner {
		padding: 1rem;
		margin-bottom: 1.5rem;
		background: var(--error-bg, #f8d7da);
		color: var(--error-text, #721c24);
		border: 1px solid var(--error-border, #f5c6cb);
		border-radius: 4px;
	}

	.error-banner strong {
		font-weight: 600;
	}
</style>
