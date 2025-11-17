// Status monitoring store using Svelte 5 runes
// Tracks runtime state from WebSocket updates

import type { RuntimeState } from '$lib/types/flow';

interface StatusMessage {
  type: 'flow_status' | 'component_health' | 'connection_metrics';
  flowId: string;
  timestamp: string;
  payload: unknown;
}

function createStatusStore() {
  let state = $state({
    runtimeState: 'not_deployed' as RuntimeState
  });

  return {
    // Reactive getter
    get runtimeState() {
      return state.runtimeState;
    },

    // Update from WebSocket message
    updateFromWebSocket(message: StatusMessage) {
      if (message.type === 'flow_status') {
        const payload = message.payload as { state: RuntimeState };
        state.runtimeState = payload.state;
      }
    },

    // Direct state update
    setRuntimeState(newState: RuntimeState) {
      state.runtimeState = newState;
    },

    // Reset to initial state
    reset() {
      state.runtimeState = 'not_deployed';
    }
  };
}

export const statusStore = createStatusStore();
