// UI State Types for Visual Flow Builder
// Feature: spec 005-we-just-completed

import type { ValidationResult } from './port';

/**
 * Save status for flow persistence
 * - clean: No unsaved changes, flow is valid
 * - dirty: Local changes not yet persisted to backend
 * - draft: Saved with validation errors (allows work-in-progress)
 * - saving: Save operation in progress
 * - error: Save operation failed
 */
export type SaveStatus = 'clean' | 'dirty' | 'draft' | 'saving' | 'error';

/**
 * Save state tracking
 */
export interface SaveState {
	/** Current save status */
	status: SaveStatus;

	/** Timestamp of last successful save to server */
	lastSaved: Date | null;

	/** Error message if save failed */
	error: string | null;

	/** Validation result from last save (if any) */
	validationResult?: ValidationResult | null;
}

/**
 * Runtime state for flow execution
 * Matches backend RuntimeState from pkg/flowstore/flow.go
 * - not_deployed: Flow not deployed (initial state)
 * - deployed_stopped: Flow deployed but not running
 * - running: Flow actively processing data
 * - error: Runtime failure (component crash, validation error)
 */
export type RuntimeState = 'not_deployed' | 'deployed_stopped' | 'running' | 'error';

/**
 * Runtime state information
 */
export interface RuntimeStateInfo {
	/** Current runtime state */
	state: RuntimeState;

	/** Error message if state === 'error' */
	message: string | null;

	/** When state last changed */
	lastTransition: Date | null;
}

/**
 * Navigation guard state for preventing navigation with unsaved changes
 * Used by NavigationGuard component to manage user choices
 */
export interface NavigationGuardState {
	/** Has unsaved changes */
	isDirty: boolean;

	/** Currently blocking navigation (dialog shown) */
	isBlocking: boolean;

	/** Destination URL if navigation was blocked */
	pendingNavigation: string | null;

	/** User's choice from the dialog */
	userChoice: 'save' | 'discard' | 'cancel' | null;
}

/**
 * User preferences for flow editor
 * Currently placeholder for future theme support
 */
export interface UserPreferences {
	// TODO: Add when implementing light/dark mode
	// theme: 'light' | 'dark' | 'auto'
}

/**
 * Default user preferences
 */
export const DEFAULT_PREFERENCES: UserPreferences = {
	// Empty for now - will add theme preference later
};
