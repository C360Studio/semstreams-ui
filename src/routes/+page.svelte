<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import FlowList from '$lib/components/FlowList.svelte';
	import { flowApi } from '$lib/services/flowApi';
	import { checkBackendHealth, getUserFriendlyErrorMessage } from '$lib/services/healthCheck';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let backendHealthy = $state<boolean | null>(null);
	let backendHealthMessage = $state<string>('');

	onMount(async () => {
		// Check backend health on page load
		const health = await checkBackendHealth();
		backendHealthy = health.healthy;
		backendHealthMessage = health.message;
	});

	async function handleCreateFlow() {
		try {
			const newFlow = await flowApi.createFlow({
				name: `Flow ${new Date().toISOString()}`,
				description: 'New flow created from UI'
			});
			// Navigate to the new flow's editor using dynamic route parameter
			// We use template literal for dynamic ID - resolveRoute not needed for simple param substitution
			// eslint-disable-next-line svelte/no-navigation-without-resolve
			await goto(`/flows/${newFlow.id}`);
		} catch (error) {
			console.error('Failed to create flow:', error);
			const message = getUserFriendlyErrorMessage(error);
			alert(`Failed to create flow: ${message}`);
		}
	}

	function handleFlowClick(flowId: string) {
		// Dynamic route navigation with flow ID parameter
		// We use template literal for dynamic ID - resolveRoute not needed for simple param substitution
		// eslint-disable-next-line svelte/no-navigation-without-resolve
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

	{#if backendHealthy === false}
		<div class="connectivity-banner">
			<strong>⚠️ Backend Not Available</strong>
			<p>{backendHealthMessage}</p>
			<p class="help-text">
				Please ensure your backend service is running. Check the README for setup instructions.
			</p>
		</div>
	{/if}

	{#if data.error && backendHealthy !== false}
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

	.connectivity-banner {
		padding: 1.5rem;
		margin-bottom: 1.5rem;
		background: var(--warning-bg, #fff3cd);
		color: var(--warning-text, #856404);
		border: 2px solid var(--warning-border, #ffc107);
		border-radius: 6px;
	}

	.connectivity-banner strong {
		display: block;
		font-size: 1.125rem;
		margin-bottom: 0.5rem;
	}

	.connectivity-banner p {
		margin: 0.5rem 0;
	}

	.connectivity-banner .help-text {
		font-size: 0.875rem;
		color: var(--warning-text-muted, #6c5a1a);
		margin-top: 1rem;
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
