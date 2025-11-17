<script lang="ts">
	import FlowCanvas from '$lib/components/FlowCanvas.svelte';
	import ComponentPalette from '$lib/components/ComponentPalette.svelte';
	import ConfigPanel from '$lib/components/ConfigPanel.svelte';
	import StatusBar from '$lib/components/StatusBar.svelte';
	import RuntimePanel from '$lib/components/RuntimePanel.svelte';
	import SaveStatusIndicator from '$lib/components/SaveStatusIndicator.svelte';
	import NavigationGuard from '$lib/components/NavigationGuard.svelte';
	import NavigationDialog from '$lib/components/NavigationDialog.svelte';
	import ValidationErrorDialog from '$lib/components/ValidationErrorDialog.svelte';
	import DeployErrorModal from '$lib/components/DeployErrorModal.svelte';
	import ValidationStatusModal from '$lib/components/ValidationStatusModal.svelte';
	import type { PageData } from './$types';
	import type { ComponentInstance, FlowNode, FlowConnection } from '$lib/types/flow';
	import type { SaveState, RuntimeStateInfo } from '$lib/types/ui-state';
	import type { ValidationResult } from '$lib/types/port';
	import {
		convertFlowNodesToXYFlow,
		convertXYFlowNodesToFlow,
		convertFlowConnectionsToXYFlow,
		convertXYFlowEdgesToFlow,
		convertToXYFlowNode,
		convertToXYFlowEdge,
		type XYFlowNode,
		type XYFlowEdge
	} from '$lib/utils/xyflow-converters';
	import { saveFlow, deployFlow, startFlow, stopFlow, isValidationError } from '$lib/api/flows';

	let { data }: { data: PageData } = $props();

	// Backend flow (domain model) - source of truth for persistence
	let backendFlow = $state(data.flow);

	// UI state
	let dirty = $state(false);
	let selectedComponent = $state<ComponentInstance | null>(null);

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

	// Real-time validation state (for port visualization)
	let validationResult = $state<ValidationResult | null>(null);

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

	// Canvas event handlers
	function handleNodeClick(nodeId: string) {
		const xyflowNode = xyflowNodes.find((n) => n.id === nodeId);
		if (xyflowNode) {
			selectedComponent = {
				...xyflowNode.data.node,
				health: {
					status: 'not_running',
					lastUpdated: new Date().toISOString()
				}
			};
		}
	}

	// XYFlow state (view model) - using regular $state() to enable port data reactivity
	// Note: Switched from $state.raw() to enable CustomFlowNode to react to port data changes
	let xyflowNodes = $state<XYFlowNode[]>(
		convertFlowNodesToXYFlow(backendFlow.nodes, handleNodeClick)
	);
	let xyflowEdges = $state<XYFlowEdge[]>(
		convertFlowConnectionsToXYFlow(backendFlow.connections)
	);

	// DEBUG: Use $inspect to track edge changes (only logs when edges actually change)
	$inspect('Edges:', xyflowEdges.length, xyflowEdges.map(e => ({
		id: e.id.substring(0, 20) + '...',  // Truncate long IDs
		type: e.id.startsWith('auto_') ? 'auto' : e.id.startsWith('conn_') ? 'manual' : 'other',
		from: e.source,
		to: e.target
	})));

	// Track dirty state when nodes/edges change via bindings
	let initialNodeCount = xyflowNodes.length;
	let initialEdgeCount = xyflowEdges.length;
	let initialLoadComplete = false;

	$effect(() => {
		// Watch for changes to xyflowNodes or xyflowEdges
		const nodeCount = xyflowNodes.length;
		const edgeCount = xyflowEdges.length;

		// Skip initial load
		if (nodeCount === initialNodeCount && edgeCount === initialEdgeCount) {
			return;
		}

		// Skip marking dirty until initial load completes and first validation runs
		if (!initialLoadComplete) {
			initialNodeCount = nodeCount;
			initialEdgeCount = edgeCount;
			initialLoadComplete = true;
			return;
		}

		// Mark dirty when nodes or edges change
		dirty = true;
		saveState = { ...saveState, status: 'dirty' };

		// Update baseline
		initialNodeCount = nodeCount;
		initialEdgeCount = edgeCount;
	});

	// Debounced validation on canvas changes (500ms delay)
	let validationTimer: ReturnType<typeof setTimeout> | null = null;
	let lastValidatedSignature = '';

	$effect(() => {
		// Create signature from things that represent USER changes only
		// Ignore auto connections (they're generated by validation)
		const nodeIds = xyflowNodes.map(n => n.id).sort().join(',');
		const manualEdgeIds = xyflowEdges
			.filter(e => e.id.startsWith('conn_'))  // Only manual connections
			.map(e => e.id)
			.sort()
			.join(',');
		const signature = `${nodeIds}|${manualEdgeIds}`;

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
				// Apply validation (mutates edges/nodes to add auto connections and port info)
				applyValidationToNodes(result);
				updateAutoConnections(result);

				// Update signature to match current state after validation
				// When effect re-runs, it will see signature matches and skip
				const nodeIds = xyflowNodes.map(n => n.id).sort().join(',');
				const manualEdgeIds = xyflowEdges
					.filter(e => e.id.startsWith('conn_'))
					.map(e => e.id)
					.sort()
					.join(',');
				lastValidatedSignature = `${nodeIds}|${manualEdgeIds}`;

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
	 * Sends current XYFlow state (may be unsaved) for real-time validation
	 */
	async function runFlowValidation(flowId: string): Promise<ValidationResult | null> {
		try {
			// Convert current XYFlow state to backend format
			const flowNodes = convertXYFlowNodesToFlow(xyflowNodes);
			const flowDefinition = {
				id: flowId,
				name: backendFlow.name,
				runtime_state: backendFlow.runtime_state,
				nodes: flowNodes,
				connections: convertXYFlowEdgesToFlow(xyflowEdges)
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
	 * Uses array mutation (splice/push) to work with XYFlow's binding
	 */
	function updateAutoConnections(result: ValidationResult) {
		// Step 1: Remove old auto-discovered connections by filtering
		xyflowEdges = xyflowEdges.filter(edge => !edge.id.startsWith('auto_'));

		// Step 2: Create new auto-discovered connections from validation result
		// Safety check: discovered_connections might be undefined or null
		if (!result.discovered_connections || result.discovered_connections.length === 0) {
			return;
		}

		const newAutoEdges = result.discovered_connections.map((conn) => {
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

			const xyflowEdge = convertToXYFlowEdge(flowConnection);
			console.log('[updateAutoConnections] Created edge:', JSON.stringify(xyflowEdge, null, 2));
			return xyflowEdge;
		});

		// Step 3: Add new auto-discovered connections
		// Try reassignment instead of mutation to trigger XYFlow reactivity
		console.log('[updateAutoConnections] Adding', newAutoEdges.length, 'auto edges to array');
		console.log('[updateAutoConnections] Current node IDs:', xyflowNodes.map(n => n.id));
		console.log('[updateAutoConnections] Node ports:', JSON.stringify(xyflowNodes.map(n => ({
			id: n.id.substring(0, 20),
			input_ports: n.data.input_ports?.length || 0,
			output_ports: n.data.output_ports?.length || 0
		}))));
		xyflowEdges = [...xyflowEdges, ...newAutoEdges];
		console.log('[updateAutoConnections] Total edges after reassignment:', xyflowEdges.length);
	}

	/**
	 * Apply validation results to node ports
	 * Updates port validation states and merges port information from backend
	 * Uses array mutation to work with XYFlow's binding
	 */
	function applyValidationToNodes(result: ValidationResult) {
		// Merge port information from validation result into nodes
		if (result.nodes && result.nodes.length > 0) {
			// Create new array with merged port data
			// Reassignment triggers reactivity for dynamic port rendering
			const updatedNodes = xyflowNodes.map(node => {
				const validatedNode = result.nodes.find((vn) => vn.id === node.id);

				if (validatedNode) {
					return {
						...node,
						data: {
							...node.data,
							input_ports: validatedNode.input_ports,
							output_ports: validatedNode.output_ports
						}
					};
				}

				return node;
			});

			// Reassign array to trigger reactivity
			xyflowNodes = updatedNodes;
		}

		// Mark connections with errors
		// IMPORTANT: Mutate array elements in-place, don't replace array
		if (result.errors.length > 0) {
			for (let i = 0; i < xyflowEdges.length; i++) {
				const edge = xyflowEdges[i];
				const hasError = result.errors.some(
					(err) =>
						err.componentName === edge.source || err.componentName === edge.target
				);
				if (hasError && edge.data) {
					xyflowEdges[i] = {
						...edge,
						data: {
							...edge.data,
							validationState: 'error' as const
						}
					};
				}
			}
		}
	}

	function handleAddComponent(componentType: { id: string; name: string }) {
		// Generate unique node ID
		const nodeId = `node_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

		// Calculate position with offset to avoid overlapping nodes
		// Start at center and offset by number of existing nodes
		const baseX = 400;
		const baseY = 300;
		const offsetX = (xyflowNodes.length % 3) * 200; // 3 columns
		const offsetY = Math.floor(xyflowNodes.length / 3) * 150; // Rows of 150px

		// Create FlowNode first (domain model)
		const flowNode: FlowNode = {
			id: nodeId,
			type: componentType.id,
			name: componentType.name,
			position: { x: baseX + offsetX, y: baseY + offsetY },
			config: {}
		};

		// Convert to XYFlow node and add to state
		const xyflowNode = convertToXYFlowNode(flowNode, handleNodeClick);
		xyflowNodes = [...xyflowNodes, xyflowNode];
		dirty = true;
		saveState = { ...saveState, status: 'dirty' };
	}

	function handleCloseConfigPanel() {
		selectedComponent = null;
	}

	function handleConfigSave(nodeId: string, config: any) {
		xyflowNodes = xyflowNodes.map((node) =>
			node.id === nodeId
				? {
						...node,
						data: {
							...node.data,
							node: {
								...node.data.node,
								config
							}
						}
					}
				: node
		);
		dirty = true;
		saveState = { ...saveState, status: 'dirty' };
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
				nodes: convertXYFlowNodesToFlow(xyflowNodes),
				connections: convertXYFlowEdgesToFlow(xyflowEdges)
			});

			// Update only backend flow metadata (version, runtime_state)
			// Don't reconvert nodes/edges - XYFlow state is already correct
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
	const statusBarHeight = 50; // Approximate status bar height

	const canvasHeight = $derived(
		showRuntimePanel
			? `calc(100vh - ${headerHeight}px - ${statusBarHeight}px - ${runtimePanelHeight}px)`
			: `calc(100vh - ${headerHeight}px - ${statusBarHeight}px)`
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

<div class="editor-layout">
	<aside class="palette-sidebar">
		<ComponentPalette onAddComponent={handleAddComponent} />
	</aside>

	<main class="canvas-area">
		<header class="editor-header">
			<div class="header-content">
				<a href="/" class="back-button" aria-label="Back to flows">← Flows</a>
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
					nodeCount={xyflowNodes.length}
					edgeCount={xyflowEdges.length}
					onValidationClick={handleValidationStatusClick}
				/>
			</div>
		</header>

		<div class="canvas-container" style="height: {canvasHeight};">
			<FlowCanvas
				bind:nodes={xyflowNodes}
				bind:edges={xyflowEdges}
				onNodeClick={handleNodeClick}
				onConnectionCreate={() => {
					dirty = true;
					saveState = { ...saveState, status: 'dirty' };
				}}
				runtimeState={backendFlow.runtime_state}
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

	{#if selectedComponent}
		<aside class="config-sidebar">
			<ConfigPanel
				component={selectedComponent}
				onSave={handleConfigSave}
				onClose={handleCloseConfigPanel}
			/>
		</aside>
	{/if}
</div>

<style>
	.editor-layout {
		display: grid;
		grid-template-columns: 250px 1fr auto;
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

	.canvas-container {
		position: relative;
		overflow: hidden;
		transition: height 300ms ease-out;
	}

	.config-sidebar {
		width: 400px;
		border-left: 1px solid var(--border-color, #dee2e6);
		background: var(--sidebar-bg, white);
		overflow-y: auto;
	}
</style>
