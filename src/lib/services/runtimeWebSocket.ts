// WebSocket service for runtime status streaming
// Connects to /flowbuilder/status/stream and routes messages to runtimeStore

import { runtimeStore, type LogLevel } from '$lib/stores/runtimeStore.svelte';

// ============================================================================
// Types
// ============================================================================

export type MessageType = 'flow_status' | 'component_health' | 'component_metrics' | 'log_entry';

interface WebSocketMessage {
	type: MessageType;
	id: string;
	timestamp: number; // Unix ms
	flow_id: string;
	payload: unknown;
}

interface SubscribeCommand {
	command: 'subscribe';
	payload: {
		message_types?: MessageType[];
		log_level?: LogLevel;
		sources?: string[];
	};
}

export interface SubscribeOptions {
	messageTypes?: MessageType[];
	logLevel?: LogLevel;
	sources?: string[];
}

// ============================================================================
// WebSocket Service
// ============================================================================

class RuntimeWebSocketService {
	private ws: WebSocket | null = null;
	private flowId: string = '';
	private reconnectAttempts = 0;
	private maxReconnectAttempts = 5;
	private reconnectDelay = 1000; // Start with 1s, exponential backoff
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	private intentionalClose = false;

	/**
	 * Connect to the WebSocket endpoint for a specific flow
	 */
	connect(flowId: string): void {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			// Already connected - check if same flow
			if (this.flowId === flowId) {
				console.log('[RuntimeWS] Already connected to flow:', flowId);
				return;
			}
			// Different flow - disconnect first
			this.disconnect();
		}

		this.flowId = flowId;
		this.intentionalClose = false;
		this.reconnectAttempts = 0;

		this.doConnect();
	}

	private doConnect(): void {
		// Determine WebSocket URL
		const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
		const host = window.location.host;
		const url = `${protocol}//${host}/flowbuilder/status/stream?flowId=${this.flowId}`;

		console.log('[RuntimeWS] Connecting to:', url);
		runtimeStore.setConnected(false, this.flowId);

		try {
			this.ws = new WebSocket(url);

			this.ws.onopen = () => {
				console.log('[RuntimeWS] Connected');
				this.reconnectAttempts = 0;
				this.reconnectDelay = 1000;
				runtimeStore.setConnected(true, this.flowId);
			};

			this.ws.onmessage = (event) => {
				this.handleMessage(event.data);
			};

			this.ws.onerror = (error) => {
				console.error('[RuntimeWS] Error:', error);
				runtimeStore.setError('WebSocket connection error');
			};

			this.ws.onclose = (event) => {
				console.log('[RuntimeWS] Closed:', event.code, event.reason);
				runtimeStore.setConnected(false);

				// Attempt reconnection if not intentionally closed
				if (!this.intentionalClose && this.reconnectAttempts < this.maxReconnectAttempts) {
					this.scheduleReconnect();
				} else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
					runtimeStore.setError('Connection lost. Max reconnect attempts reached.');
				}
			};
		} catch (error) {
			console.error('[RuntimeWS] Failed to create WebSocket:', error);
			runtimeStore.setError('Failed to establish WebSocket connection');
		}
	}

	private scheduleReconnect(): void {
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
		}

		this.reconnectAttempts++;
		const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);

		console.log(`[RuntimeWS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

		this.reconnectTimer = setTimeout(() => {
			this.doConnect();
		}, delay);
	}

	/**
	 * Disconnect from the WebSocket
	 */
	disconnect(): void {
		console.log('[RuntimeWS] Disconnecting');
		this.intentionalClose = true;

		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}

		if (this.ws) {
			this.ws.close(1000, 'Client disconnect');
			this.ws = null;
		}

		this.flowId = '';
		runtimeStore.setConnected(false);
	}

	/**
	 * Send subscribe command to filter messages
	 */
	subscribe(options: SubscribeOptions): void {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			console.warn('[RuntimeWS] Cannot subscribe - not connected');
			return;
		}

		const command: SubscribeCommand = {
			command: 'subscribe',
			payload: {
				message_types: options.messageTypes,
				log_level: options.logLevel,
				sources: options.sources
			}
		};

		console.log('[RuntimeWS] Sending subscribe:', command);
		this.ws.send(JSON.stringify(command));
	}

	/**
	 * Check if currently connected
	 */
	isConnected(): boolean {
		return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
	}

	/**
	 * Get the current flow ID
	 */
	getFlowId(): string {
		return this.flowId;
	}

	// ========================================================================
	// Message Handling
	// ========================================================================

	private handleMessage(data: string): void {
		try {
			const message = JSON.parse(data) as WebSocketMessage;

			// Validate message structure
			if (!message.type || !message.id || !message.timestamp) {
				console.warn('[RuntimeWS] Invalid message format:', message);
				return;
			}

			// Route to appropriate handler
			switch (message.type) {
				case 'flow_status':
					this.handleFlowStatus(message);
					break;

				case 'component_health':
					this.handleComponentHealth(message);
					break;

				case 'component_metrics':
					this.handleComponentMetrics(message);
					break;

				case 'log_entry':
					this.handleLogEntry(message);
					break;

				default:
					console.warn('[RuntimeWS] Unknown message type:', message.type);
			}
		} catch (error) {
			console.error('[RuntimeWS] Failed to parse message:', error, data);
		}
	}

	private handleFlowStatus(message: WebSocketMessage): void {
		const payload = message.payload as {
			state: string;
			prev_state?: string;
			deployed_at?: number;
			started_at?: number;
			error?: string;
		};

		runtimeStore.updateFlowStatus({
			state: payload.state as 'running' | 'stopped' | 'error' | 'deploying' | 'not_deployed',
			prev_state: payload.prev_state as 'running' | 'stopped' | 'error' | 'deploying' | 'not_deployed' | undefined,
			deployed_at: payload.deployed_at,
			started_at: payload.started_at,
			error: payload.error
		});
	}

	private handleComponentHealth(message: WebSocketMessage): void {
		const payload = message.payload as {
			overall: {
				status: string;
				counts: { healthy: number; degraded: number; error: number };
			};
			components: Array<{
				name: string;
				component: string;
				type: string;
				status: string;
				healthy: boolean;
				message: string | null;
			}>;
		};

		runtimeStore.updateHealth({
			overall: {
				status: payload.overall.status as 'healthy' | 'degraded' | 'error',
				counts: payload.overall.counts
			},
			components: payload.components.map((c) => ({
				...c,
				status: c.status as 'healthy' | 'degraded' | 'error'
			}))
		});
	}

	private handleComponentMetrics(message: WebSocketMessage): void {
		const payload = message.payload as {
			component: string;
			name: string;
			type: string;
			value: number;
			labels: Record<string, string>;
		};

		runtimeStore.updateMetrics(payload, message.timestamp);
	}

	private handleLogEntry(message: WebSocketMessage): void {
		const payload = message.payload as {
			level: string;
			source: string;
			message: string;
			fields?: Record<string, unknown>;
		};

		runtimeStore.addLog(
			{
				level: payload.level as LogLevel,
				source: payload.source,
				message: payload.message,
				fields: payload.fields
			},
			message.id,
			message.timestamp
		);
	}
}

// Export singleton instance
export const runtimeWS = new RuntimeWebSocketService();
