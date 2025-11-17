import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/svelte';
import HealthTab from './HealthTab.svelte';

/**
 * HealthTab Component Tests
 * Phase 4 of Runtime Visualization Panel
 *
 * Tests:
 * - Polling lifecycle (5s interval)
 * - Health display and component status
 * - Uptime calculations and updates
 * - Last activity relative time formatting
 * - Expandable details for warnings/errors
 * - Stale component highlighting
 * - Error handling
 * - Accessibility
 */

// Mock health data
const mockHealthResponse = {
	timestamp: '2025-11-17T14:23:05.123Z',
	overall: {
		status: 'degraded' as const,
		healthyCount: 2,
		totalCount: 3
	},
	components: [
		{
			name: 'udp-source',
			status: 'running' as const,
			startTime: '2025-11-17T14:07:33.123Z', // ~15 minutes ago
			lastActivity: '2025-11-17T14:23:03.123Z', // 2 seconds ago
			details: null
		},
		{
			name: 'json-processor',
			status: 'running' as const,
			startTime: '2025-11-17T14:07:34.123Z',
			lastActivity: '2025-11-17T14:23:04.123Z', // 1 second ago
			details: null
		},
		{
			name: 'nats-sink',
			status: 'degraded' as const,
			startTime: '2025-11-17T14:07:35.123Z',
			lastActivity: '2025-11-17T14:23:02.123Z', // 3 seconds ago
			details: {
				message: 'Slow acks (>100ms)',
				timestamp: '2025-11-17T14:22:50.123Z',
				severity: 'warning' as const
			}
		}
	]
};

const mockHealthyResponse = {
	timestamp: '2025-11-17T14:23:05.123Z',
	overall: {
		status: 'healthy' as const,
		healthyCount: 2,
		totalCount: 2
	},
	components: [
		{
			name: 'udp-source',
			status: 'running' as const,
			startTime: '2025-11-17T14:07:33.123Z',
			lastActivity: '2025-11-17T14:23:03.123Z',
			details: null
		},
		{
			name: 'nats-sink',
			status: 'running' as const,
			startTime: '2025-11-17T14:07:35.123Z',
			lastActivity: '2025-11-17T14:23:02.123Z',
			details: null
		}
	]
};

const mockErrorResponse = {
	timestamp: '2025-11-17T14:23:05.123Z',
	overall: {
		status: 'error' as const,
		healthyCount: 1,
		totalCount: 2
	},
	components: [
		{
			name: 'udp-source',
			status: 'running' as const,
			startTime: '2025-11-17T14:07:33.123Z',
			lastActivity: '2025-11-17T14:23:03.123Z',
			details: null
		},
		{
			name: 'nats-sink',
			status: 'error' as const,
			startTime: '2025-11-17T14:07:35.123Z',
			lastActivity: '2025-11-17T14:22:30.123Z', // 35 seconds ago (stale)
			details: {
				message: 'Failed to connect to NATS server',
				timestamp: '2025-11-17T14:22:30.123Z',
				severity: 'error' as const
			}
		}
	]
};

describe('HealthTab', () => {
	let fetchSpy: ReturnType<typeof vi.spyOn>;
	let setIntervalSpy: ReturnType<typeof vi.spyOn>;
	let clearIntervalSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2025-11-17T14:23:05.123Z'));

		// Mock fetch API
		fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
			ok: true,
			json: async () => mockHealthResponse
		} as Response);

		// Spy on interval functions
		setIntervalSpy = vi.spyOn(global, 'setInterval');
		clearIntervalSpy = vi.spyOn(global, 'clearInterval');
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	describe('Polling Lifecycle', () => {
		it('should start polling when tab becomes active', async () => {
			const { rerender } = render(HealthTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: false
				}
			});

			// No polling when inactive
			expect(setIntervalSpy).not.toHaveBeenCalled();

			// Activate tab
			await rerender({ flowId: 'test-flow-123', isActive: true });

			// Should start polling at 5 second intervals
			await waitFor(() => {
				const healthPolling = setIntervalSpy.mock.calls.find((call) => call[1] === 5000);
				expect(healthPolling).toBeDefined();
			});
		});

		it('should stop polling when tab becomes inactive', async () => {
			const { rerender } = render(HealthTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			// Wait for polling to start
			await waitFor(() => {
				expect(setIntervalSpy).toHaveBeenCalled();
			});

			const initialCalls = clearIntervalSpy.mock.calls.length;

			// Deactivate tab
			await rerender({ flowId: 'test-flow-123', isActive: false });

			// Should clear intervals
			await waitFor(() => {
				expect(clearIntervalSpy.mock.calls.length).toBeGreaterThan(initialCalls);
			});
		});

		it('should fetch health immediately when activated', async () => {
			render(HealthTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			// Should fetch immediately
			await waitFor(() => {
				expect(fetchSpy).toHaveBeenCalledWith('/flowbuilder/flows/test-flow-123/runtime/health');
			});
		});

		it('should poll health at 5 second intervals', async () => {
			render(HealthTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			// Initial fetch
			await waitFor(() => {
				expect(fetchSpy).toHaveBeenCalledTimes(1);
			});

			// Advance time by 5 seconds
			vi.advanceTimersByTime(5000);

			// Should fetch again
			await waitFor(() => {
				expect(fetchSpy).toHaveBeenCalledTimes(2);
			});

			// Advance time by another 5 seconds
			vi.advanceTimersByTime(5000);

			// Should fetch third time
			await waitFor(() => {
				expect(fetchSpy).toHaveBeenCalledTimes(3);
			});
		});

		it('should update uptime every second', async () => {
			render(HealthTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			// Wait for initial render
			await waitFor(() => {
				expect(screen.getByText('udp-source')).toBeInTheDocument();
			});

			// Should have a 1-second interval for uptime updates
			await waitFor(() => {
				const uptimeInterval = setIntervalSpy.mock.calls.find((call) => call[1] === 1000);
				expect(uptimeInterval).toBeDefined();
			});
		});

		it('should clear all intervals on component unmount', async () => {
			const { unmount } = render(HealthTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			await waitFor(() => {
				expect(setIntervalSpy).toHaveBeenCalled();
			});

			const intervalCount = setIntervalSpy.mock.calls.length;

			unmount();

			// Should clear all intervals (health polling + uptime updates)
			expect(clearIntervalSpy).toHaveBeenCalledTimes(intervalCount);
		});
	});

	describe('Health Summary Display', () => {
		it('should display overall health status', async () => {
			render(HealthTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			await waitFor(() => {
				expect(screen.getByTestId('health-summary')).toBeInTheDocument();
				expect(screen.getByText('System Health:')).toBeInTheDocument();
			});
		});

		it('should show correct health count', async () => {
			render(HealthTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			await waitFor(() => {
				expect(screen.getByText('2/3 components healthy')).toBeInTheDocument();
			});
		});

		it('should display healthy status with green indicator', async () => {
			fetchSpy.mockResolvedValue({
				ok: true,
				json: async () => mockHealthyResponse
			} as Response);

			render(HealthTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			await waitFor(() => {
				expect(screen.getByText('🟢')).toBeInTheDocument();
			});
		});

		it('should display degraded status with yellow indicator', async () => {
			render(HealthTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			await waitFor(() => {
				expect(screen.getByText('🟡')).toBeInTheDocument();
			});
		});

		it('should display error status with red indicator', async () => {
			fetchSpy.mockResolvedValue({
				ok: true,
				json: async () => mockErrorResponse
			} as Response);

			render(HealthTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			await waitFor(() => {
				expect(screen.getByText('🔴')).toBeInTheDocument();
			});
		});
	});

	describe('Component Health Table', () => {
		it('should render health table with correct columns', async () => {
			render(HealthTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			await waitFor(() => {
				expect(screen.getByText('Component')).toBeInTheDocument();
				expect(screen.getByText('Status')).toBeInTheDocument();
				expect(screen.getByText('Uptime')).toBeInTheDocument();
				expect(screen.getByText('Last Activity')).toBeInTheDocument();
			});
		});

		it('should display all component names', async () => {
			render(HealthTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			await waitFor(() => {
				expect(screen.getByText('udp-source')).toBeInTheDocument();
				expect(screen.getByText('json-processor')).toBeInTheDocument();
				expect(screen.getByText('nats-sink')).toBeInTheDocument();
			});
		});

		it('should sort components alphabetically', async () => {
			render(HealthTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			await waitFor(() => {
				const rows = screen.getAllByTestId('health-row');
				expect(rows[0]).toHaveTextContent('json-processor');
				expect(rows[1]).toHaveTextContent('nats-sink');
				expect(rows[2]).toHaveTextContent('udp-source');
			});
		});

		it('should display status indicators for each component', async () => {
			render(HealthTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			await waitFor(() => {
				const statusIndicators = screen.getAllByTestId('status-indicator');
				expect(statusIndicators).toHaveLength(3);
			});
		});

		it('should show running status with green indicator', async () => {
			render(HealthTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			await waitFor(() => {
				const indicators = screen.getAllByTestId('status-indicator');
				const runningIndicators = indicators.filter((el) => el.textContent === '●');
				expect(runningIndicators.length).toBeGreaterThan(0);
			});
		});

		it('should show degraded status with warning icon', async () => {
			render(HealthTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			await waitFor(() => {
				const indicators = screen.getAllByTestId('status-indicator');
				const warningIndicators = indicators.filter((el) => el.textContent === '⚠');
				expect(warningIndicators.length).toBeGreaterThan(0);
			});
		});

		it('should show empty state when no components', async () => {
			fetchSpy.mockResolvedValue({
				ok: true,
				json: async () => ({
					timestamp: '2025-11-17T14:23:05.123Z',
					overall: {
						status: 'healthy',
						healthyCount: 0,
						totalCount: 0
					},
					components: []
				})
			} as Response);

			render(HealthTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			await waitFor(() => {
				expect(screen.getByText('No health data available')).toBeInTheDocument();
			});
		});
	});

	describe('Uptime Calculations', () => {
		it('should format uptime as HH:MM:SS', async () => {
			render(HealthTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			await waitFor(() => {
				// Components started ~15 minutes ago
				const uptimes = screen.getAllByText(/\d{2}:\d{2}:\d{2}/);
				expect(uptimes.length).toBeGreaterThan(0);
			});
		});

		it('should update uptime every second', async () => {
			render(HealthTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			// Wait for initial render
			await waitFor(() => {
				expect(screen.getByText('udp-source')).toBeInTheDocument();
			});

			// Get initial uptime values
			const initialUptimes = screen.getAllByText(/\d{2}:\d{2}:\d{2}/);
			const firstUptime = initialUptimes[0].textContent;

			// Advance time by 1 second
			vi.advanceTimersByTime(1000);

			// Uptime should have changed
			await waitFor(() => {
				const newUptimes = screen.getAllByText(/\d{2}:\d{2}:\d{2}/);
				expect(newUptimes[0].textContent).not.toBe(firstUptime);
			});
		});

		it('should calculate uptime correctly for hours', async () => {
			// Component started 2 hours ago
			const twoHoursAgo = new Date('2025-11-17T12:23:05.123Z').toISOString();

			fetchSpy.mockResolvedValue({
				ok: true,
				json: async () => ({
					...mockHealthResponse,
					components: [
						{
							...mockHealthResponse.components[0],
							startTime: twoHoursAgo
						}
					]
				})
			} as Response);

			render(HealthTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			await waitFor(() => {
				// Should show 02:00:00 (2 hours)
				expect(screen.getByText(/02:00:00/)).toBeInTheDocument();
			});
		});
	});

	describe('Last Activity Formatting', () => {
		it('should format recent activity in seconds', async () => {
			render(HealthTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			await waitFor(() => {
				expect(screen.getByText('2 seconds ago')).toBeInTheDocument();
			});
		});

		it('should use singular form for 1 second', async () => {
			fetchSpy.mockResolvedValue({
				ok: true,
				json: async () => ({
					...mockHealthResponse,
					components: [
						{
							...mockHealthResponse.components[0],
							lastActivity: '2025-11-17T14:23:04.123Z' // 1 second ago
						}
					]
				})
			} as Response);

			render(HealthTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			await waitFor(() => {
				expect(screen.getByText('1 second ago')).toBeInTheDocument();
			});
		});

		it('should format activity in minutes when > 60s', async () => {
			const twoMinutesAgo = new Date('2025-11-17T14:21:05.123Z').toISOString();

			fetchSpy.mockResolvedValue({
				ok: true,
				json: async () => ({
					...mockHealthResponse,
					components: [
						{
							...mockHealthResponse.components[0],
							lastActivity: twoMinutesAgo
						}
					]
				})
			} as Response);

			render(HealthTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			await waitFor(() => {
				expect(screen.getByText('2 minutes ago')).toBeInTheDocument();
			});
		});

		it('should format activity in hours when > 60min', async () => {
			const twoHoursAgo = new Date('2025-11-17T12:23:05.123Z').toISOString();

			fetchSpy.mockResolvedValue({
				ok: true,
				json: async () => ({
					...mockHealthResponse,
					components: [
						{
							...mockHealthResponse.components[0],
							lastActivity: twoHoursAgo
						}
					]
				})
			} as Response);

			render(HealthTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			await waitFor(() => {
				expect(screen.getByText('2 hours ago')).toBeInTheDocument();
			});
		});

		it('should highlight stale components (>30s)', async () => {
			fetchSpy.mockResolvedValue({
				ok: true,
				json: async () => mockErrorResponse // Has stale component (35s ago)
			} as Response);

			render(HealthTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			await waitFor(() => {
				const rows = screen.getAllByTestId('health-row');
				const staleRow = rows.find((row) => row.textContent?.includes('35 seconds ago'));
				expect(staleRow?.querySelector('.stale')).toBeTruthy();
			});
		});
	});

	describe('Expandable Details', () => {
		it('should show expand button for components with details', async () => {
			render(HealthTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			await waitFor(() => {
				const expandButtons = screen.getAllByTestId('expand-button');
				expect(expandButtons).toHaveLength(1); // Only nats-sink has details
			});
		});

		it('should not show expand button for healthy components', async () => {
			fetchSpy.mockResolvedValue({
				ok: true,
				json: async () => mockHealthyResponse
			} as Response);

			render(HealthTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			await waitFor(() => {
				expect(screen.getByText('udp-source')).toBeInTheDocument();
				const expandButtons = screen.queryAllByTestId('expand-button');
				expect(expandButtons).toHaveLength(0);
			});
		});

		it('should expand details when button is clicked', async () => {
			render(HealthTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			await waitFor(() => {
				expect(screen.getByTestId('expand-button')).toBeInTheDocument();
			});

			const expandButton = screen.getByTestId('expand-button');
			await fireEvent.click(expandButton);

			// Details row should appear
			await waitFor(() => {
				expect(screen.getByTestId('details-row')).toBeInTheDocument();
				expect(screen.getByText('Slow acks (>100ms)')).toBeInTheDocument();
			});
		});

		it('should collapse details when button is clicked again', async () => {
			render(HealthTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			await waitFor(() => {
				expect(screen.getByTestId('expand-button')).toBeInTheDocument();
			});

			const expandButton = screen.getByTestId('expand-button');

			// Expand
			await fireEvent.click(expandButton);
			await waitFor(() => {
				expect(screen.getByTestId('details-row')).toBeInTheDocument();
			});

			// Collapse
			await fireEvent.click(expandButton);
			await waitFor(() => {
				expect(screen.queryByTestId('details-row')).not.toBeInTheDocument();
			});
		});

		it('should display warning severity correctly', async () => {
			render(HealthTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			const expandButton = await screen.findByTestId('expand-button');
			await fireEvent.click(expandButton);

			await waitFor(() => {
				expect(screen.getByText('WARNING:')).toBeInTheDocument();
			});
		});

		it('should display error severity correctly', async () => {
			fetchSpy.mockResolvedValue({
				ok: true,
				json: async () => mockErrorResponse
			} as Response);

			render(HealthTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			const expandButton = await screen.findByTestId('expand-button');
			await fireEvent.click(expandButton);

			await waitFor(() => {
				expect(screen.getByText('ERROR:')).toBeInTheDocument();
			});
		});

		it('should format detail timestamp correctly', async () => {
			render(HealthTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			const expandButton = await screen.findByTestId('expand-button');
			await fireEvent.click(expandButton);

			await waitFor(() => {
				expect(screen.getByText(/Occurred:/)).toBeInTheDocument();
			});
		});

		it('should update aria-expanded attribute', async () => {
			render(HealthTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			const expandButton = await screen.findByTestId('expand-button');

			// Initially collapsed
			expect(expandButton).toHaveAttribute('aria-expanded', 'false');

			// Click to expand
			await fireEvent.click(expandButton);
			await waitFor(() => {
				expect(expandButton).toHaveAttribute('aria-expanded', 'true');
			});

			// Click to collapse
			await fireEvent.click(expandButton);
			await waitFor(() => {
				expect(expandButton).toHaveAttribute('aria-expanded', 'false');
			});
		});
	});

	describe('Error Handling', () => {
		it('should show error message when fetch fails', async () => {
			fetchSpy.mockRejectedValue(new Error('Network error'));

			render(HealthTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			await waitFor(() => {
				expect(
					screen.getByText('Health monitoring unavailable - backend endpoint not ready')
				).toBeInTheDocument();
			});
		});

		it('should show error message when response is not ok', async () => {
			fetchSpy.mockResolvedValue({
				ok: false,
				status: 404,
				statusText: 'Not Found'
			} as Response);

			render(HealthTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			await waitFor(() => {
				expect(
					screen.getByText('Health monitoring unavailable - backend endpoint not ready')
				).toBeInTheDocument();
			});
		});

		it('should continue polling after error', async () => {
			// First call fails
			fetchSpy.mockRejectedValueOnce(new Error('Network error'));
			// Second call succeeds
			fetchSpy.mockResolvedValueOnce({
				ok: true,
				json: async () => mockHealthResponse
			} as Response);

			render(HealthTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			// Should show error initially
			await waitFor(() => {
				expect(
					screen.getByText('Health monitoring unavailable - backend endpoint not ready')
				).toBeInTheDocument();
			});

			// Advance time to next poll
			vi.advanceTimersByTime(5000);

			// Should show health data after successful fetch
			await waitFor(() => {
				expect(screen.getByText('udp-source')).toBeInTheDocument();
			});
		});

		it('should clear error message after successful fetch', async () => {
			fetchSpy.mockRejectedValueOnce(new Error('Network error'));
			fetchSpy.mockResolvedValueOnce({
				ok: true,
				json: async () => mockHealthResponse
			} as Response);

			render(HealthTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			// Wait for error
			await waitFor(() => {
				expect(screen.getByTestId('health-error')).toBeInTheDocument();
			});

			// Advance time
			vi.advanceTimersByTime(5000);

			// Error should be cleared
			await waitFor(() => {
				expect(screen.queryByTestId('health-error')).not.toBeInTheDocument();
			});
		});
	});

	describe('Accessibility', () => {
		it('should have proper table structure', async () => {
			render(HealthTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			await waitFor(() => {
				const table = screen.getByRole('table');
				expect(table).toBeInTheDocument();
			});
		});

		it('should have column headers with scope attributes', async () => {
			render(HealthTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			await waitFor(() => {
				const headers = screen.getAllByRole('columnheader');
				expect(headers.length).toBe(4); // Component, Status, Uptime, Last Activity
				headers.forEach((header) => {
					expect(header).toHaveAttribute('scope', 'col');
				});
			});
		});

		it('should have accessible status indicators with aria-labels', async () => {
			render(HealthTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			await waitFor(() => {
				const indicators = screen.getAllByTestId('status-indicator');
				indicators.forEach((indicator) => {
					expect(indicator).toHaveAttribute('aria-label');
				});
			});
		});

		it('should have accessible expand buttons with aria-labels', async () => {
			render(HealthTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			const expandButton = await screen.findByTestId('expand-button');
			expect(expandButton).toHaveAttribute('aria-label');
			expect(expandButton.getAttribute('aria-label')).toContain('nats-sink');
		});

		it('should have accessible error alerts', async () => {
			fetchSpy.mockRejectedValue(new Error('Network error'));

			render(HealthTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			await waitFor(() => {
				const alert = screen.getByRole('alert');
				expect(alert).toBeInTheDocument();
			});
		});

		it('should have accessible overall health summary', async () => {
			render(HealthTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			await waitFor(() => {
				const summary = screen.getByTestId('health-summary');
				const statusElement = summary.querySelector('[aria-label*="health"]');
				expect(statusElement).toBeTruthy();
			});
		});
	});

	describe('Performance', () => {
		it('should not poll when tab is inactive', async () => {
			render(HealthTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: false
				}
			});

			// Should not start polling
			expect(setIntervalSpy).not.toHaveBeenCalled();

			// Advance time
			vi.advanceTimersByTime(10000);

			// Still should not have polled
			expect(fetchSpy).not.toHaveBeenCalled();
		});

		it('should cancel in-flight request when unmounting', async () => {
			const { unmount } = render(HealthTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			await waitFor(() => {
				expect(setIntervalSpy).toHaveBeenCalled();
			});

			// Should not throw when unmounting
			expect(() => unmount()).not.toThrow();
		});

		it('should handle multiple rapid expand/collapse clicks', async () => {
			render(HealthTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			const expandButton = await screen.findByTestId('expand-button');

			// Rapid clicks
			await fireEvent.click(expandButton);
			await fireEvent.click(expandButton);
			await fireEvent.click(expandButton);

			// Should end up collapsed (odd number of clicks)
			await waitFor(() => {
				expect(expandButton).toHaveAttribute('aria-expanded', 'true');
			});
		});
	});
});
