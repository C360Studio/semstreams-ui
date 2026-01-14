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

import {
	type PanelLayoutState,
	type ExplorerTab,
	DEFAULT_PANEL_LAYOUT,
	PANEL_BREAKPOINTS
} from '$lib/types/ui-state';

const STORAGE_KEY = 'semstreams-panel-layout';

/**
 * Panel layout store interface
 */
export interface PanelLayoutStore {
	/** Current layout state */
	readonly state: PanelLayoutState;

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
 * @returns Panel layout store instance
 */
export function createPanelLayoutStore(): PanelLayoutStore {
	// Initialize state from localStorage or defaults
	let currentState: PanelLayoutState = loadFromStorage();

	// Track the stored state before auto-collapse for restoration
	let storedLeftOpen = currentState.leftPanelOpen;
	let storedRightOpen = currentState.rightPanelOpen;

	return {
		get state() {
			return currentState;
		},

		/**
		 * Toggle left panel visibility
		 * If user manually toggles, clear auto-collapse flag
		 */
		toggleLeft() {
			currentState = {
				...currentState,
				leftPanelOpen: !currentState.leftPanelOpen,
				autoCollapsedLeft: false
			};
			storedLeftOpen = currentState.leftPanelOpen;
			this.save();
		},

		/**
		 * Toggle right panel visibility
		 * If user manually toggles, clear auto-collapse flag
		 */
		toggleRight() {
			currentState = {
				...currentState,
				rightPanelOpen: !currentState.rightPanelOpen,
				autoCollapsedRight: false
			};
			storedRightOpen = currentState.rightPanelOpen;
			this.save();
		},

		/**
		 * Toggle both panels (focus mode)
		 */
		toggleBoth() {
			const bothOpen = currentState.leftPanelOpen && currentState.rightPanelOpen;
			currentState = {
				...currentState,
				leftPanelOpen: !bothOpen,
				rightPanelOpen: !bothOpen,
				autoCollapsedLeft: false,
				autoCollapsedRight: false
			};
			storedLeftOpen = currentState.leftPanelOpen;
			storedRightOpen = currentState.rightPanelOpen;
			this.save();
		},

		/**
		 * Set left panel width with constraints
		 */
		setLeftWidth(width: number) {
			const clampedWidth = clamp(width, 200, 400); // min/max from CSS vars
			currentState = {
				...currentState,
				leftPanelWidth: clampedWidth
			};
			this.save();
		},

		/**
		 * Set right panel width with constraints
		 */
		setRightWidth(width: number) {
			const clampedWidth = clamp(width, 240, 480); // min/max from CSS vars
			currentState = {
				...currentState,
				rightPanelWidth: clampedWidth
			};
			this.save();
		},

		/**
		 * Set the active explorer tab
		 */
		setExplorerTab(tab: ExplorerTab) {
			currentState = {
				...currentState,
				explorerTab: tab
			};
			// Don't save tab state - it's transient
		},

		/**
		 * Handle viewport resize for responsive auto-collapse
		 *
		 * Breakpoints:
		 * - >= 1200px: Full three-panel layout
		 * - 900-1199px: Right panel auto-collapses
		 * - 600-899px: Both panels auto-collapse
		 * - < 600px: Both panels hidden
		 *
		 * Auto-collapse is restored when viewport grows, unless user manually collapsed
		 */
		handleViewportResize(viewportWidth: number) {
			let newState = { ...currentState };

			if (viewportWidth >= PANEL_BREAKPOINTS.FULL) {
				// Full layout - restore panels if they were auto-collapsed
				if (currentState.autoCollapsedLeft && storedLeftOpen) {
					newState.leftPanelOpen = true;
					newState.autoCollapsedLeft = false;
				}
				if (currentState.autoCollapsedRight && storedRightOpen) {
					newState.rightPanelOpen = true;
					newState.autoCollapsedRight = false;
				}
			} else if (viewportWidth >= PANEL_BREAKPOINTS.MEDIUM) {
				// Medium - auto-collapse right only
				if (currentState.rightPanelOpen && !currentState.autoCollapsedRight) {
					newState.rightPanelOpen = false;
					newState.autoCollapsedRight = true;
				}
				// Restore left if it was auto-collapsed
				if (currentState.autoCollapsedLeft && storedLeftOpen) {
					newState.leftPanelOpen = true;
					newState.autoCollapsedLeft = false;
				}
			} else if (viewportWidth >= PANEL_BREAKPOINTS.SMALL) {
				// Small - auto-collapse both
				if (currentState.leftPanelOpen && !currentState.autoCollapsedLeft) {
					newState.leftPanelOpen = false;
					newState.autoCollapsedLeft = true;
				}
				if (currentState.rightPanelOpen && !currentState.autoCollapsedRight) {
					newState.rightPanelOpen = false;
					newState.autoCollapsedRight = true;
				}
			} else {
				// Very small - force both collapsed
				if (currentState.leftPanelOpen) {
					newState.leftPanelOpen = false;
					newState.autoCollapsedLeft = true;
				}
				if (currentState.rightPanelOpen) {
					newState.rightPanelOpen = false;
					newState.autoCollapsedRight = true;
				}
			}

			currentState = newState;
			// Note: We don't save auto-collapse state to localStorage
		},

		/**
		 * Reset to default layout
		 */
		reset() {
			currentState = { ...DEFAULT_PANEL_LAYOUT };
			storedLeftOpen = currentState.leftPanelOpen;
			storedRightOpen = currentState.rightPanelOpen;
			this.save();
		},

		/**
		 * Save current state to localStorage
		 */
		save() {
			// Don't save auto-collapse flags - they're viewport-dependent
			const toSave: PanelLayoutState = {
				...currentState,
				autoCollapsedLeft: false,
				autoCollapsedRight: false
			};
			saveToStorage(toSave);
		},

		/**
		 * Load state from localStorage
		 */
		load() {
			currentState = loadFromStorage();
			storedLeftOpen = currentState.leftPanelOpen;
			storedRightOpen = currentState.rightPanelOpen;
		}
	};
}

/**
 * Default singleton panel layout store instance
 */
export const panelLayout = createPanelLayoutStore();
