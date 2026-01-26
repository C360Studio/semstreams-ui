// Runtime data store for WebSocket-driven updates
// Centralizes all runtime panel data: logs, metrics, health, flow status

import * as store from 'svelte/store';

// ============================================================================
// Types
// ============================================================================

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
export type FlowState = 'running' | 'stopped' | 'error' | 'deploying' | 'not_deployed';
export type ComponentStatus = 'healthy' | 'degraded' | 'error';

export interface LogEntry {
	id: string;
	timestamp: number; // Unix ms
	level: LogLevel;
	source: string;
	message: string;
	fields?: Record<string, unknown>;
}

export interface ComponentHealth {
	name: string;
	component: string;
	type: string;
	status: ComponentStatus;
	healthy: boolean;
	message: string | null;
}

export interface HealthOverall {
	status: ComponentStatus;
	counts: {
		healthy: number;
		degraded: number;
		error: number;
	};
}

export interface FlowStatus {
	state: FlowState;
	prevState: FlowState | null;
	timestamp: number | null;
	error: string | null;
}

export interface MetricValue {
	name: string;
	type: string;
	value: number;
	labels: Record<string, string>;
}

// ============================================================================
// Store State
// ============================================================================

export interface RuntimeStoreState {
	// Connection state
	connected: boolean;
	error: string | null;
	flowId: string | null;

	// Flow status
	flowStatus: FlowStatus | null;

	// Health data
	healthOverall: HealthOverall | null;
	healthComponents: ComponentHealth[];

	// Logs (circular buffer, max 1000)
	logs: LogEntry[];

	// Metrics: raw counters + computed rates
	metricsRaw: Map<string, MetricValue>; // key: component:metricName
	metricsRates: Map<string, number>; // key: component:metricName -> rate/sec
	lastMetricsTimestamp: number | null;
}

const MAX_LOGS = 1000;
const _METRICS_INTERVAL_MS = 5000; // Expected interval for rate calculation (documentation)

// ============================================================================
// Store Implementation
// ============================================================================

function createRuntimeStore() {
	const initialState: RuntimeStoreState = {
		connected: false,
		error: null,
		flowId: null,
		flowStatus: null,
		healthOverall: null,
		healthComponents: [],
		logs: [],
		metricsRaw: new Map(),
		metricsRates: new Map(),
		lastMetricsTimestamp: null
	};

	const { subscribe, update, set } = store.writable<RuntimeStoreState>(initialState);

	return {
		subscribe,

		// ========================================================================
		// Connection State
		// ========================================================================

		setConnected(connected: boolean, flowId?: string) {
			update((state) => ({
				...state,
				connected,
				flowId: flowId ?? state.flowId,
				error: connected ? null : state.error
			}));
		},

		setError(error: string | null) {
			update((state) => ({
				...state,
				error,
				connected: error ? false : state.connected
			}));
		},

		// ========================================================================
		// Flow Status
		// ========================================================================

		updateFlowStatus(payload: {
			state: FlowState;
			prev_state?: FlowState;
			timestamp?: number;
			error?: string;
		}) {
			update((state) => ({
				...state,
				flowStatus: {
					state: payload.state,
					prevState: payload.prev_state ?? null,
					timestamp: payload.timestamp ?? null,
					error: payload.error ?? null
				}
			}));
		},

		// ========================================================================
		// Health
		// ========================================================================

		updateHealth(payload: {
			overall: { status: ComponentStatus; counts: { healthy: number; degraded: number; error: number } };
			components: Array<{
				name: string;
				component: string;
				type: string;
				status: ComponentStatus;
				healthy: boolean;
				message: string | null;
			}>;
		}) {
			update((state) => ({
				...state,
				healthOverall: payload.overall,
				healthComponents: payload.components
			}));
		},

		/**
		 * Update a single component's health (streaming per-component updates)
		 */
		updateComponentHealth(payload: {
			name: string;
			status: ComponentStatus;
			message: string | null;
		}) {
			update((state) => {
				// Find existing component or create new entry
				const existingIndex = state.healthComponents.findIndex(c => c.name === payload.name);
				let newComponents: ComponentHealth[];

				if (existingIndex >= 0) {
					// Update existing
					newComponents = [...state.healthComponents];
					newComponents[existingIndex] = {
						...newComponents[existingIndex],
						status: payload.status,
						healthy: payload.status === 'healthy',
						message: payload.message
					};
				} else {
					// Add new component
					newComponents = [...state.healthComponents, {
						name: payload.name,
						component: payload.name, // Use name as component ID
						type: 'unknown',
						status: payload.status,
						healthy: payload.status === 'healthy',
						message: payload.message
					}];
				}

				// Recalculate overall health
				const counts = {
					healthy: newComponents.filter(c => c.status === 'healthy').length,
					degraded: newComponents.filter(c => c.status === 'degraded').length,
					error: newComponents.filter(c => c.status === 'error').length
				};

				const overallStatus: ComponentStatus =
					counts.error > 0 ? 'error' :
					counts.degraded > 0 ? 'degraded' : 'healthy';

				return {
					...state,
					healthComponents: newComponents,
					healthOverall: {
						status: overallStatus,
						counts
					}
				};
			});
		},

		// ========================================================================
		// Logs
		// ========================================================================

		addLog(payload: {
			level: LogLevel;
			source: string;
			message: string;
			fields?: Record<string, unknown>;
		}, id: string, timestamp: number) {
			update((state) => {
				const newLog: LogEntry = {
					id,
					timestamp,
					level: payload.level,
					source: payload.source,
					message: payload.message,
					fields: payload.fields
				};

				// Circular buffer: keep last MAX_LOGS
				const logs = [...state.logs, newLog].slice(-MAX_LOGS);

				return { ...state, logs };
			});
		},

		clearLogs() {
			update((state) => ({ ...state, logs: [] }));
		},

		// ========================================================================
		// Metrics (with rate calculation)
		// ========================================================================

		updateMetrics(payload: {
			component: string;
			name: string;
			type: string;
			value: number;
			labels: Record<string, string>;
		}, timestamp: number) {
			update((state) => {
				const key = `${payload.component}:${payload.name}`;
				// eslint-disable-next-line svelte/prefer-svelte-reactivity
				const newMetricsRaw = new Map(state.metricsRaw);
				// eslint-disable-next-line svelte/prefer-svelte-reactivity
				const newMetricsRates = new Map(state.metricsRates);

				// Get previous value for rate calculation
				const prevMetric = state.metricsRaw.get(key);
				const prevTimestamp = state.lastMetricsTimestamp;

				// Store new raw value
				newMetricsRaw.set(key, {
					name: payload.name,
					type: payload.type,
					value: payload.value,
					labels: payload.labels
				});

				// Calculate rate if we have previous data
				if (prevMetric && prevTimestamp && payload.type === 'counter') {
					const timeDeltaSec = (timestamp - prevTimestamp) / 1000;
					if (timeDeltaSec > 0) {
						const valueDelta = payload.value - prevMetric.value;
						const rate = valueDelta / timeDeltaSec;
						newMetricsRates.set(key, Math.max(0, rate)); // Clamp to non-negative
					}
				}

				return {
					...state,
					metricsRaw: newMetricsRaw,
					metricsRates: newMetricsRates,
					lastMetricsTimestamp: timestamp
				};
			});
		},

		// ========================================================================
		// Helpers
		// ========================================================================

		/**
		 * Get logs filtered by level and/or source
		 */
		getFilteredLogs(
			state: RuntimeStoreState,
			options: { minLevel?: LogLevel; sources?: string[] }
		): LogEntry[] {
			const levelOrder: Record<LogLevel, number> = {
				DEBUG: 0,
				INFO: 1,
				WARN: 2,
				ERROR: 3
			};

			return state.logs.filter((log) => {
				// Filter by level
				if (options.minLevel && levelOrder[log.level] < levelOrder[options.minLevel]) {
					return false;
				}

				// Filter by source
				if (options.sources && options.sources.length > 0) {
					if (!options.sources.includes(log.source)) {
						return false;
					}
				}

				return true;
			});
		},

		/**
		 * Get metrics rate for a specific component and metric name
		 */
		getMetricRate(state: RuntimeStoreState, component: string, metricName: string): number | null {
			const key = `${component}:${metricName}`;
			return state.metricsRates.get(key) ?? null;
		},

		/**
		 * Get all metrics as an array for display
		 * Shows metrics immediately, rate is null until second data point
		 */
		getMetricsArray(state: RuntimeStoreState): Array<{
			component: string;
			metricName: string;
			rate: number | null;
			raw: MetricValue;
		}> {
			const result: Array<{
				component: string;
				metricName: string;
				rate: number | null;
				raw: MetricValue;
			}> = [];

			// Iterate over raw metrics so they show immediately
			for (const [key, raw] of state.metricsRaw) {
				const [component, metricName] = key.split(':');
				result.push({
					component,
					metricName,
					rate: state.metricsRates.get(key) ?? null,
					raw
				});
			}

			return result.sort((a, b) => a.component.localeCompare(b.component));
		},

		// ========================================================================
		// Reset
		// ========================================================================

		reset() {
			set(initialState);
		}
	};
}

export const runtimeStore = createRuntimeStore();
