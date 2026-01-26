/**
 * Panel Layout Store
 *
 * Manages the VS Code-style three-panel layout state with:
 * - Panel visibility (open/collapsed)
 * - Panel widths (resizable)
 * - Responsive auto-collapse based on viewport
 * - LocalStorage persistence
 *
 * Usage:
 * ```typescript
 * import { createPanelLayoutStore } from '$lib/stores/panelLayoutStore.svelte';
 *
 * const layout = createPanelLayoutStore();
 *
 * // Toggle panels
 * layout.toggleLeft();
 * layout.toggleRight();
 *
 * // Resize panels
 * layout.setLeftWidth(300);
 * layout.setRightWidth(350);
 *
 * // Handle viewport resize
 * layout.handleViewportResize(window.innerWidth);
 * ```
 */

import * as store from 'svelte/store';
import {
	type PanelLayoutState,
	type ExplorerTab,
	type ViewMode,
	DEFAULT_PANEL_LAYOUT,
	PANEL_BREAKPOINTS
} from '$lib/types/ui-state';

const STORAGE_KEY = 'semstreams-panel-layout';

/**
 * Panel layout store interface - uses Svelte writable store for module-level reactivity
 */
export interface PanelLayoutStore extends store.Readable<PanelLayoutState> {

	/** Toggle left panel visibility */
	toggleLeft: () => void;

	/** Toggle right panel visibility */
	toggleRight: () => void;

	/** Toggle both panels (focus mode) */
	toggleBoth: () => void;

	/** Set left panel width */
	setLeftWidth: (width: number) => void;

	/** Set right panel width */
	setRightWidth: (width: number) => void;

	/** Set explorer tab */
	setExplorerTab: (tab: ExplorerTab) => void;

	/** Handle viewport resize for responsive behavior */
	handleViewportResize: (viewportWidth: number) => void;

	/** Toggle monitor mode (full-screen runtime panel) */
	toggleMonitorMode: () => void;

	/** Set monitor mode explicitly */
	setMonitorMode: (enabled: boolean) => void;

	/** Set view mode (flow editor or data view) */
	setViewMode: (mode: ViewMode) => void;

	/** Reset to defaults */
	reset: () => void;

	/** Save current state to localStorage */
	save: () => void;

	/** Load state from localStorage */
	load: () => void;
}

/**
 * Load layout state from localStorage with fallback to defaults
 */
function loadFromStorage(): PanelLayoutState {
	if (typeof window === 'undefined') {
		return { ...DEFAULT_PANEL_LAYOUT };
	}

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored) as Partial<PanelLayoutState>;
			// Merge with defaults to handle missing fields from older versions
			return { ...DEFAULT_PANEL_LAYOUT, ...parsed };
		}
	} catch (e) {
		console.warn('Failed to load panel layout from localStorage:', e);
	}

	return { ...DEFAULT_PANEL_LAYOUT };
}

/**
 * Save layout state to localStorage
 */
function saveToStorage(state: PanelLayoutState): void {
	if (typeof window === 'undefined') return;

	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	} catch (e) {
		console.warn('Failed to save panel layout to localStorage:', e);
	}
}

/**
 * Clamp a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

/**
 * Create panel layout store
 *
 * Uses Svelte writable store for proper module-level reactivity.
 *
 * @returns Panel layout store instance
 */
export function createPanelLayoutStore(): PanelLayoutStore {
	// Initialize state from localStorage or defaults
	const initialState = loadFromStorage();
	const { subscribe, update, set } = store.writable<PanelLayoutState>(initialState);

	// Track the stored state before auto-collapse for restoration
	let storedLeftOpen = initialState.leftPanelOpen;
	let storedRightOpen = initialState.rightPanelOpen;

	// Helper to save state (strips auto-collapse flags)
	const saveState = (state: PanelLayoutState) => {
		const toSave: PanelLayoutState = {
			...state,
			autoCollapsedLeft: false,
			autoCollapsedRight: false
		};
		saveToStorage(toSave);
	};

	return {
		subscribe,

		toggleLeft() {
			update((state) => {
				const newState = {
					...state,
					leftPanelOpen: !state.leftPanelOpen,
					autoCollapsedLeft: false
				};
				storedLeftOpen = newState.leftPanelOpen;
				saveState(newState);
				return newState;
			});
		},

		toggleRight() {
			update((state) => {
				const newState = {
					...state,
					rightPanelOpen: !state.rightPanelOpen,
					autoCollapsedRight: false
				};
				storedRightOpen = newState.rightPanelOpen;
				saveState(newState);
				return newState;
			});
		},

		toggleBoth() {
			update((state) => {
				const bothOpen = state.leftPanelOpen && state.rightPanelOpen;
				const newState = {
					...state,
					leftPanelOpen: !bothOpen,
					rightPanelOpen: !bothOpen,
					autoCollapsedLeft: false,
					autoCollapsedRight: false
				};
				storedLeftOpen = newState.leftPanelOpen;
				storedRightOpen = newState.rightPanelOpen;
				saveState(newState);
				return newState;
			});
		},

		setLeftWidth(width: number) {
			update((state) => {
				const newState = {
					...state,
					leftPanelWidth: clamp(width, 200, 400)
				};
				saveState(newState);
				return newState;
			});
		},

		setRightWidth(width: number) {
			update((state) => {
				const newState = {
					...state,
					rightPanelWidth: clamp(width, 240, 480)
				};
				saveState(newState);
				return newState;
			});
		},

		setExplorerTab(tab: ExplorerTab) {
			update((state) => ({
				...state,
				explorerTab: tab
			}));
			// Don't save tab state - it's transient
		},

		handleViewportResize(viewportWidth: number) {
			update((state) => {
				const newState = { ...state };

				if (viewportWidth >= PANEL_BREAKPOINTS.FULL) {
					// Full layout - restore panels if they were auto-collapsed
					if (state.autoCollapsedLeft && storedLeftOpen) {
						newState.leftPanelOpen = true;
						newState.autoCollapsedLeft = false;
					}
					if (state.autoCollapsedRight && storedRightOpen) {
						newState.rightPanelOpen = true;
						newState.autoCollapsedRight = false;
					}
				} else if (viewportWidth >= PANEL_BREAKPOINTS.MEDIUM) {
					// Medium - auto-collapse right only
					if (state.rightPanelOpen && !state.autoCollapsedRight) {
						newState.rightPanelOpen = false;
						newState.autoCollapsedRight = true;
					}
					// Restore left if it was auto-collapsed
					if (state.autoCollapsedLeft && storedLeftOpen) {
						newState.leftPanelOpen = true;
						newState.autoCollapsedLeft = false;
					}
				} else if (viewportWidth >= PANEL_BREAKPOINTS.SMALL) {
					// Small - auto-collapse both
					if (state.leftPanelOpen && !state.autoCollapsedLeft) {
						newState.leftPanelOpen = false;
						newState.autoCollapsedLeft = true;
					}
					if (state.rightPanelOpen && !state.autoCollapsedRight) {
						newState.rightPanelOpen = false;
						newState.autoCollapsedRight = true;
					}
				} else {
					// Very small - force both collapsed
					if (state.leftPanelOpen) {
						newState.leftPanelOpen = false;
						newState.autoCollapsedLeft = true;
					}
					if (state.rightPanelOpen) {
						newState.rightPanelOpen = false;
						newState.autoCollapsedRight = true;
					}
				}

				// Note: We don't save auto-collapse state to localStorage
				return newState;
			});
		},

		toggleMonitorMode() {
			update((state) => {
				const newState = {
					...state,
					monitorMode: !state.monitorMode
				};
				saveState(newState);
				return newState;
			});
		},

		setMonitorMode(enabled: boolean) {
			update((state) => {
				const newState = {
					...state,
					monitorMode: enabled
				};
				saveState(newState);
				return newState;
			});
		},

		setViewMode(mode: ViewMode) {
			update((state) => {
				const newState = {
					...state,
					viewMode: mode
				};
				// Don't persist viewMode - it should reset to 'flow' on page reload
				return newState;
			});
		},

		reset() {
			const newState = { ...DEFAULT_PANEL_LAYOUT };
			storedLeftOpen = newState.leftPanelOpen;
			storedRightOpen = newState.rightPanelOpen;
			saveState(newState);
			set(newState);
		},

		save() {
			// Not needed externally - save happens in each mutation
			// Kept for interface compatibility
		},

		load() {
			const newState = loadFromStorage();
			storedLeftOpen = newState.leftPanelOpen;
			storedRightOpen = newState.rightPanelOpen;
			set(newState);
		}
	};
}

/**
 * Default singleton panel layout store instance
 */
export const panelLayout = createPanelLayoutStore();
