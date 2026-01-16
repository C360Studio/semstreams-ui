import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import { writable, type Writable } from 'svelte/store';
import MetricsTab from './MetricsTab.svelte';
import type { RuntimeStoreState, MetricValue } from '$lib/stores/runtimeStore.svelte';

/**
 * MetricsTab Component Tests
 * Tests for store-based metrics display with computed rates
 */

// Create a mock store that we can control
let mockStoreState: Writable<RuntimeStoreState>;

// Mock the runtimeStore module
vi.mock('$lib/stores/runtimeStore.svelte', () => {
	return {
		runtimeStore: {
			subscribe: (fn: (state: RuntimeStoreState) => void) => {
				return mockStoreState.subscribe(fn);
			},
			getMetricsArray: (state: RuntimeStoreState) => {
				const result: Array<{
					component: string;
					metricName: string;
					rate: number;
					raw: MetricValue | undefined;
				}> = [];

				for (const [key, rate] of state.metricsRates) {
					const [component, metricName] = key.split(':');
					result.push({
						component,
						metricName,
						rate,
						raw: state.metricsRaw.get(key)
					});
				}

				return result.sort((a, b) => a.component.localeCompare(b.component));
			}
		}
	};
});

function createDefaultState(): RuntimeStoreState {
	return {
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
}

function createMetricsState(
	metrics: Array<{ component: string; metric: string; rate: number }>
): Pick<RuntimeStoreState, 'metricsRaw' | 'metricsRates' | 'lastMetricsTimestamp'> {
	const metricsRaw = new Map<string, MetricValue>();
	const metricsRates = new Map<string, number>();

	for (const m of metrics) {
		const key = `${m.component}:${m.metric}`;
		metricsRaw.set(key, {
			name: m.metric,
			type: 'counter',
			value: m.rate * 5, // Simulate raw value
			labels: {}
		});
		metricsRates.set(key, m.rate);
	}

	return {
		metricsRaw,
		metricsRates,
		lastMetricsTimestamp: Date.now()
	};
}

describe('MetricsTab', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockStoreState = writable<RuntimeStoreState>(createDefaultState());
	});

	describe('Connection Status', () => {
		it('should show connecting status when not connected', () => {
			mockStoreState.set({
				...createDefaultState(),
				connected: false
			});

			render(MetricsTab, { flowId: 'test-flow', isActive: true });

			expect(screen.getByText(/Connecting to runtime stream/)).toBeTruthy();
		});

		it('should hide connecting status when connected', async () => {
			mockStoreState.set({
				...createDefaultState(),
				connected: true
			});

			render(MetricsTab, { flowId: 'test-flow', isActive: true });

			await waitFor(() => {
				expect(screen.queryByText(/Connecting to runtime stream/)).toBeNull();
			});
		});

		it('should show error message when store has error', async () => {
			mockStoreState.set({
				...createDefaultState(),
				connected: false,
				error: 'WebSocket connection failed'
			});

			render(MetricsTab, { flowId: 'test-flow', isActive: true });

			await waitFor(() => {
				const alert = screen.getByRole('alert');
				expect(alert).toBeTruthy();
				expect(alert.textContent).toContain('WebSocket connection failed');
			});
		});
	});

	describe('Metrics Display', () => {
		it('should render metrics table with correct columns', async () => {
			const metricsData = createMetricsState([
				{ component: 'udp-source', metric: 'messages_received_total', rate: 1234 }
			]);

			mockStoreState.set({
				...createDefaultState(),
				connected: true,
				...metricsData
			});

			render(MetricsTab, { flowId: 'test-flow', isActive: true });

			await waitFor(() => {
				expect(screen.getByText('Component')).toBeTruthy();
				expect(screen.getByText('Msg/sec')).toBeTruthy();
				expect(screen.getByText('Errors/sec')).toBeTruthy();
				expect(screen.getByText('Status')).toBeTruthy();
			});
		});

		it('should display component metrics correctly', async () => {
			const metricsData = createMetricsState([
				{ component: 'udp-source', metric: 'messages_received_total', rate: 1234 },
				{ component: 'json-processor', metric: 'messages_processed_total', rate: 1230 },
				{ component: 'nats-sink', metric: 'messages_received_total', rate: 1226 }
			]);

			mockStoreState.set({
				...createDefaultState(),
				connected: true,
				...metricsData
			});

			render(MetricsTab, { flowId: 'test-flow', isActive: true });

			await waitFor(() => {
				expect(screen.getByText('udp-source')).toBeTruthy();
				expect(screen.getByText('json-processor')).toBeTruthy();
				expect(screen.getByText('nats-sink')).toBeTruthy();
			});
		});

		it('should format numbers with commas', async () => {
			const metricsData = createMetricsState([
				{ component: 'udp-source', metric: 'messages_received_total', rate: 1234 }
			]);

			mockStoreState.set({
				...createDefaultState(),
				connected: true,
				...metricsData
			});

			render(MetricsTab, { flowId: 'test-flow', isActive: true });

			await waitFor(() => {
				// 1234 should be formatted as "1,234"
				expect(screen.getByText('1,234')).toBeTruthy();
			});
		});

		it('should show status indicators for each component', async () => {
			const metricsData = createMetricsState([
				{ component: 'udp-source', metric: 'messages_received_total', rate: 100 },
				{ component: 'processor', metric: 'messages_processed_total', rate: 100 },
				{ component: 'sink', metric: 'messages_received_total', rate: 100 }
			]);

			mockStoreState.set({
				...createDefaultState(),
				connected: true,
				...metricsData
			});

			render(MetricsTab, { flowId: 'test-flow', isActive: true });

			await waitFor(() => {
				const statusIndicators = screen.getAllByTestId('status-indicator');
				expect(statusIndicators).toHaveLength(3);
			});
		});

		it('should sort components alphabetically by name', async () => {
			const metricsData = createMetricsState([
				{ component: 'udp-source', metric: 'messages_received_total', rate: 100 },
				{ component: 'json-processor', metric: 'messages_processed_total', rate: 100 },
				{ component: 'nats-sink', metric: 'messages_received_total', rate: 100 }
			]);

			mockStoreState.set({
				...createDefaultState(),
				connected: true,
				...metricsData
			});

			render(MetricsTab, { flowId: 'test-flow', isActive: true });

			await waitFor(() => {
				const rows = screen.getAllByTestId('metrics-row');
				expect(rows[0]).toHaveTextContent('json-processor');
				expect(rows[1]).toHaveTextContent('nats-sink');
				expect(rows[2]).toHaveTextContent('udp-source');
			});
		});

		it('should show empty state when no metrics available', async () => {
			mockStoreState.set({
				...createDefaultState(),
				connected: true
				// No metrics
			});

			render(MetricsTab, { flowId: 'test-flow', isActive: true });

			await waitFor(() => {
				expect(screen.getByText('No metrics available')).toBeTruthy();
			});
		});

		it('should update when store changes', async () => {
			mockStoreState.set({
				...createDefaultState(),
				connected: true
			});

			render(MetricsTab, { flowId: 'test-flow', isActive: true });

			// Initially no metrics
			await waitFor(() => {
				expect(screen.getByText('No metrics available')).toBeTruthy();
			});

			// Update store with metrics
			const metricsData = createMetricsState([
				{ component: 'test-component', metric: 'messages_received_total', rate: 500 }
			]);

			mockStoreState.update((state) => ({
				...state,
				...metricsData
			}));

			await waitFor(() => {
				expect(screen.getByText('test-component')).toBeTruthy();
				expect(screen.getByText('500')).toBeTruthy();
			});
		});
	});

	describe('Error Rate Display', () => {
		it('should show error rate for components with errors', async () => {
			const metricsData = createMetricsState([
				{ component: 'processor', metric: 'messages_processed_total', rate: 100 },
				{ component: 'processor', metric: 'errors_total', rate: 5 }
			]);

			mockStoreState.set({
				...createDefaultState(),
				connected: true,
				...metricsData
			});

			render(MetricsTab, { flowId: 'test-flow', isActive: true });

			await waitFor(() => {
				expect(screen.getByText('processor')).toBeTruthy();
				// Should show error rate of 5
				expect(screen.getByText('5')).toBeTruthy();
			});
		});

		it('should show degraded status when error rate is low', async () => {
			const metricsData = createMetricsState([
				{ component: 'processor', metric: 'messages_processed_total', rate: 100 },
				{ component: 'processor', metric: 'errors_total', rate: 0.5 }
			]);

			mockStoreState.set({
				...createDefaultState(),
				connected: true,
				...metricsData
			});

			render(MetricsTab, { flowId: 'test-flow', isActive: true });

			await waitFor(() => {
				const indicator = screen.getByTestId('status-indicator');
				expect(indicator.getAttribute('aria-label')).toContain('Degraded');
			});
		});

		it('should show error status when error rate is high', async () => {
			const metricsData = createMetricsState([
				{ component: 'processor', metric: 'messages_processed_total', rate: 100 },
				{ component: 'processor', metric: 'errors_total', rate: 5 }
			]);

			mockStoreState.set({
				...createDefaultState(),
				connected: true,
				...metricsData
			});

			render(MetricsTab, { flowId: 'test-flow', isActive: true });

			await waitFor(() => {
				const indicator = screen.getByTestId('status-indicator');
				expect(indicator.getAttribute('aria-label')).toContain('Error');
			});
		});
	});

	describe('Last Updated Timestamp', () => {
		it('should show last updated timestamp when metrics exist', async () => {
			const metricsData = createMetricsState([
				{ component: 'test', metric: 'messages_received_total', rate: 100 }
			]);

			mockStoreState.set({
				...createDefaultState(),
				connected: true,
				...metricsData
			});

			render(MetricsTab, { flowId: 'test-flow', isActive: true });

			await waitFor(() => {
				expect(screen.getByTestId('last-updated')).toBeTruthy();
			});
		});

		it('should not show last updated when no metrics timestamp', async () => {
			mockStoreState.set({
				...createDefaultState(),
				connected: true,
				lastMetricsTimestamp: null
			});

			render(MetricsTab, { flowId: 'test-flow', isActive: true });

			expect(screen.queryByTestId('last-updated')).toBeNull();
		});
	});

	describe('Accessibility', () => {
		it('should have proper table structure', async () => {
			const metricsData = createMetricsState([
				{ component: 'test', metric: 'messages_received_total', rate: 100 }
			]);

			mockStoreState.set({
				...createDefaultState(),
				connected: true,
				...metricsData
			});

			render(MetricsTab, { flowId: 'test-flow', isActive: true });

			await waitFor(() => {
				const table = screen.getByRole('table');
				expect(table).toBeTruthy();
			});
		});

		it('should have column headers with scope attributes', async () => {
			const metricsData = createMetricsState([
				{ component: 'test', metric: 'messages_received_total', rate: 100 }
			]);

			mockStoreState.set({
				...createDefaultState(),
				connected: true,
				...metricsData
			});

			render(MetricsTab, { flowId: 'test-flow', isActive: true });

			await waitFor(() => {
				const headers = screen.getAllByRole('columnheader');
				expect(headers.length).toBeGreaterThan(0);
				headers.forEach((header) => {
					expect(header.getAttribute('scope')).toBe('col');
				});
			});
		});

		it('should have text alternatives for status indicators', async () => {
			const metricsData = createMetricsState([
				{ component: 'test', metric: 'messages_received_total', rate: 100 }
			]);

			mockStoreState.set({
				...createDefaultState(),
				connected: true,
				...metricsData
			});

			render(MetricsTab, { flowId: 'test-flow', isActive: true });

			await waitFor(() => {
				const indicators = screen.getAllByTestId('status-indicator');
				indicators.forEach((indicator) => {
					expect(indicator.getAttribute('aria-label')).toBeTruthy();
				});
			});
		});

		it('should have accessible error alerts', async () => {
			mockStoreState.set({
				...createDefaultState(),
				connected: false,
				error: 'Connection failed'
			});

			render(MetricsTab, { flowId: 'test-flow', isActive: true });

			await waitFor(() => {
				const alert = screen.getByRole('alert');
				expect(alert).toBeTruthy();
			});
		});
	});
});
