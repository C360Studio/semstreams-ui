import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import LogsTab from './LogsTab.svelte';

/**
 * LogsTab Component Tests
 * Tests for Phase 2: Real-time log streaming with filtering
 */

interface MockEventSource {
	addEventListener: (event: string, handler: (e: Event) => void) => void;
	close: () => void;
	readyState: number;
}

describe('LogsTab', () => {
	// Mock EventSource
	let mockEventSource: MockEventSource;
	let eventListeners: Record<string, ((e: Event) => void)[]> = {};
	let mockEventSourceConstructor: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		// Reset event listeners
		eventListeners = {};

		// Mock EventSource
		mockEventSource = {
			addEventListener: vi.fn((event: string, handler: (e: Event) => void) => {
				if (!eventListeners[event]) {
					eventListeners[event] = [];
				}
				eventListeners[event].push(handler);
			}),
			close: vi.fn(),
			readyState: 0
		};

		// Create mock EventSource constructor
		mockEventSourceConstructor = vi.fn(() => mockEventSource);

		// @ts-expect-error - Assigning mock to global EventSource
		globalThis.EventSource = mockEventSourceConstructor;
	});

	describe('Connection Lifecycle', () => {
		it('should not connect when isActive is false', () => {
			render(LogsTab, { flowId: 'test-flow', isActive: false });

			expect(mockEventSourceConstructor).not.toHaveBeenCalled();
		});

		it('should connect to SSE endpoint when isActive is true', () => {
			render(LogsTab, { flowId: 'test-flow-123', isActive: true });

			expect(mockEventSourceConstructor).toHaveBeenCalledWith('/flowbuilder/flows/test-flow-123/runtime/logs');
		});

		it('should show connecting status initially', () => {
			render(LogsTab, { flowId: 'test-flow', isActive: true });

			const connectingStatus = screen.getByTestId('connection-connecting');
			expect(connectingStatus).toBeTruthy();
			expect(connectingStatus.textContent).toContain('Connecting to log stream');
		});

		it('should handle connection open event', async () => {
			render(LogsTab, { flowId: 'test-flow', isActive: true });

			// Simulate connection open
			const openHandler = eventListeners['open']?.[0];
			openHandler?.(new Event('open'));

			await waitFor(() => {
				const connectingStatus = screen.queryByTestId('connection-connecting');
				expect(connectingStatus).toBeNull();
			});
		});

		it('should show error message on connection failure', async () => {
			render(LogsTab, { flowId: 'test-flow', isActive: true });

			// Simulate connection error
			const errorHandler = eventListeners['error']?.[0];
			errorHandler?.(new Event('error'));

			await waitFor(() => {
				const errorStatus = screen.getByTestId('connection-error');
				expect(errorStatus).toBeTruthy();
				expect(errorStatus.textContent).toContain('Log streaming unavailable');
			});
		});

		it('should close connection when component unmounts', () => {
			const { unmount } = render(LogsTab, { flowId: 'test-flow', isActive: true });

			unmount();

			expect(mockEventSource.close).toHaveBeenCalled();
		});
	});

	describe('Log Streaming', () => {
		it('should display received log entries', async () => {
			render(LogsTab, { flowId: 'test-flow', isActive: true });

			// Simulate connection open
			eventListeners['open']?.[0](new Event('open'));

			// Simulate log event
			const logHandler = eventListeners['log']?.[0];
			const logEvent = new MessageEvent('log', {
				data: JSON.stringify({
					timestamp: '2025-11-17T14:23:01.234Z',
					level: 'INFO',
					component: 'udp-source',
					message: 'Listening on port 8080'
				})
			});
			logHandler?.(logEvent);

			await waitFor(() => {
				const logEntries = screen.getAllByTestId('log-entry');
				expect(logEntries).toHaveLength(1);
				expect(logEntries[0].textContent).toContain('INFO');
				expect(logEntries[0].textContent).toContain('[udp-source]');
				expect(logEntries[0].textContent).toContain('Listening on port 8080');
			});
		});

		it('should format timestamps correctly', async () => {
			render(LogsTab, { flowId: 'test-flow', isActive: true });

			eventListeners['open']?.[0](new Event('open'));

			const logHandler = eventListeners['log']?.[0];
			const logEvent = new MessageEvent('log', {
				data: JSON.stringify({
					timestamp: '2025-11-17T14:23:45.678Z',
					level: 'DEBUG',
					component: 'processor',
					message: 'Test message'
				})
			});
			logHandler?.(logEvent);

			await waitFor(() => {
				const logEntry = screen.getByTestId('log-entry');
				// Timestamp should be formatted as HH:MM:SS.mmm
				expect(logEntry.textContent).toMatch(/\d{2}:\d{2}:\d{2}\.\d{3}/);
			});
		});

		it('should handle multi-line log messages', async () => {
			render(LogsTab, { flowId: 'test-flow', isActive: true });

			eventListeners['open']?.[0](new Event('open'));

			const logHandler = eventListeners['log']?.[0];
			const logEvent = new MessageEvent('log', {
				data: JSON.stringify({
					timestamp: '2025-11-17T14:23:02.456Z',
					level: 'ERROR',
					component: 'processor',
					message: 'Failed to process message\n  at processor.go:45\n  invalid JSON syntax'
				})
			});
			logHandler?.(logEvent);

			await waitFor(() => {
				const logEntry = screen.getByTestId('log-entry');
				expect(logEntry.textContent).toContain('Failed to process message');
				expect(logEntry.textContent).toContain('at processor.go:45');
				expect(logEntry.textContent).toContain('invalid JSON syntax');
			});
		});

		it('should display multiple log entries in order', async () => {
			render(LogsTab, { flowId: 'test-flow', isActive: true });

			eventListeners['open']?.[0](new Event('open'));

			const logHandler = eventListeners['log']?.[0];

			// Send multiple logs
			const logs = [
				{ timestamp: '2025-11-17T14:23:01.000Z', level: 'INFO', component: 'source', message: 'First' },
				{ timestamp: '2025-11-17T14:23:02.000Z', level: 'WARN', component: 'processor', message: 'Second' },
				{ timestamp: '2025-11-17T14:23:03.000Z', level: 'DEBUG', component: 'sink', message: 'Third' }
			];

			for (const log of logs) {
				logHandler?.(new MessageEvent('log', { data: JSON.stringify(log) }));
			}

			await waitFor(() => {
				const logEntries = screen.getAllByTestId('log-entry');
				expect(logEntries).toHaveLength(3);
				expect(logEntries[0].textContent).toContain('First');
				expect(logEntries[1].textContent).toContain('Second');
				expect(logEntries[2].textContent).toContain('Third');
			});
		});
	});

	describe('Filtering', () => {
		beforeEach(async () => {
			render(LogsTab, { flowId: 'test-flow', isActive: true });

			eventListeners['open']?.[0](new Event('open'));

			const logHandler = eventListeners['log']?.[0];

			// Add test logs
			const logs = [
				{ timestamp: '2025-11-17T14:23:01.000Z', level: 'DEBUG', component: 'source', message: 'Debug message' },
				{ timestamp: '2025-11-17T14:23:02.000Z', level: 'INFO', component: 'processor', message: 'Info message' },
				{ timestamp: '2025-11-17T14:23:03.000Z', level: 'WARN', component: 'source', message: 'Warning message' },
				{ timestamp: '2025-11-17T14:23:04.000Z', level: 'ERROR', component: 'sink', message: 'Error message' }
			];

			for (const log of logs) {
				logHandler?.(new MessageEvent('log', { data: JSON.stringify(log) }));
			}

			await waitFor(() => {
				expect(screen.getAllByTestId('log-entry')).toHaveLength(4);
			});
		});

		it('should filter logs by level', async () => {
			const levelFilter = screen.getByTestId('level-filter') as HTMLSelectElement;

			await fireEvent.change(levelFilter, { target: { value: 'ERROR' } });

			await waitFor(() => {
				const logEntries = screen.getAllByTestId('log-entry');
				expect(logEntries).toHaveLength(1);
				expect(logEntries[0].textContent).toContain('ERROR');
				expect(logEntries[0].textContent).toContain('Error message');
			});
		});

		it('should filter logs by component', async () => {
			const componentFilter = screen.getByTestId('component-filter') as HTMLSelectElement;

			await fireEvent.change(componentFilter, { target: { value: 'source' } });

			await waitFor(() => {
				const logEntries = screen.getAllByTestId('log-entry');
				expect(logEntries).toHaveLength(2);
				expect(logEntries[0].textContent).toContain('[source]');
				expect(logEntries[1].textContent).toContain('[source]');
			});
		});

		it('should populate component filter with unique components', async () => {
			const componentFilter = screen.getByTestId('component-filter') as HTMLSelectElement;
			const options = Array.from(componentFilter.options).map(o => o.value);

			expect(options).toContain('all');
			expect(options).toContain('source');
			expect(options).toContain('processor');
			expect(options).toContain('sink');
		});

		it('should combine level and component filters', async () => {
			const levelFilter = screen.getByTestId('level-filter') as HTMLSelectElement;
			const componentFilter = screen.getByTestId('component-filter') as HTMLSelectElement;

			await fireEvent.change(levelFilter, { target: { value: 'WARN' } });
			await fireEvent.change(componentFilter, { target: { value: 'source' } });

			await waitFor(() => {
				const logEntries = screen.getAllByTestId('log-entry');
				expect(logEntries).toHaveLength(1);
				expect(logEntries[0].textContent).toContain('WARN');
				expect(logEntries[0].textContent).toContain('[source]');
			});
		});

		it('should show empty state when no logs match filters', async () => {
			const levelFilter = screen.getByTestId('level-filter') as HTMLSelectElement;

			await fireEvent.change(levelFilter, { target: { value: 'DEBUG' } });

			const componentFilter = screen.getByTestId('component-filter') as HTMLSelectElement;
			await fireEvent.change(componentFilter, { target: { value: 'sink' } });

			await waitFor(() => {
				const logEntries = screen.queryAllByTestId('log-entry');
				expect(logEntries).toHaveLength(0);
				expect(screen.getByText(/No logs match current filters/)).toBeTruthy();
			});
		});
	});

	describe('Controls', () => {
		it('should clear all logs when Clear button is clicked', async () => {
			render(LogsTab, { flowId: 'test-flow', isActive: true });

			eventListeners['open']?.[0](new Event('open'));

			const logHandler = eventListeners['log']?.[0];
			logHandler?.(new MessageEvent('log', {
				data: JSON.stringify({
					timestamp: '2025-11-17T14:23:01.000Z',
					level: 'INFO',
					component: 'test',
					message: 'Test message'
				})
			}));

			await waitFor(() => {
				expect(screen.getAllByTestId('log-entry')).toHaveLength(1);
			});

			const clearButton = screen.getByTestId('clear-logs-button');
			await fireEvent.click(clearButton);

			await waitFor(() => {
				const logEntries = screen.queryAllByTestId('log-entry');
				expect(logEntries).toHaveLength(0);
			});
		});

		it('should reset filters when clearing logs', async () => {
			render(LogsTab, { flowId: 'test-flow', isActive: true });

			const levelFilter = screen.getByTestId('level-filter') as HTMLSelectElement;
			await fireEvent.change(levelFilter, { target: { value: 'ERROR' } });

			const clearButton = screen.getByTestId('clear-logs-button');
			await fireEvent.click(clearButton);

			await waitFor(() => {
				expect(levelFilter.value).toBe('all');
			});
		});

		it('should toggle auto-scroll checkbox', async () => {
			render(LogsTab, { flowId: 'test-flow', isActive: true });

			const autoScrollToggle = screen.getByTestId('auto-scroll-toggle') as HTMLInputElement;
			expect(autoScrollToggle.checked).toBe(true);

			await fireEvent.click(autoScrollToggle);

			await waitFor(() => {
				expect(autoScrollToggle.checked).toBe(false);
			});
		});
	});

	describe('Empty States', () => {
		it('should show empty state when no logs received yet', () => {
			render(LogsTab, { flowId: 'test-flow', isActive: true });

			expect(screen.getByText(/No logs yet. Waiting for runtime events/)).toBeTruthy();
		});
	});

	describe('Accessibility', () => {
		it('should have proper ARIA labels on controls', () => {
			render(LogsTab, { flowId: 'test-flow', isActive: true });

			const clearButton = screen.getByTestId('clear-logs-button');
			expect(clearButton.getAttribute('aria-label')).toBe('Clear all logs');
		});

		it('should use aria-live region for log entries when logs exist', async () => {
			render(LogsTab, { flowId: 'test-flow', isActive: true });

			eventListeners['open']?.[0](new Event('open'));

			// Add a log entry first
			const logHandler = eventListeners['log']?.[0];
			logHandler?.(new MessageEvent('log', {
				data: JSON.stringify({
					timestamp: '2025-11-17T14:23:01.000Z',
					level: 'INFO',
					component: 'test',
					message: 'Test message'
				})
			}));

			await waitFor(() => {
				const logContainer = screen.getByRole('log');
				expect(logContainer.getAttribute('aria-live')).toBe('polite');
			});
		});
	});
});
