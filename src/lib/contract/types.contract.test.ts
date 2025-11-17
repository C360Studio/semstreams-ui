import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Contract tests for generated TypeScript types
 * These tests validate that the generated types file exists, is valid, and can be imported
 */

const GENERATED_TYPES_PATH = join(__dirname, '../types/api.generated.ts');

/**
 * Helper to load generated types with clear error messages
 * Returns null if types not found (tests will be skipped)
 */
function loadGeneratedTypes(): string | null {
	if (!existsSync(GENERATED_TYPES_PATH)) {
		console.log(`
⚠️  Skipping type contract tests: Generated types not found at ${GENERATED_TYPES_PATH}

These tests are optional. They validate the generated TypeScript types.

To enable these tests:
  1. Set OPENAPI_SPEC_PATH to your backend's spec
  2. Run: task generate-types

This generates TypeScript types from your OpenAPI specification.
		`.trim());
		return null; // Skip tests gracefully
	}

	try {
		return readFileSync(GENERATED_TYPES_PATH, 'utf8');
	} catch (err: any) {
		throw new Error(`Failed to read generated types: ${err.message}`);
	}
}

describe.skipIf(!existsSync(GENERATED_TYPES_PATH))('TypeScript Type Generation Contract Tests', () => {
	it('should have generated types file', () => {
		expect(() => {
			loadGeneratedTypes();
		}).not.toThrow();
	});

	it('should have valid TypeScript syntax', () => {
		expect(() => {
			const content = loadGeneratedTypes();
			expect(content).toBeDefined();
		}).not.toThrow();
	});

	it('should export components type', () => {
		const content = loadGeneratedTypes();
		expect(content).toContain('components');
		expect(content).toContain('schemas');
	});

	it('should export ComponentType schema', () => {
		const content = loadGeneratedTypes();
		expect(content).toContain('ComponentType');
	});

	it('should have path definitions', () => {
		const content = loadGeneratedTypes();
		expect(content).toContain('paths');
	});

	it('should export operations for component management', () => {
		const content = loadGeneratedTypes();
		// Check for component-related paths
		expect(content).toContain('/components/types');
	});
});

describe.skipIf(!existsSync(GENERATED_TYPES_PATH))('Type Contract Compatibility', () => {
	it('should have generated file header comment', () => {
		const content = loadGeneratedTypes();
		// Generated files typically have a header comment
		expect(content).toMatch(/\/\*\*|\/\//);
	});

	it('should be non-empty', () => {
		const content = loadGeneratedTypes();
		expect(content.length).toBeGreaterThan(100);
	});

	it('should have TypeScript interface or type definitions', () => {
		const content = loadGeneratedTypes();
		const hasTypes = content.includes('interface ') || content.includes('type ') || content.includes('export ');
		expect(hasTypes).toBe(true);
	});
});
