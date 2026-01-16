/**
 * MessagesTab Component Tests
 * Tests for store-based NATS message flow visualization
 * Messages come from logs filtered by source="message-logger"
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { writable, type Writable } from 'svelte/store';
import MessagesTab from './MessagesTab.svelte';
import type { RuntimeStoreState, LogEntry } from '$lib/stores/runtimeStore.svelte';

// Create a mock store that we can control
let mockStoreState: Writable<RuntimeStoreState>;
let mockClearLogs: Mock;

// Mock the runtimeStore module
vi.mock('$lib/stores/runtimeStore.svelte', () => {
	const clearLogsMock = vi.fn();

	return {
		runtimeStore: {
			subscribe: (fn: (state: RuntimeStoreState) => void) => {
				return mockStoreState.subscribe(fn);
			},
			clearLogs: clearLogsMock
		},
		get __mockClearLogs() {
			return clearLogsMock;
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

function createMessageLog(overrides: Partial<LogEntry> & { fields?: Record<string, unknown> } = {}): LogEntry {
	return {
		id: `log-${Date.now()}-${Math.random()}`,
		timestamp: Date.now(),
		level: 'INFO',
		source: 'message-logger', // Important: must be message-logger
		message: 'Message logged',
		fields: {
			subject: 'test.subject',
			direction: 'published',
			component: 'test-component',
			...overrides.fields
		},
		...overrides
	};
}

// Sample message logs for tests
const sampleMessageLogs: LogEntry[] = [
	createMessageLog({
		id: 'msg-001',
		timestamp: 1705329785123,
		message: 'Published camera frame data',
		fields: {
			subject: 'sensors.camera.frame',
			direction: 'published',
			component: 'camera-sensor',
			frame_id: 1234,
			resolution: '1920x1080'
		}
	}),
	createMessageLog({
		id: 'msg-002',
		timestamp: 1705329785456,
		message: 'Received camera frame for processing',
		fields: {
			subject: 'sensors.camera.frame',
			direction: 'received',
			component: 'image-processor'
		}
	}),
	createMessageLog({
		id: 'msg-003',
		timestamp: 1705329785789,
		message: 'Completed image processing',
		fields: {
			subject: 'processors.vision.output',
			direction: 'processed',
			component: 'image-processor',
			objects_detected: 3,
			processing_time_ms: 45
		}
	})
];

describe('MessagesTab', () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		mockStoreState = writable<RuntimeStoreState>(createDefaultState());

		const module = await import('$lib/stores/runtimeStore.svelte');
		mockClearLogs = (module as unknown as { __mockClearLogs: Mock }).__mockClearLogs;
	});

	describe('Connection Status', () => {
		it('should show connecting status when not connected', () => {
			mockStoreState.set({
				...createDefaultState(),
				connected: false
			});

			render(MessagesTab, { flowId: 'test-flow', isActive: true });

			expect(screen.getByText(/Connecting to runtime stream/)).toBeTruthy();
		});

		it('should hide connecting status when connected', async () => {
			mockStoreState.set({
				...createDefaultState(),
				connected: true
			});

			render(MessagesTab, { flowId: 'test-flow', isActive: true });

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

			render(MessagesTab, { flowId: 'test-flow', isActive: true });

			await waitFor(() => {
				const errorElement = screen.getByRole('alert');
				expect(errorElement).toBeTruthy();
				expect(errorElement.textContent).toContain('WebSocket connection failed');
			});
		});
	});

	describe('Rendering', () => {
		it('renders empty state when no messages', async () => {
			mockStoreState.set({
				...createDefaultState(),
				connected: true,
				logs: [] // No message-logger logs
			});

			render(MessagesTab, { flowId: 'flow-123', isActive: true });

			await waitFor(() => {
				expect(screen.getByText(/no messages/i)).toBeTruthy();
			});
		});

		it('renders messages list with all fields', async () => {
			mockStoreState.set({
				...createDefaultState(),
				connected: true,
				logs: sampleMessageLogs
			});

			render(MessagesTab, { flowId: 'flow-123', isActive: true });

			await waitFor(() => {
				const subjects = screen.getAllByText('sensors.camera.frame');
				expect(subjects.length).toBeGreaterThan(0);
				expect(screen.getByText('[camera-sensor]')).toBeTruthy();
				expect(screen.getByText('Published camera frame data')).toBeTruthy();
			});
		});

		it('shows direction indicators with correct symbols', async () => {
			mockStoreState.set({
				...createDefaultState(),
				connected: true,
				logs: sampleMessageLogs
			});

			const { container } = render(MessagesTab, { flowId: 'flow-123', isActive: true });

			await waitFor(() => {
				const indicators = container.querySelectorAll('.direction');
				expect(indicators.length).toBeGreaterThan(0);
			});
		});

		it('displays NATS subjects in monospace font class', async () => {
			mockStoreState.set({
				...createDefaultState(),
				connected: true,
				logs: sampleMessageLogs
			});

			const { container } = render(MessagesTab, { flowId: 'flow-123', isActive: true });

			await waitFor(() => {
				const subjectElements = container.querySelectorAll('.subject');
				expect(subjectElements.length).toBeGreaterThan(0);
				const firstSubject = subjectElements[0] as HTMLElement;
				expect(firstSubject.className).toContain('subject');
			});
		});

		it('formats timestamps with millisecond precision', async () => {
			mockStoreState.set({
				...createDefaultState(),
				connected: true,
				logs: sampleMessageLogs
			});

			const { container } = render(MessagesTab, { flowId: 'flow-123', isActive: true });

			await waitFor(() => {
				const timestamps = container.querySelectorAll('.timestamp');
				expect(timestamps.length).toBeGreaterThan(0);
				const firstTimestamp = timestamps[0] as HTMLElement;
				// Should match HH:MM:SS.mmm format
				expect(firstTimestamp.textContent).toMatch(/\d{2}:\d{2}:\d{2}\.\d{3}/);
			});
		});

		it('only shows logs from message-logger source', async () => {
			const mixedLogs: LogEntry[] = [
				...sampleMessageLogs,
				{
					id: 'other-log',
					timestamp: Date.now(),
					level: 'INFO',
					source: 'graph-processor', // Not message-logger
					message: 'Processing entity'
				}
			];

			mockStoreState.set({
				...createDefaultState(),
				connected: true,
				logs: mixedLogs
			});

			render(MessagesTab, { flowId: 'flow-123', isActive: true });

			await waitFor(() => {
				const entries = screen.getAllByTestId('message-entry');
				// Should only show the 3 message-logger entries
				expect(entries).toHaveLength(3);
			});
		});
	});

	describe('Filtering', () => {
		it('filters messages by direction', async () => {
			mockStoreState.set({
				...createDefaultState(),
				connected: true,
				logs: sampleMessageLogs
			});

			render(MessagesTab, { flowId: 'flow-123', isActive: true });

			await waitFor(() => {
				expect(screen.getByText('Published camera frame data')).toBeTruthy();
			});

			const directionFilter = screen.getByTestId('direction-filter') as HTMLSelectElement;
			await fireEvent.change(directionFilter, { target: { value: 'published' } });

			await waitFor(() => {
				expect(screen.getByText('Published camera frame data')).toBeTruthy();
				const receivedMessages = screen.queryAllByText('Received camera frame for processing');
				expect(receivedMessages.length).toBe(0);
			});
		});

		it('shows "All" option in direction filter', async () => {
			mockStoreState.set({
				...createDefaultState(),
				connected: true,
				logs: sampleMessageLogs
			});

			render(MessagesTab, { flowId: 'flow-123', isActive: true });

			const directionFilter = screen.getByTestId('direction-filter') as HTMLSelectElement;
			expect(directionFilter.querySelector('option[value="all"]')).toBeTruthy();
		});

		it('updates filtered message count when filter changes', async () => {
			mockStoreState.set({
				...createDefaultState(),
				connected: true,
				logs: sampleMessageLogs
			});

			render(MessagesTab, { flowId: 'flow-123', isActive: true });

			await waitFor(() => {
				expect(screen.getAllByTestId('message-entry').length).toBe(3);
			});

			const directionFilter = screen.getByTestId('direction-filter') as HTMLSelectElement;
			await fireEvent.change(directionFilter, { target: { value: 'published' } });

			await waitFor(() => {
				expect(screen.getAllByTestId('message-entry').length).toBe(1);
			});
		});

		it('shows empty state when filter matches no messages', async () => {
			mockStoreState.set({
				...createDefaultState(),
				connected: true,
				logs: [
					createMessageLog({
						id: 'msg-1',
						fields: { direction: 'published', subject: 'test', component: 'comp' }
					})
				]
			});

			render(MessagesTab, { flowId: 'flow-123', isActive: true });

			const directionFilter = screen.getByTestId('direction-filter') as HTMLSelectElement;
			await fireEvent.change(directionFilter, { target: { value: 'received' } });

			await waitFor(() => {
				expect(screen.getByText(/No messages match current filters/)).toBeTruthy();
			});
		});
	});

	describe('Controls', () => {
		it('auto-scroll toggles correctly', async () => {
			mockStoreState.set({
				...createDefaultState(),
				connected: true,
				logs: sampleMessageLogs
			});

			render(MessagesTab, { flowId: 'flow-123', isActive: true });

			const autoScrollToggle = screen.getByTestId('auto-scroll-toggle') as HTMLInputElement;

			expect(autoScrollToggle.checked).toBe(true);

			await fireEvent.click(autoScrollToggle);
			expect(autoScrollToggle.checked).toBe(false);

			await fireEvent.click(autoScrollToggle);
			expect(autoScrollToggle.checked).toBe(true);
		});

		it('clear messages calls store clearLogs', async () => {
			mockStoreState.set({
				...createDefaultState(),
				connected: true,
				logs: sampleMessageLogs
			});

			render(MessagesTab, { flowId: 'flow-123', isActive: true });

			await waitFor(() => {
				expect(screen.getAllByTestId('message-entry').length).toBe(3);
			});

			const clearButton = screen.getByTestId('clear-messages-button');
			await fireEvent.click(clearButton);

			expect(mockClearLogs).toHaveBeenCalled();
		});

		it('clear messages resets direction filter', async () => {
			mockStoreState.set({
				...createDefaultState(),
				connected: true,
				logs: sampleMessageLogs
			});

			render(MessagesTab, { flowId: 'flow-123', isActive: true });

			const directionFilter = screen.getByTestId('direction-filter') as HTMLSelectElement;
			await fireEvent.change(directionFilter, { target: { value: 'published' } });

			expect(directionFilter.value).toBe('published');

			const clearButton = screen.getByTestId('clear-messages-button');
			await fireEvent.click(clearButton);

			await waitFor(() => {
				expect(directionFilter.value).toBe('all');
			});
		});

		it('metadata expands and collapses', async () => {
			mockStoreState.set({
				...createDefaultState(),
				connected: true,
				logs: sampleMessageLogs
			});

			const { container } = render(MessagesTab, { flowId: 'flow-123', isActive: true });

			await waitFor(() => {
				const subjects = screen.getAllByText('sensors.camera.frame');
				expect(subjects.length).toBeGreaterThan(0);
			});

			// Find first message with metadata
			const expandButtons = container.querySelectorAll('.metadata-toggle');
			const firstExpandButton = expandButtons[0] as HTMLElement;

			// Initially metadata should be hidden
			expect(container.querySelector('.metadata')).toBeNull();

			// Click to expand
			await fireEvent.click(firstExpandButton);

			await waitFor(() => {
				expect(container.querySelector('.metadata')).toBeTruthy();
			});

			// Click to collapse
			await fireEvent.click(firstExpandButton);

			await waitFor(() => {
				expect(container.querySelector('.metadata')).toBeNull();
			});
		});

		it('multiple metadata sections independent', async () => {
			mockStoreState.set({
				...createDefaultState(),
				connected: true,
				logs: sampleMessageLogs
			});

			const { container } = render(MessagesTab, { flowId: 'flow-123', isActive: true });

			await waitFor(() => {
				const subjects = screen.getAllByText('sensors.camera.frame');
				expect(subjects.length).toBeGreaterThan(0);
			});

			const expandButtons = container.querySelectorAll('.metadata-toggle');

			// Expand first message metadata
			await fireEvent.click(expandButtons[0] as HTMLElement);

			await waitFor(() => {
				const metadataSections = container.querySelectorAll('.metadata');
				expect(metadataSections.length).toBe(1);
			});

			// Expand third message metadata (second button with metadata)
			await fireEvent.click(expandButtons[1] as HTMLElement);

			await waitFor(() => {
				const metadataSections = container.querySelectorAll('.metadata');
				expect(metadataSections.length).toBe(2);
			});
		});
	});

	describe('Store Updates', () => {
		it('updates when new messages arrive in store', async () => {
			mockStoreState.set({
				...createDefaultState(),
				connected: true,
				logs: [sampleMessageLogs[0]]
			});

			render(MessagesTab, { flowId: 'flow-123', isActive: true });

			await waitFor(() => {
				expect(screen.getAllByTestId('message-entry')).toHaveLength(1);
			});

			// Add more messages
			mockStoreState.update((state) => ({
				...state,
				logs: [...state.logs, sampleMessageLogs[1], sampleMessageLogs[2]]
			}));

			await waitFor(() => {
				expect(screen.getAllByTestId('message-entry')).toHaveLength(3);
			});
		});

		it('handles empty messages gracefully', async () => {
			mockStoreState.set({
				...createDefaultState(),
				connected: true,
				logs: sampleMessageLogs
			});

			render(MessagesTab, { flowId: 'flow-123', isActive: true });

			await waitFor(() => {
				expect(screen.getAllByTestId('message-entry')).toHaveLength(3);
			});

			// Clear all logs
			mockStoreState.update((state) => ({
				...state,
				logs: []
			}));

			await waitFor(() => {
				expect(screen.queryAllByTestId('message-entry')).toHaveLength(0);
				expect(screen.getByText(/no messages/i)).toBeTruthy();
			});
		});
	});

	describe('Accessibility', () => {
		it('should have proper ARIA labels on controls', async () => {
			mockStoreState.set({
				...createDefaultState(),
				connected: true,
				logs: sampleMessageLogs
			});

			render(MessagesTab, { flowId: 'flow-123', isActive: true });

			const clearButton = screen.getByTestId('clear-messages-button');
			expect(clearButton.getAttribute('aria-label')).toBe('Clear all messages');

			const directionFilter = screen.getByTestId('direction-filter');
			expect(directionFilter.getAttribute('aria-label')).toBe('Filter by direction');
		});

		it('should use aria-live region for message entries', async () => {
			mockStoreState.set({
				...createDefaultState(),
				connected: true,
				logs: sampleMessageLogs
			});

			render(MessagesTab, { flowId: 'flow-123', isActive: true });

			await waitFor(() => {
				const logContainer = screen.getByRole('log');
				expect(logContainer.getAttribute('aria-live')).toBe('polite');
			});
		});

		it('should have aria-expanded on metadata toggles', async () => {
			mockStoreState.set({
				...createDefaultState(),
				connected: true,
				logs: sampleMessageLogs
			});

			const { container } = render(MessagesTab, { flowId: 'flow-123', isActive: true });

			await waitFor(() => {
				const expandButtons = container.querySelectorAll('.metadata-toggle');
				expect(expandButtons.length).toBeGreaterThan(0);

				const firstButton = expandButtons[0] as HTMLElement;
				expect(firstButton.getAttribute('aria-expanded')).toBe('false');
			});
		});
	});
});
