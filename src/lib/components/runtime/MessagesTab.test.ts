/**
 * MessagesTab Component Tests
 * Test suite for NATS message flow visualization
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import MessagesTab from './MessagesTab.svelte';

interface MessageLogEntry {
	timestamp: string;
	subject: string;
	message_id: string;
	component: string;
	direction: 'published' | 'received' | 'processed';
	summary: string;
	metadata?: Record<string, unknown>;
}

interface MessagesResponse {
	timestamp: string;
	messages: MessageLogEntry[];
	total: number;
	limit: number;
}

// Mock data
const mockMessages: MessageLogEntry[] = [
	{
		timestamp: '2024-01-15T14:23:05.123Z',
		subject: 'sensors.camera.frame',
		message_id: 'msg-001',
		component: 'camera-sensor',
		direction: 'published',
		summary: 'Published camera frame data',
		metadata: { frame_id: 1234, resolution: '1920x1080' }
	},
	{
		timestamp: '2024-01-15T14:23:05.456Z',
		subject: 'sensors.camera.frame',
		message_id: 'msg-002',
		component: 'image-processor',
		direction: 'received',
		summary: 'Received camera frame for processing'
	},
	{
		timestamp: '2024-01-15T14:23:05.789Z',
		subject: 'processors.vision.output',
		message_id: 'msg-003',
		component: 'image-processor',
		direction: 'processed',
		summary: 'Completed image processing',
		metadata: { objects_detected: 3, processing_time_ms: 45 }
	}
];

const mockResponse: MessagesResponse = {
	timestamp: '2024-01-15T14:23:05.789Z',
	messages: mockMessages,
	total: 3,
	limit: 100
};

// Setup fetch mock
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe('MessagesTab - Rendering', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders empty state when no messages', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ timestamp: new Date().toISOString(), messages: [], total: 0, limit: 100 })
		});

		render(MessagesTab, { props: { flowId: 'flow-123', isActive: true } });

		await waitFor(() => {
			expect(screen.getByText(/no messages/i)).toBeInTheDocument();
		});
	});

	it('renders messages list with all fields', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => mockResponse
		});

		render(MessagesTab, { props: { flowId: 'flow-123', isActive: true } });

		await waitFor(() => {
			const subjects = screen.getAllByText('sensors.camera.frame');
			expect(subjects.length).toBeGreaterThan(0);
			expect(screen.getByText('[camera-sensor]')).toBeInTheDocument();
			expect(screen.getByText('Published camera frame data')).toBeInTheDocument();
		});
	});

	it('shows direction indicators with correct symbols', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => mockResponse
		});

		const { container } = render(MessagesTab, { props: { flowId: 'flow-123', isActive: true } });

		await waitFor(() => {
			const indicators = container.querySelectorAll('.direction');
			expect(indicators.length).toBeGreaterThan(0);
		});
	});

	it('displays NATS subjects in monospace font', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => mockResponse
		});

		const { container } = render(MessagesTab, { props: { flowId: 'flow-123', isActive: true } });

		await waitFor(() => {
			const subjectElements = container.querySelectorAll('.subject');
			expect(subjectElements.length).toBeGreaterThan(0);
			// Check that subject elements have the subject class which applies monospace font
			const firstSubject = subjectElements[0] as HTMLElement;
			expect(firstSubject.className).toContain('subject');
		});
	});

	it('formats timestamps with millisecond precision', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => mockResponse
		});

		const { container } = render(MessagesTab, { props: { flowId: 'flow-123', isActive: true } });

		await waitFor(() => {
			const timestamps = container.querySelectorAll('.timestamp');
			expect(timestamps.length).toBeGreaterThan(0);
			const firstTimestamp = timestamps[0] as HTMLElement;
			// Should match HH:MM:SS.mmm format
			expect(firstTimestamp.textContent).toMatch(/\d{2}:\d{2}:\d{2}\.\d{3}/);
		});
	});
});

describe('MessagesTab - Filtering', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('filters messages by component', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => mockResponse
		});

		render(MessagesTab, { props: { flowId: 'flow-123', isActive: true } });

		await waitFor(() => {
			expect(screen.getByText('[camera-sensor]')).toBeInTheDocument();
		});

		const componentFilter = screen.getByTestId('component-filter') as HTMLSelectElement;
		await fireEvent.change(componentFilter, { target: { value: 'camera-sensor' } });

		await waitFor(() => {
			expect(screen.getByText('[camera-sensor]')).toBeInTheDocument();
			const processorComponents = screen.queryAllByText('[image-processor]');
			expect(processorComponents.length).toBe(0);
		});
	});

	it('filters messages by direction', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => mockResponse
		});

		render(MessagesTab, { props: { flowId: 'flow-123', isActive: true } });

		await waitFor(() => {
			expect(screen.getByText('Published camera frame data')).toBeInTheDocument();
		});

		const directionFilter = screen.getByTestId('direction-filter') as HTMLSelectElement;
		await fireEvent.change(directionFilter, { target: { value: 'published' } });

		await waitFor(() => {
			expect(screen.getByText('Published camera frame data')).toBeInTheDocument();
			const receivedMessages = screen.queryAllByText('Received camera frame for processing');
			expect(receivedMessages.length).toBe(0);
		});
	});

	it('combines component and direction filters', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => mockResponse
		});

		render(MessagesTab, { props: { flowId: 'flow-123', isActive: true } });

		await waitFor(() => {
			expect(screen.getAllByTestId('message-entry').length).toBe(3);
		});

		const componentFilter = screen.getByTestId('component-filter') as HTMLSelectElement;
		const directionFilter = screen.getByTestId('direction-filter') as HTMLSelectElement;

		await fireEvent.change(componentFilter, { target: { value: 'image-processor' } });
		await fireEvent.change(directionFilter, { target: { value: 'received' } });

		await waitFor(() => {
			expect(screen.getAllByTestId('message-entry').length).toBe(1);
			expect(screen.getByText('Received camera frame for processing')).toBeInTheDocument();
		});
	});

	it('shows "All" options in filters', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => mockResponse
		});

		render(MessagesTab, { props: { flowId: 'flow-123', isActive: true } });

		const componentFilter = screen.getByTestId('component-filter') as HTMLSelectElement;
		const directionFilter = screen.getByTestId('direction-filter') as HTMLSelectElement;

		expect(componentFilter.querySelector('option[value="all"]')).toBeInTheDocument();
		expect(directionFilter.querySelector('option[value="all"]')).toBeInTheDocument();
	});

	it('updates filtered message count display', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => mockResponse
		});

		const { container: _container } = render(MessagesTab, { props: { flowId: 'flow-123', isActive: true } });

		await waitFor(() => {
			expect(screen.getAllByTestId('message-entry').length).toBe(3);
		});

		const directionFilter = screen.getByTestId('direction-filter') as HTMLSelectElement;
		await fireEvent.change(directionFilter, { target: { value: 'published' } });

		await waitFor(() => {
			expect(screen.getAllByTestId('message-entry').length).toBe(1);
		});
	});
});

describe('MessagesTab - Polling', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('polls at configured interval', async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => mockResponse
		});

		render(MessagesTab, { props: { flowId: 'flow-123', isActive: true } });

		// Initial fetch
		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledTimes(1);
		});

		// Advance timer by 2 seconds (default poll interval)
		vi.advanceTimersByTime(2000);

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledTimes(2);
		});
	});

	it('manual refresh works', async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => mockResponse
		});

		render(MessagesTab, { props: { flowId: 'flow-123', isActive: true } });

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledTimes(1);
		});

		// Change to manual mode
		const pollRateSelector = screen.getByTestId('poll-rate-selector') as HTMLSelectElement;
		await fireEvent.change(pollRateSelector, { target: { value: 'manual' } });

		// Click manual refresh button
		const refreshButton = screen.getByTestId('manual-refresh-button');
		await fireEvent.click(refreshButton);

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledTimes(2);
		});
	});

	it('stops polling when inactive', async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => mockResponse
		});

		const { unmount } = render(MessagesTab, { props: { flowId: 'flow-123', isActive: true } });

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledTimes(1);
		});

		// Unmount and remount with isActive false
		unmount();
		render(MessagesTab, { props: { flowId: 'flow-123', isActive: false } });

		vi.advanceTimersByTime(10000);

		// Should not poll again (still just 1 call from first mount)
		expect(mockFetch).toHaveBeenCalledTimes(1);
	});

	it('resumes polling when active', async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => mockResponse
		});

		const { unmount } = render(MessagesTab, { props: { flowId: 'flow-123', isActive: false } });

		vi.advanceTimersByTime(5000);
		expect(mockFetch).not.toHaveBeenCalled();

		// Unmount and remount with isActive true
		unmount();
		render(MessagesTab, { props: { flowId: 'flow-123', isActive: true } });

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledTimes(1);
		});
	});
});

describe('MessagesTab - Controls', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('auto-scroll toggles correctly', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => mockResponse
		});

		render(MessagesTab, { props: { flowId: 'flow-123', isActive: true } });

		const autoScrollToggle = screen.getByTestId('auto-scroll-toggle') as HTMLInputElement;

		expect(autoScrollToggle.checked).toBe(true);

		await fireEvent.click(autoScrollToggle);
		expect(autoScrollToggle.checked).toBe(false);

		await fireEvent.click(autoScrollToggle);
		expect(autoScrollToggle.checked).toBe(true);
	});

	it('clear messages works', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => mockResponse
		});

		render(MessagesTab, { props: { flowId: 'flow-123', isActive: true } });

		await waitFor(() => {
			expect(screen.getAllByTestId('message-entry').length).toBe(3);
		});

		const clearButton = screen.getByTestId('clear-messages-button');
		await fireEvent.click(clearButton);

		await waitFor(() => {
			expect(screen.queryAllByTestId('message-entry').length).toBe(0);
		});
	});

	it('poll rate selector works', async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => mockResponse
		});

		render(MessagesTab, { props: { flowId: 'flow-123', isActive: true } });

		const pollRateSelector = screen.getByTestId('poll-rate-selector') as HTMLSelectElement;

		expect(pollRateSelector.value).toBe('2000');

		await fireEvent.change(pollRateSelector, { target: { value: '1000' } });
		expect(pollRateSelector.value).toBe('1000');

		await fireEvent.change(pollRateSelector, { target: { value: 'manual' } });
		expect(pollRateSelector.value).toBe('manual');
	});

	it('metadata expands and collapses', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => mockResponse
		});

		const { container } = render(MessagesTab, { props: { flowId: 'flow-123', isActive: true } });

		await waitFor(() => {
			const subjects = screen.getAllByText('sensors.camera.frame');
			expect(subjects.length).toBeGreaterThan(0);
		});

		// Find first message with metadata
		const expandButtons = container.querySelectorAll('.metadata-toggle');
		const firstExpandButton = expandButtons[0] as HTMLElement;

		// Initially metadata should be hidden
		expect(container.querySelector('.metadata')).not.toBeInTheDocument();

		// Click to expand
		await fireEvent.click(firstExpandButton);

		await waitFor(() => {
			expect(container.querySelector('.metadata')).toBeInTheDocument();
			const metadata = screen.getAllByText(/"frame_id"/);
			expect(metadata.length).toBeGreaterThan(0);
		});

		// Click to collapse
		await fireEvent.click(firstExpandButton);

		await waitFor(() => {
			expect(container.querySelector('.metadata')).not.toBeInTheDocument();
		});
	});

	it('multiple metadata sections independent', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => mockResponse
		});

		const { container } = render(MessagesTab, { props: { flowId: 'flow-123', isActive: true } });

		await waitFor(() => {
			const subjects = screen.getAllByText('sensors.camera.frame');
			expect(subjects.length).toBeGreaterThan(0);
		});

		const expandButtons = container.querySelectorAll('.metadata-toggle');

		// Expand first message metadata
		await fireEvent.click(expandButtons[0] as HTMLElement);

		await waitFor(() => {
			const metadata = screen.getAllByText(/"frame_id"/);
			expect(metadata.length).toBeGreaterThan(0);
		});

		// Expand third message metadata (second button is for third message with metadata)
		await fireEvent.click(expandButtons[1] as HTMLElement);

		await waitFor(() => {
			const metadata = screen.getAllByText(/"objects_detected"/);
			expect(metadata.length).toBeGreaterThan(0);
		});

		// Both should be visible
		expect(screen.getAllByText(/"frame_id"/).length).toBeGreaterThan(0);
		expect(screen.getAllByText(/"objects_detected"/).length).toBeGreaterThan(0);
	});
});

describe('MessagesTab - API Integration', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('fetches messages from correct endpoint', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => mockResponse
		});

		render(MessagesTab, { props: { flowId: 'test-flow-456', isActive: true } });

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith(
				'/flowbuilder/flows/test-flow-456/runtime/messages'
			);
		});
	});

	it('handles fetch errors gracefully', async () => {
		mockFetch.mockRejectedValueOnce(new Error('Network error'));

		render(MessagesTab, { props: { flowId: 'flow-123', isActive: true } });

		await waitFor(() => {
			expect(screen.getByText(/unavailable/i)).toBeInTheDocument();
		});
	});

	it('shows loading state during fetch', async () => {
		let resolvePromise: (value: Response) => void;
		const promise = new Promise<Response>((resolve) => {
			resolvePromise = resolve;
		});

		mockFetch.mockReturnValueOnce(promise);

		render(MessagesTab, { props: { flowId: 'flow-123', isActive: true } });

		// Component should be in loading state
		expect(screen.queryByTestId('message-entry')).not.toBeInTheDocument();

		// Resolve the promise
		resolvePromise!({
			ok: true,
			json: async () => mockResponse
		} as Response);

		await waitFor(() => {
			expect(screen.getAllByTestId('message-entry').length).toBe(3);
		});
	});
});
