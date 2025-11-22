// Status monitoring store using Svelte 5 stores
// Tracks runtime state from WebSocket updates

import * as store from 'svelte/store';
import type { RuntimeState } from '$lib/types/flow';

interface StatusMessage {
  type: 'flow_status' | 'component_health' | 'connection_metrics';
  flowId: string;
  timestamp: string;
  payload: unknown;
}

interface StatusState {
  runtimeState: RuntimeState;
}

function createStatusStore() {
  const { subscribe, update, set } = store.writable<StatusState>({
    runtimeState: 'not_deployed'
  });

  return {
    subscribe,

    // Reactive getter for compatibility
    get runtimeState() {
      return store.get({ subscribe }).runtimeState;
    },

    // Update from WebSocket message
    updateFromWebSocket(message: StatusMessage) {
      if (message.type === 'flow_status') {
        const payload = message.payload as { state: RuntimeState };
        update((state) => ({
          ...state,
          runtimeState: payload.state
        }));
      }
    },

    // Direct state update
    setRuntimeState(newState: RuntimeState) {
      update((state) => ({
        ...state,
        runtimeState: newState
      }));
    },

    // Reset to initial state
    reset() {
      set({
        runtimeState: 'not_deployed'
      });
    }
  };
}

export const statusStore = createStatusStore();
