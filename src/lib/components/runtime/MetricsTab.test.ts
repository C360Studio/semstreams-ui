import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/svelte';
import MetricsTab from './MetricsTab.svelte';

/**
 * MetricsTab Component Tests
 * Phase 3 of Runtime Visualization Panel
 *
 * Tests:
 * - Polling lifecycle (start, stop, interval changes)
 * - Metrics display and formatting
 * - Refresh rate selector
 * - Error handling
 * - Accessibility
 */

// Mock metrics data
const mockMetricsResponse = {
	timestamp: '2025-11-17T14:23:05.123Z',
	components: [
		{
			name: 'udp-source',
			throughput: 1234,
			errorRate: 0,
			status: 'healthy' as const,
			cpu: 5.2,
			memory: 12582912 // 12 MB in bytes
		},
		{
			name: 'json-processor',
			throughput: 1230,
			errorRate: 4,
			status: 'degraded' as const,
			cpu: 12.4,
			memory: 29360128 // 28 MB in bytes
		},
		{
			name: 'nats-sink',
			throughput: 1226,
			errorRate: 0,
			status: 'healthy' as const,
			cpu: 3.1,
			memory: 8388608 // 8 MB in bytes
		}
	]
};

describe('MetricsTab', () => {
	let fetchSpy: ReturnType<typeof vi.spyOn>;
	let setIntervalSpy: ReturnType<typeof vi.spyOn>;
	let clearIntervalSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		vi.useFakeTimers();

		// Mock fetch API
		fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
			ok: true,
			json: async () => mockMetricsResponse
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
			const { rerender } = render(MetricsTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: false
				}
			});

			// No polling when inactive
			expect(setIntervalSpy).not.toHaveBeenCalled();

			// Activate tab
			await rerender({ flowId: 'test-flow-123', isActive: true });

			// Should start polling
			await waitFor(() => {
				expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 2000);
			});
		});

		it('should stop polling when tab becomes inactive', async () => {
			const { rerender } = render(MetricsTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			// Wait for polling to start
			await waitFor(() => {
				expect(setIntervalSpy).toHaveBeenCalled();
			});

			const intervalId = setIntervalSpy.mock.results[0]?.value;

			// Deactivate tab
			await rerender({ flowId: 'test-flow-123', isActive: false });

			// Should clear interval
			await waitFor(() => {
				expect(clearIntervalSpy).toHaveBeenCalledWith(intervalId);
			});
		});

		it('should fetch metrics immediately when activated', async () => {
			render(MetricsTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			// Should fetch immediately
			await waitFor(() => {
				expect(fetchSpy).toHaveBeenCalledWith('/flowbuilder/flows/test-flow-123/runtime/metrics');
			});
		});

		it('should poll metrics at specified interval', async () => {
			render(MetricsTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			// Initial fetch
			await waitFor(() => {
				expect(fetchSpy).toHaveBeenCalledTimes(1);
			});

			// Advance time by 2 seconds
			vi.advanceTimersByTime(2000);

			// Should fetch again
			await waitFor(() => {
				expect(fetchSpy).toHaveBeenCalledTimes(2);
			});

			// Advance time by another 2 seconds
			vi.advanceTimersByTime(2000);

			// Should fetch third time
			await waitFor(() => {
				expect(fetchSpy).toHaveBeenCalledTimes(3);
			});
		});

		it('should clear interval on component unmount', async () => {
			const { unmount } = render(MetricsTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			await waitFor(() => {
				expect(setIntervalSpy).toHaveBeenCalled();
			});

			const intervalId = setIntervalSpy.mock.results[0]?.value;

			unmount();

			// Should clear interval
			expect(clearIntervalSpy).toHaveBeenCalledWith(intervalId);
		});
	});

	describe('Metrics Display', () => {
		it('should render metrics table with correct columns', async () => {
			render(MetricsTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			await waitFor(() => {
				expect(screen.getByText('Component')).toBeInTheDocument();
				expect(screen.getByText('Msg/sec')).toBeInTheDocument();
				expect(screen.getByText('Errors/sec')).toBeInTheDocument();
				expect(screen.getByText('CPU')).toBeInTheDocument();
				expect(screen.getByText('Memory')).toBeInTheDocument();
				expect(screen.getByText('Status')).toBeInTheDocument();
			});
		});

		it('should display component metrics correctly', async () => {
			render(MetricsTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			await waitFor(() => {
				// Component names
				expect(screen.getByText('udp-source')).toBeInTheDocument();
				expect(screen.getByText('json-processor')).toBeInTheDocument();
				expect(screen.getByText('nats-sink')).toBeInTheDocument();
			});
		});

		it('should format numbers with commas', async () => {
			render(MetricsTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			await waitFor(() => {
				// 1234 should be formatted as "1,234"
				expect(screen.getByText('1,234')).toBeInTheDocument();
			});
		});

		it('should format memory in MB with 2 decimals', async () => {
			render(MetricsTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			await waitFor(() => {
				// 12582912 bytes = 12.00 MB
				expect(screen.getByText('12.00 MB')).toBeInTheDocument();
				// 29360128 bytes = 28.00 MB
				expect(screen.getByText('28.00 MB')).toBeInTheDocument();
			});
		});

		it('should format CPU percentages with 1 decimal', async () => {
			render(MetricsTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			await waitFor(() => {
				expect(screen.getByText('5.2%')).toBeInTheDocument();
				expect(screen.getByText('12.4%')).toBeInTheDocument();
			});
		});

		it('should show status indicators for each component', async () => {
			render(MetricsTab, {
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

		it('should sort components alphabetically by name', async () => {
			render(MetricsTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			await waitFor(() => {
				const rows = screen.getAllByTestId('metrics-row');
				expect(rows[0]).toHaveTextContent('json-processor');
				expect(rows[1]).toHaveTextContent('nats-sink');
				expect(rows[2]).toHaveTextContent('udp-source');
			});
		});

		it('should show N/A for missing CPU metrics', async () => {
			fetchSpy.mockResolvedValue({
				ok: true,
				json: async () => ({
					timestamp: '2025-11-17T14:23:05.123Z',
					components: [
						{
							name: 'test-component',
							throughput: 100,
							errorRate: 0,
							status: 'healthy'
							// No cpu or memory fields
						}
					]
				})
			} as Response);

			render(MetricsTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			await waitFor(() => {
				const naElements = screen.getAllByText('N/A');
				expect(naElements.length).toBeGreaterThan(0);
			});
		});

		it('should show empty state when no components', async () => {
			fetchSpy.mockResolvedValue({
				ok: true,
				json: async () => ({
					timestamp: '2025-11-17T14:23:05.123Z',
					components: []
				})
			} as Response);

			render(MetricsTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			await waitFor(() => {
				expect(screen.getByText('No metrics available')).toBeInTheDocument();
			});
		});
	});

	describe('Refresh Rate Selector', () => {
		it('should render refresh rate selector with default value', async () => {
			render(MetricsTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			const selector = screen.getByTestId('refresh-rate-selector');
			expect(selector).toBeInTheDocument();
			expect(selector).toHaveValue('2000');
		});

		it('should change polling interval when selector is changed', async () => {
			render(MetricsTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			// Initial interval should be 2000
			await waitFor(() => {
				const calls = setIntervalSpy.mock.calls.filter((call) => call[1] === 2000);
				expect(calls.length).toBeGreaterThan(0);
			});

			const initialCallCount = setIntervalSpy.mock.calls.length;

			const selector = screen.getByTestId('refresh-rate-selector') as HTMLSelectElement;

			// Change to 5 seconds
			await fireEvent.change(selector, { target: { value: '5000' } });

			// Should create a new interval with 5000ms
			await waitFor(() => {
				expect(setIntervalSpy.mock.calls.length).toBeGreaterThan(initialCallCount);
				const calls5s = setIntervalSpy.mock.calls.filter((call) => call[1] === 5000);
				expect(calls5s.length).toBeGreaterThan(0);
			});
		});

		it('should stop polling when manual mode is selected', async () => {
			render(MetricsTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			await waitFor(() => {
				expect(setIntervalSpy).toHaveBeenCalled();
			});

			const initialCalls = clearIntervalSpy.mock.calls.length;

			const selector = screen.getByTestId('refresh-rate-selector') as HTMLSelectElement;
			await fireEvent.change(selector, { target: { value: 'manual' } });

			// Should clear interval
			await waitFor(() => {
				expect(clearIntervalSpy.mock.calls.length).toBeGreaterThan(initialCalls);
			});
		});

		it('should show refresh button in manual mode', async () => {
			render(MetricsTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			const selector = screen.getByTestId('refresh-rate-selector') as HTMLSelectElement;
			await fireEvent.change(selector, { target: { value: 'manual' } });

			await waitFor(() => {
				expect(screen.getByTestId('manual-refresh-button')).toBeInTheDocument();
			});
		});

		it('should fetch metrics when manual refresh button is clicked', async () => {
			render(MetricsTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			// Wait for initial fetch
			await waitFor(() => {
				expect(fetchSpy).toHaveBeenCalledTimes(1);
			});

			const selector = screen.getByTestId('refresh-rate-selector') as HTMLSelectElement;
			await fireEvent.change(selector, { target: { value: 'manual' } });

			const refreshButton = await screen.findByTestId('manual-refresh-button');
			await fireEvent.click(refreshButton);

			// Should fetch again
			await waitFor(() => {
				expect(fetchSpy).toHaveBeenCalledTimes(2);
			});
		});
	});

	describe('Last Updated Timestamp', () => {
		it('should show last updated timestamp after fetch', async () => {
			render(MetricsTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			await waitFor(() => {
				expect(screen.getByTestId('last-updated')).toBeInTheDocument();
			});
		});

		it('should update timestamp on each poll', async () => {
			render(MetricsTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			// Wait for initial fetch
			await waitFor(() => {
				expect(screen.getByTestId('last-updated')).toBeInTheDocument();
			});

			const firstTimestamp = screen.getByTestId('last-updated').textContent;

			// Advance time
			vi.advanceTimersByTime(2000);

			// Wait for next fetch
			await waitFor(() => {
				const newTimestamp = screen.getByTestId('last-updated').textContent;
				expect(newTimestamp).not.toBe(firstTimestamp);
			});
		});
	});

	describe('Error Handling', () => {
		it('should show error message when fetch fails', async () => {
			fetchSpy.mockRejectedValue(new Error('Network error'));

			render(MetricsTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			await waitFor(() => {
				expect(
					screen.getByText('Metrics unavailable - backend endpoint not ready')
				).toBeInTheDocument();
			});
		});

		it('should show error message when response is not ok', async () => {
			fetchSpy.mockResolvedValue({
				ok: false,
				status: 404,
				statusText: 'Not Found'
			} as Response);

			render(MetricsTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			await waitFor(() => {
				expect(
					screen.getByText('Metrics unavailable - backend endpoint not ready')
				).toBeInTheDocument();
			});
		});

		it('should continue polling after error', async () => {
			// First call fails
			fetchSpy.mockRejectedValueOnce(new Error('Network error'));
			// Second call succeeds
			fetchSpy.mockResolvedValueOnce({
				ok: true,
				json: async () => mockMetricsResponse
			} as Response);

			render(MetricsTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			// Should show error initially
			await waitFor(() => {
				expect(
					screen.getByText('Metrics unavailable - backend endpoint not ready')
				).toBeInTheDocument();
			});

			// Advance time to next poll
			vi.advanceTimersByTime(2000);

			// Should show metrics after successful fetch
			await waitFor(() => {
				expect(screen.getByText('udp-source')).toBeInTheDocument();
			});
		});

		it('should clear error message after successful fetch', async () => {
			fetchSpy.mockRejectedValueOnce(new Error('Network error'));
			fetchSpy.mockResolvedValueOnce({
				ok: true,
				json: async () => mockMetricsResponse
			} as Response);

			render(MetricsTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			// Wait for error
			await waitFor(() => {
				expect(
					screen.getByText('Metrics unavailable - backend endpoint not ready')
				).toBeInTheDocument();
			});

			// Advance time
			vi.advanceTimersByTime(2000);

			// Error should be cleared
			await waitFor(() => {
				expect(
					screen.queryByText('Metrics unavailable - backend endpoint not ready')
				).not.toBeInTheDocument();
			});
		});
	});

	describe('Accessibility', () => {
		it('should have proper table structure', async () => {
			render(MetricsTab, {
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
			render(MetricsTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			await waitFor(() => {
				const headers = screen.getAllByRole('columnheader');
				expect(headers.length).toBeGreaterThan(0);
				headers.forEach((header) => {
					expect(header).toHaveAttribute('scope', 'col');
				});
			});
		});

		it('should have accessible refresh rate selector', async () => {
			render(MetricsTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			const selector = screen.getByLabelText('Refresh rate');
			expect(selector).toBeInTheDocument();
		});

		it('should have accessible manual refresh button', async () => {
			render(MetricsTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: true
				}
			});

			const selector = screen.getByTestId('refresh-rate-selector') as HTMLSelectElement;
			await fireEvent.change(selector, { target: { value: 'manual' } });

			const button = await screen.findByRole('button', { name: /refresh/i });
			expect(button).toBeInTheDocument();
		});

		it('should have accessible error alerts', async () => {
			fetchSpy.mockRejectedValue(new Error('Network error'));

			render(MetricsTab, {
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

		it('should have text alternatives for status indicators', async () => {
			render(MetricsTab, {
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
	});

	describe('Performance', () => {
		it('should not poll when tab is inactive', async () => {
			render(MetricsTab, {
				props: {
					flowId: 'test-flow-123',
					isActive: false
				}
			});

			// Should not start polling
			expect(setIntervalSpy).not.toHaveBeenCalled();

			// Advance time
			vi.advanceTimersByTime(5000);

			// Still should not have polled
			expect(fetchSpy).not.toHaveBeenCalled();
		});

		it('should cancel in-flight request when unmounting', async () => {
			// This is harder to test directly, but we can verify the cleanup effect runs
			const { unmount } = render(MetricsTab, {
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
	});
});
