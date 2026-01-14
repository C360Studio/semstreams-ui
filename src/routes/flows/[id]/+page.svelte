<script lang="ts">
	import FlowCanvas from '$lib/components/FlowCanvas.svelte';
	import ComponentList from '$lib/components/ComponentList.svelte';
	import AddComponentModal from '$lib/components/AddComponentModal.svelte';
	import EditComponentModal from '$lib/components/EditComponentModal.svelte';
	import StatusBar from '$lib/components/StatusBar.svelte';
	import RuntimePanel from '$lib/components/RuntimePanel.svelte';
	import SaveStatusIndicator from '$lib/components/SaveStatusIndicator.svelte';
	import NavigationGuard from '$lib/components/NavigationGuard.svelte';
	import NavigationDialog from '$lib/components/NavigationDialog.svelte';
	import ValidationErrorDialog from '$lib/components/ValidationErrorDialog.svelte';
	import DeployErrorModal from '$lib/components/DeployErrorModal.svelte';
	import ValidationStatusModal from '$lib/components/ValidationStatusModal.svelte';
	import AIPromptInput from '$lib/components/AIPromptInput.svelte';
	import AIFlowPreview from '$lib/components/AIFlowPreview.svelte';
	import type { PageData } from './$types';
	import type { ComponentInstance, FlowNode, FlowConnection, Flow } from '$lib/types/flow';
	import type { SaveState, RuntimeStateInfo } from '$lib/types/ui-state';
	import type { ValidationResult as PortValidationResult, ValidatedPort } from '$lib/types/port';
	import type { ValidationResult as SimpleValidationResult } from '$lib/types/validation';
	import type { ComponentType } from '$lib/types/component';
	import { saveFlow, deployFlow, startFlow, stopFlow, isValidationError } from '$lib/api/flows';
	import { flowHistory } from '$lib/stores/flowHistory.svelte';
	import { onMount } from 'svelte';

	let { data }: { data: PageData } = $props();

	// Backend flow (domain model) - source of truth for persistence
	let backendFlow = $state(data.flow);

	// UI state
	let dirty = $state(false);
	let selectedComponent = $state<ComponentInstance | null>(null);

	// Component types for add modal (fetched from backend)
	let componentTypes = $state<ComponentType[]>([]);

	// Modal state
	let showAddModal = $state(false);
	let showEditModal = $state(false);
	let editingNode = $state<FlowNode | null>(null);
	let editingComponentType = $state<ComponentType | undefined>(undefined);

	// Navigation dialog state
	let showNavigationDialog = $state(false);
	let navigationGuard: NavigationGuard;
	let shouldNavigateAfterSave = $state(false);

	// Validation error dialog state
	let showValidationDialog = $state(false);
	let deployValidationResult = $state<any>(null);

	// Deploy error modal state (Gate 3: Deploy-Time Validation)
	let showDeployErrorModal = $state(false);

	// Validation status modal state (Feature 015 - T014)
	let showValidationStatusModal = $state(false);

	// AI flow generation state
	let showAIPreview = $state(false);
	let aiLoading = $state(false);
	let aiGeneratedFlow = $state<Partial<Flow> | null>(null);
	let aiValidationResult = $state<SimpleValidationResult | null>(null);
	let aiError = $state<string | null>(null);
	let lastAIPrompt = $state<string>('');

	// Real-time validation state (for port visualization)
	let validationResult = $state<PortValidationResult | null>(null);

	// Compute if flow is valid for deployment
	const isFlowValid = $derived(validationResult?.validation_status !== 'errors');

	// Deploy sequencing state
	let pendingDeploy = $state(false);

	// Save state tracking
	let saveState = $state<SaveState>({
		status: 'clean',
		lastSaved: null,
		error: null
	});

	// Runtime state tracking
	let runtimeState = $state<RuntimeStateInfo>({
		state: data.flow.runtime_state,
		message: null,
		lastTransition: null
	});

	// Runtime panel state
	let showRuntimePanel = $state(false);
	let runtimePanelHeight = $state(300);

	// Flow state - work directly with domain model
	let flowNodes = $state<FlowNode[]>(backendFlow.nodes);
	let flowConnections = $state<FlowConnection[]>(backendFlow.connections);

	// Port information from validation results
	type PortsMap = Record<string, { input_ports: ValidatedPort[]; output_ports: ValidatedPort[] }>;
	let portsMap = $state<PortsMap>({});

	// Track dirty state when nodes/connections change
	let initialNodeCount = flowNodes.length;
	let initialConnectionCount = flowConnections.length;
	let initialLoadComplete = false;

	// Fetch component types on mount
	onMount(async () => {
		try {
			const response = await fetch('/components/types');
			if (response.ok) {
				componentTypes = await response.json();
			}
		} catch (error) {
			console.error('Failed to fetch component types:', error);
		}
	});

	// Canvas event handlers
	function handleNodeClick(nodeId: string) {
		const flowNode = flowNodes.find((n) => n.id === nodeId);
		if (flowNode) {
			selectedComponent = {
				...flowNode,
				health: {
					status: 'not_running',
					lastUpdated: new Date().toISOString()
				}
			};
		}
	}

	$effect(() => {
		// Watch for changes to flowNodes or flowConnections
		const nodeCount = flowNodes.length;
		const connectionCount = flowConnections.length;

		// Skip initial load
		if (nodeCount === initialNodeCount && connectionCount === initialConnectionCount) {
			return;
		}

		// Skip marking dirty until initial load completes and first validation runs
		if (!initialLoadComplete) {
			initialNodeCount = nodeCount;
			initialConnectionCount = connectionCount;
			initialLoadComplete = true;
			return;
		}

		// Mark dirty when nodes or connections change
		dirty = true;
		saveState = { ...saveState, status: 'dirty' };

		// Update baseline
		initialNodeCount = nodeCount;
		initialConnectionCount = connectionCount;
	});

	// Debounced validation on canvas changes (500ms delay)
	let validationTimer: ReturnType<typeof setTimeout> | null = null;
	let lastValidatedSignature = '';

	$effect(() => {
		// Create signature from things that represent USER changes only
		// Ignore auto connections (they're generated by validation)
		const nodeIds = flowNodes.map(n => n.id).sort().join(',');
		const manualConnectionIds = flowConnections
			.filter(c => c.id.startsWith('conn_'))  // Only manual connections
			.map(c => c.id)
			.sort()
			.join(',');
		const signature = `${nodeIds}|${manualConnectionIds}`;

		// Skip if nothing changed since last validation
		// This prevents validation from triggering itself when it adds/removes auto connections
		if (signature === lastValidatedSignature) {
			return;
		}

		// Clear existing timer
		if (validationTimer) {
			clearTimeout(validationTimer);
		}

		// Schedule validation after 500ms of inactivity
		validationTimer = setTimeout(async () => {
			const result = await runFlowValidation(backendFlow.id);
			validationResult = result;

			if (result) {
				// Apply validation (populates portsMap and updates auto connections)
				applyValidationToNodes(result);
				updateAutoConnections(result);

				// Update signature to match current state after validation
				// When effect re-runs, it will see signature matches and skip
				const nodeIds = flowNodes.map(n => n.id).sort().join(',');
				const manualConnectionIds = flowConnections
					.filter(c => c.id.startsWith('conn_'))
					.map(c => c.id)
					.sort()
					.join(',');
				lastValidatedSignature = `${nodeIds}|${manualConnectionIds}`;

				// Update save state based on validation
				if (result.validation_status === 'errors' && !dirty && saveState.status === 'clean') {
					saveState = {
						status: 'draft',
						lastSaved: saveState.lastSaved,
						error: `${result.errors.length} error${result.errors.length > 1 ? 's' : ''}`,
						validationResult: result
					};
				} else if (result.validation_status !== 'errors' && saveState.status === 'draft') {
					saveState = {
						status: 'clean',
						lastSaved: saveState.lastSaved,
						error: null,
						validationResult: result
					};
				} else {
					saveState = { ...saveState, validationResult: result };
				}
			}
		}, 500);

		// Cleanup
		return () => {
			if (validationTimer) {
				clearTimeout(validationTimer);
			}
		};
	});

	/**
	 * Run flow validation via backend API
	 * Calls the real validation endpoint that returns port information
	 * Sends current flow state (may be unsaved) for real-time validation
	 */
	async function runFlowValidation(flowId: string): Promise<PortValidationResult | null> {
		try {
			const flowDefinition = {
				id: flowId,
				name: backendFlow.name,
				runtime_state: backendFlow.runtime_state,
				nodes: flowNodes,
				connections: flowConnections
			};

			console.log('[runFlowValidation] Sending node IDs to validation:', flowNodes.map(n => n.id));

			const response = await fetch(`/flowbuilder/flows/${flowId}/validate`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(flowDefinition)
			});

			if (!response.ok) {
				console.error('Validation request failed:', response.status, response.statusText);
				return null;
			}

			const result = await response.json();
			return result;
		} catch (error) {
			console.error('Validation failed:', error);
			return null;
		}
	}

	/**
	 * Update auto-discovered connections from validation results
	 * Removes old auto connections and creates new ones from FlowGraph pattern matching
	 */
	function updateAutoConnections(result: PortValidationResult) {
		// Step 1: Remove old auto-discovered connections by filtering
		flowConnections = flowConnections.filter(conn => !conn.id.startsWith('auto_'));

		// Step 2: Create new auto-discovered connections from validation result
		// Safety check: discovered_connections might be undefined or null
		if (!result.discovered_connections || result.discovered_connections.length === 0) {
			return;
		}

		const newAutoConnections = result.discovered_connections.map((conn) => {
			const connectionId = `auto_${conn.source_node_id}_${conn.source_port}_${conn.target_node_id}_${conn.target_port}`;

			const flowConnection: FlowConnection = {
				id: connectionId,
				source_node_id: conn.source_node_id,
				source_port: conn.source_port,
				target_node_id: conn.target_node_id,
				target_port: conn.target_port,
				source: 'auto',
				validationState: 'valid'
			};

			console.log('[updateAutoConnections] Created connection:', JSON.stringify(flowConnection, null, 2));
			return flowConnection;
		});

		// Step 3: Add new auto-discovered connections
		console.log('[updateAutoConnections] Adding', newAutoConnections.length, 'auto connections');
		flowConnections = [...flowConnections, ...newAutoConnections];
		console.log('[updateAutoConnections] Total connections after update:', flowConnections.length);
	}

	/**
	 * Apply validation results to populate portsMap
	 * Updates port information from backend validation for visualization
	 */
	function applyValidationToNodes(result: PortValidationResult) {
		// Build portsMap from validation result
		if (result.nodes && result.nodes.length > 0) {
			const newPortsMap: PortsMap = {};

			for (const validatedNode of result.nodes) {
				newPortsMap[validatedNode.id] = {
					input_ports: validatedNode.input_ports,
					output_ports: validatedNode.output_ports
				};
			}

			portsMap = newPortsMap;
		}

		// Mark connections with errors
		if (result.errors.length > 0) {
			flowConnections = flowConnections.map(conn => {
				const hasError = result.errors.some(
					(err) =>
						err.component_name === conn.source_node_id ||
						err.component_name === conn.target_node_id
				);

				if (hasError) {
					return {
						...conn,
						validationState: 'error' as const
					};
				}

				return conn;
			});
		}
	}

	// ComponentList handlers
	function handleSelectNode(nodeId: string) {
		handleNodeClick(nodeId);
	}

	function handleEditNode(nodeId: string) {
		const node = flowNodes.find((n) => n.id === nodeId);
		if (node) {
			editingNode = node;
			editingComponentType = componentTypes.find((ct) => ct.id === node.type);
			showEditModal = true;
		}
	}

	function handleDeleteNode(nodeId: string) {
		flowNodes = flowNodes.filter((n) => n.id !== nodeId);
		// Also remove connections involving this node
		flowConnections = flowConnections.filter(
			(c) => c.source_node_id !== nodeId && c.target_node_id !== nodeId
		);
		// Clear selection if deleted node was selected
		if (selectedComponent?.id === nodeId) {
			selectedComponent = null;
		}
		dirty = true;
		saveState = { ...saveState, status: 'dirty' };
	}

	function handleOpenAddModal() {
		showAddModal = true;
	}

	// AddComponentModal handlers
	function handleAddComponentFromModal(
		componentType: ComponentType,
		name: string,
		config: Record<string, unknown>
	) {
		const nodeId = `node_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

		const flowNode: FlowNode = {
			id: nodeId,
			type: componentType.id,
			name: name,
			position: {
				x: 400 + (flowNodes.length % 3) * 200,
				y: 300 + Math.floor(flowNodes.length / 3) * 150
			},
			config: config
		};

		flowNodes = [...flowNodes, flowNode];
		showAddModal = false;
		dirty = true;
		saveState = { ...saveState, status: 'dirty' };
	}

	function handleCloseAddModal() {
		showAddModal = false;
	}

	// EditComponentModal handlers
	function handleSaveEdit(nodeId: string, name: string, config: Record<string, unknown>) {
		flowNodes = flowNodes.map((node) =>
			node.id === nodeId ? { ...node, name, config } : node
		);
		showEditModal = false;
		editingNode = null;
		dirty = true;
		saveState = { ...saveState, status: 'dirty' };

		// Update selected component if it was being edited
		if (selectedComponent?.id === nodeId) {
			const updated = flowNodes.find((n) => n.id === nodeId);
			if (updated) {
				selectedComponent = {
					...updated,
					health: selectedComponent.health
				};
			}
		}
	}

	function handleDeleteFromEditModal(nodeId: string) {
		handleDeleteNode(nodeId);
		showEditModal = false;
		editingNode = null;
	}

	function handleCloseEditModal() {
		showEditModal = false;
		editingNode = null;
	}

	// AI Flow Generation handlers
	async function handleAISubmit(prompt: string) {
		aiLoading = true;
		aiError = null;
		lastAIPrompt = prompt;

		try {
			// Prepare existing flow context for modification
			const existingFlow = flowNodes.length > 0 ? {
				id: backendFlow.id,
				nodes: flowNodes,
				connections: flowConnections
			} : undefined;

			const response = await fetch('/api/ai/generate-flow', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ prompt, existingFlow })
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to generate flow');
			}

			const data = await response.json();
			aiGeneratedFlow = data.flow;
			aiValidationResult = data.validationResult;
			showAIPreview = true;
		} catch (err) {
			aiError = err instanceof Error ? err.message : 'Failed to generate flow';
			aiGeneratedFlow = null;
			aiValidationResult = null;
			showAIPreview = true; // Show preview with error
		} finally {
			aiLoading = false;
		}
	}

	function handleAIApply() {
		if (!aiGeneratedFlow) return;

		// Save current state to history for undo
		flowHistory.push({
			...backendFlow,
			nodes: flowNodes,
			connections: flowConnections
		});

		// Apply AI-generated flow to canvas
		if (aiGeneratedFlow.nodes) {
			flowNodes = [...aiGeneratedFlow.nodes];
		}
		if (aiGeneratedFlow.connections) {
			flowConnections = [...aiGeneratedFlow.connections];
		}

		// Mark as dirty
		dirty = true;
		saveState = { ...saveState, status: 'dirty' };

		// Close preview
		showAIPreview = false;
		aiGeneratedFlow = null;
		aiValidationResult = null;
		aiError = null;
	}

	function handleAIReject() {
		showAIPreview = false;
		aiGeneratedFlow = null;
		aiValidationResult = null;
		aiError = null;
	}

	async function handleAIRetry() {
		showAIPreview = false;
		if (lastAIPrompt) {
			await handleAISubmit(lastAIPrompt);
		}
	}

	function handleAIClose() {
		showAIPreview = false;
		aiGeneratedFlow = null;
		aiValidationResult = null;
		aiError = null;
	}

	// Track if operations are in progress to prevent concurrent mutations
	let saveInProgress = false;

	// Save handler using fetch API
	async function handleSave() {
		if (saveInProgress) {
			return;
		}

		saveInProgress = true;
		saveState = { ...saveState, status: 'saving' };

		try {
			// Validate before saving (Gate 2: Save-Time Validation)
			const validation = await runFlowValidation(backendFlow.id);

			// Save the flow (even if invalid - draft mode)
			const updated = await saveFlow(backendFlow.id, {
				id: backendFlow.id,
				name: backendFlow.name,
				description: backendFlow.description,
				version: backendFlow.version,
				runtime_state: backendFlow.runtime_state,
				nodes: flowNodes,
				connections: flowConnections
			});

			// Update only backend flow metadata (version, runtime_state)
			// Don't update nodes/connections - flow state is already correct
			backendFlow = {
				...backendFlow,
				version: updated.version,
				runtime_state: updated.runtime_state,
				updated_at: updated.updated_at
			};
			dirty = false;

			// Update save state based on validation result
			if (validation?.validation_status === 'errors') {
				// Draft mode - saved with errors
				saveState = {
					status: 'draft',
					lastSaved: new Date(),
					error: `${validation.errors.length} error${validation.errors.length > 1 ? 's' : ''}`,
					validationResult: validation
				};
			} else {
				// Clean - saved with no errors
				saveState = {
					status: 'clean',
					lastSaved: new Date(),
					error: null,
					validationResult: validation
				};
			}

			// Only update runtimeState if the state actually changed
			if (runtimeState.state !== updated.runtime_state) {
				runtimeState = {
					state: updated.runtime_state,
					message: null,
					lastTransition: new Date()
				};
			}

			// Handle pending operations
			if (pendingDeploy) {
				pendingDeploy = false;
				await handleDeploy();
			}

			if (shouldNavigateAfterSave) {
				shouldNavigateAfterSave = false;
				navigationGuard?.allowNavigation();
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Save failed';
			saveState = { ...saveState, status: 'error', error: message };
			pendingDeploy = false;
			shouldNavigateAfterSave = false;
		} finally {
			saveInProgress = false;
		}
	}

	// Deploy handler using fetch API
	async function handleDeploy() {
		// Gate 3: Deploy-Time Validation - Check for errors before deploying
		if (validationResult?.validation_status === 'errors') {
			showDeployErrorModal = true;
			return;
		}

		// Save first if dirty, otherwise deploy immediately
		if (dirty) {
			pendingDeploy = true;
			await handleSave();
			return;
		}

		try {
			const updated = await deployFlow(backendFlow.id);

			// Update only runtime_state - deploy doesn't change flow structure
			backendFlow = {
				...backendFlow,
				runtime_state: updated.runtime_state,
				updated_at: updated.updated_at
			};
			runtimeState = {
				state: updated.runtime_state,
				message: null,
				lastTransition: new Date()
			};
		} catch (err) {
			// Check if this is a validation error
			if (isValidationError(err)) {
				deployValidationResult = err.validationResult;
				showValidationDialog = true;
				runtimeState = { ...runtimeState, state: 'not_deployed', message: null };
			} else {
				const message = err instanceof Error ? err.message : 'Deploy failed';
				runtimeState = { ...runtimeState, state: 'error', message };
			}
		}
	}

	// Start handler using fetch API
	async function handleStart() {
		try {
			const updated = await startFlow(backendFlow.id);

			// Update only runtime_state - start doesn't change flow structure
			backendFlow = {
				...backendFlow,
				runtime_state: updated.runtime_state,
				updated_at: updated.updated_at
			};
			runtimeState = {
				state: updated.runtime_state,
				message: null,
				lastTransition: new Date()
			};
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Start failed';
			runtimeState = { ...runtimeState, state: 'error', message };
		}
	}

	// Stop handler using fetch API
	async function handleStop() {
		try {
			const updated = await stopFlow(backendFlow.id);

			// Update only runtime_state - stop doesn't change flow structure
			backendFlow = {
				...backendFlow,
				runtime_state: updated.runtime_state,
				updated_at: updated.updated_at
			};
			runtimeState = {
				state: updated.runtime_state,
				message: null,
				lastTransition: new Date()
			};
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Stop failed';
			runtimeState = { ...runtimeState, state: 'error', message };
		}
	}

	// Navigation dialog handlers
	async function handleNavigationSave() {
		shouldNavigateAfterSave = true;
		await handleSave();
	}

	function handleNavigationDiscard() {
		navigationGuard?.allowNavigation();
	}

	function handleNavigationCancel() {
		navigationGuard?.cancelNavigation();
	}

	// Validation dialog handlers
	function handleValidationDialogClose() {
		showValidationDialog = false;
		deployValidationResult = null;
	}

	// Deploy error modal handlers
	function handleDeployErrorModalClose() {
		showDeployErrorModal = false;
	}

	// Validation status modal handlers (Feature 015 - T014)
	function handleValidationStatusClick() {
		showValidationStatusModal = true;
	}

	function handleValidationStatusModalClose() {
		showValidationStatusModal = false;
	}

	// Runtime panel handlers
	function handleToggleRuntimePanel() {
		showRuntimePanel = !showRuntimePanel;
	}

	function handleCloseRuntimePanel() {
		showRuntimePanel = false;
	}

	// Calculate dynamic canvas height based on panel state
	const headerHeight = 70; // Approximate header height
	const aiPromptHeight = 180; // AI prompt section height
	const statusBarHeight = 50; // Approximate status bar height

	const canvasHeight = $derived(
		showRuntimePanel
			? `calc(100vh - ${headerHeight}px - ${aiPromptHeight}px - ${statusBarHeight}px - ${runtimePanelHeight}px)`
			: `calc(100vh - ${headerHeight}px - ${aiPromptHeight}px - ${statusBarHeight}px)`
	);
</script>

<svelte:head>
	<title>{backendFlow?.name || 'Flow Editor'} - SemStreams</title>
</svelte:head>

<!-- Navigation guard for unsaved changes -->
<NavigationGuard
	bind:this={navigationGuard}
	bind:showDialog={showNavigationDialog}
	{saveState}
/>

<!-- Navigation warning dialog -->
<NavigationDialog
	isOpen={showNavigationDialog}
	onSave={handleNavigationSave}
	onDiscard={handleNavigationDiscard}
	onCancel={handleNavigationCancel}
/>

<!-- Validation error dialog -->
<ValidationErrorDialog
	isOpen={showValidationDialog}
	validationResult={deployValidationResult}
	onClose={handleValidationDialogClose}
/>

<!-- Deploy error modal (Gate 3: Deploy-Time Validation) -->
<DeployErrorModal
	isOpen={showDeployErrorModal}
	{validationResult}
	onClose={handleDeployErrorModalClose}
/>

<!-- Validation status modal (Feature 015 - T014) -->
<ValidationStatusModal
	isOpen={showValidationStatusModal}
	{validationResult}
	onClose={handleValidationStatusModalClose}
/>

<!-- AI Flow Preview Modal -->
<AIFlowPreview
	isOpen={showAIPreview}
	flow={aiGeneratedFlow}
	validationResult={aiValidationResult}
	loading={aiLoading}
	error={aiError}
	onApply={handleAIApply}
	onReject={handleAIReject}
	onRetry={handleAIRetry}
	onClose={handleAIClose}
/>

<div class="editor-layout">
	<aside class="palette-sidebar">
		<ComponentList
			nodes={flowNodes}
			selectedNodeId={selectedComponent?.id || null}
			onSelectNode={handleSelectNode}
			onEditNode={handleEditNode}
			onDeleteNode={handleDeleteNode}
			onAddComponent={handleOpenAddModal}
		/>
	</aside>

	<main class="canvas-area">
		<header class="editor-header">
			<div class="header-content">
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a href="/" data-sveltekit-reload class="back-button" aria-label="Back to flows">← Flows</a>
				<div class="header-text">
					<h1>{backendFlow?.name || 'Loading...'}</h1>
					{#if backendFlow?.description}
						<p>{backendFlow.description}</p>
					{/if}
				</div>
				<SaveStatusIndicator
					{saveState}
					onSave={handleSave}
					{validationResult}
					onValidationClick={handleValidationStatusClick}
				/>
			</div>
		</header>

		<!-- AI Prompt Input Section -->
		<div class="ai-prompt-section">
			<AIPromptInput
				loading={aiLoading}
				disabled={aiLoading}
				onSubmit={handleAISubmit}
			/>
		</div>

		<div class="canvas-container" style="height: {canvasHeight};">
			<FlowCanvas
				nodes={flowNodes}
				connections={flowConnections}
				{portsMap}
				selectedNodeId={selectedComponent?.id || null}
				onNodeClick={handleNodeClick}
			/>
		</div>

		<StatusBar
			{runtimeState}
			{isFlowValid}
			{showRuntimePanel}
			onDeploy={handleDeploy}
			onStart={handleStart}
			onStop={handleStop}
			onToggleRuntimePanel={handleToggleRuntimePanel}
		/>

		<RuntimePanel
			isOpen={showRuntimePanel}
			height={runtimePanelHeight}
			flowId={backendFlow.id}
			onClose={handleCloseRuntimePanel}
		/>
	</main>
</div>

<!-- Add Component Modal -->
<AddComponentModal
	isOpen={showAddModal}
	{componentTypes}
	onAdd={handleAddComponentFromModal}
	onClose={handleCloseAddModal}
/>

<!-- Edit Component Modal -->
<EditComponentModal
	isOpen={showEditModal}
	node={editingNode}
	componentType={editingComponentType}
	onSave={handleSaveEdit}
	onDelete={handleDeleteFromEditModal}
	onClose={handleCloseEditModal}
/>

<style>
	.editor-layout {
		display: grid;
		grid-template-columns: 280px 1fr;
		height: 100vh;
		overflow: hidden;
	}

	.palette-sidebar {
		border-right: 1px solid var(--border-color, #dee2e6);
		background: var(--sidebar-bg, white);
		overflow-y: auto;
	}

	.canvas-area {
		display: flex;
		flex-direction: column;
		height: 100vh;
		overflow: hidden;
	}

	.editor-header {
		padding: 1rem 1.5rem;
		border-bottom: 1px solid var(--border-color, #dee2e6);
		background: var(--header-bg, white);
	}

	.header-content {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.back-button {
		color: var(--primary-color, #0066cc);
		text-decoration: none;
		font-weight: 500;
		font-size: 0.875rem;
		padding: 0.5rem 0.75rem;
		border-radius: 4px;
		transition: background-color 0.2s;
		white-space: nowrap;
	}

	.back-button:hover {
		background-color: var(--hover-bg, #f8f9fa);
	}

	.header-text {
		flex: 1;
		min-width: 0;
	}

	.editor-header h1 {
		margin: 0 0 0.25rem 0;
		font-size: 1.5rem;
		color: var(--heading-color, #212529);
	}

	.editor-header p {
		margin: 0;
		color: var(--text-muted, #6c757d);
		font-size: 0.875rem;
	}

	.ai-prompt-section {
		padding: 1rem 1.5rem;
		background: var(--ui-surface-primary);
		border-bottom: 1px solid var(--border-color, #dee2e6);
	}

	.canvas-container {
		position: relative;
		overflow: hidden;
		transition: height 300ms ease-out;
	}
</style>
