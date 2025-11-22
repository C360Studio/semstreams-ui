import { describe, it, expect } from 'vitest';
import {
	convertToXYFlowEdge,
	patternToStrokeDasharray,
	computeConnectionVisualState
} from './xyflow-converters';
import type { FlowConnection } from '$lib/types/flow';
import type { ValidationResult } from '$lib/types/port';

describe('xyflow-converters', () => {
	describe('convertToXYFlowEdge', () => {
		it('should convert manual connection to XYFlow edge with solid line', () => {
			const connection: FlowConnection = {
				id: 'conn-1',
				source_node_id: 'node-1',
				source_port: 'output1',
				target_node_id: 'node-2',
				target_port: 'input1',
				source: 'manual',
			};

			const edge = convertToXYFlowEdge(connection);

			expect(edge.id).toBe('conn-1');
			expect(edge.source).toBe('node-1');
			expect(edge.target).toBe('node-2');
			expect(edge.sourceHandle).toBe('output1');
			expect(edge.targetHandle).toBe('input1');
			expect(edge.data?.source).toBe('manual');

			// Manual connections should have solid line (no stroke-dasharray)
			expect(edge.style).toBeUndefined();
		});

		it('should convert auto connection to XYFlow edge with dashed line', () => {
			const connection: FlowConnection = {
				id: 'conn-2',
				source_node_id: 'node-1',
				source_port: 'output1',
				target_node_id: 'node-2',
				target_port: 'input1',
				source: 'auto',
			};

			const edge = convertToXYFlowEdge(connection);

			expect(edge.data?.source).toBe('auto');

			// Auto connections should have dashed line
			expect(edge.style).toContain('strokeDasharray: 5, 5');
		});

		it('should preserve validation state in edge data', () => {
			const connection: FlowConnection = {
				id: 'conn-3',
				source_node_id: 'node-1',
				source_port: 'output1',
				target_node_id: 'node-2',
				target_port: 'input1',
				source: 'manual',
				validationState: 'error',
			};

			const edge = convertToXYFlowEdge(connection);

			expect(edge.data?.validationState).toBe('error');
		});

		it('should apply error styling when validation state is error', () => {
			const connection: FlowConnection = {
				id: 'conn-4',
				source_node_id: 'node-1',
				source_port: 'output1',
				target_node_id: 'node-2',
				target_port: 'input1',
				source: 'manual',
				validationState: 'error',
			};

			const edge = convertToXYFlowEdge(connection);

			// Error connections should have red stroke
			expect(edge.style).toContain('stroke: #dc3545');
		});

		it('should apply warning styling when validation state is warning', () => {
			const connection: FlowConnection = {
				id: 'conn-5',
				source_node_id: 'node-1',
				source_port: 'output1',
				target_node_id: 'node-2',
				target_port: 'input1',
				source: 'manual',
				validationState: 'warning'
			};

			const edge = convertToXYFlowEdge(connection);

			// Warning connections should have yellow stroke
			expect(edge.style).toContain('stroke: #ffc107');
		});

		it('should apply valid styling when validation state is valid', () => {
			const connection: FlowConnection = {
				id: 'conn-6',
				source_node_id: 'node-1',
				source_port: 'output1',
				target_node_id: 'node-2',
				target_port: 'input1',
				source: 'manual',
				validationState: 'valid',
			};

			const edge = convertToXYFlowEdge(connection);

			// Valid connections should have blue stroke
			expect(edge.style).toContain('stroke: #0066cc');
		});

		it('should handle undefined validation state gracefully', () => {
			const connection: FlowConnection = {
				id: 'conn-7',
				source_node_id: 'node-1',
				source_port: 'output1',
				target_node_id: 'node-2',
				target_port: 'input1',
				source: 'manual',
				// No validationState
			};

			const edge = convertToXYFlowEdge(connection);

			// Should not crash, should have default styling
			expect(edge).toBeTruthy();
			expect(edge.id).toBe('conn-7');
		});
	});

	// ============================================================================
	// Phase 3: Connection Visual States (Spec 014)
	// ============================================================================

	describe('patternToStrokeDasharray', () => {
		it('should return solid line for stream pattern', () => {
			const result = patternToStrokeDasharray('stream');
			expect(result).toBe('0');
		});

		it('should return dashed line for request pattern', () => {
			const result = patternToStrokeDasharray('request');
			expect(result).toBe('8 4');
		});

		it('should return dotted line for watch pattern', () => {
			const result = patternToStrokeDasharray('watch');
			expect(result).toBe('2 3');
		});
	});

	describe('computeConnectionVisualState', () => {
		it('should compute valid state for stream connection', () => {
			const edge = {
				id: 'edge-1',
				source: 'node-1',
				target: 'node-2',
				data: { patternType: 'stream' as const }
			};

			const validationResult: ValidationResult = {
				validation_status: 'valid',
				errors: [],
				warnings: [],
				nodes: [],
				discovered_connections: []
			};

			const visualState = computeConnectionVisualState(edge, validationResult);

			expect(visualState.linePattern).toBe('solid');
			expect(visualState.validationState).toBe('valid');
			expect(visualState.strokeDasharray).toBe('0');
			expect(visualState.connectionId).toBe('edge-1');
		});

		it('should compute error state for invalid connection', () => {
			const edge = {
				id: 'edge-invalid',
				source: 'node-1',
				target: 'node-2',
				data: { patternType: 'stream' as const }
			};

			const validationResult: ValidationResult = {
				validation_status: 'errors',
				errors: [
					{
						type: 'port_conflict',
						severity: 'error',
						component_name: 'node-1',
						message: 'Type mismatch',
						suggestions: []
					}
				],
				warnings: [],
				nodes: [],
				discovered_connections: []
			};

			const visualState = computeConnectionVisualState(edge, validationResult);

			expect(visualState.validationState).toBe('error');
			expect(visualState.color).toBe('var(--status-error)'); // CSS variable for error color
			expect(visualState.errorIcon).toBe('exclamation-circle');
		});

		it('should use dashed pattern for request connections', () => {
			const edge = {
				id: 'edge-2',
				source: 'node-1',
				target: 'node-2',
				data: { patternType: 'request' as const }
			};

			const validationResult: ValidationResult = {
				validation_status: 'valid',
				errors: [],
				warnings: [],
				nodes: [],
				discovered_connections: []
			};

			const visualState = computeConnectionVisualState(edge, validationResult);

			expect(visualState.linePattern).toBe('dashed');
			expect(visualState.strokeDasharray).toBe('8 4');
		});

		it('should use dotted pattern for watch connections', () => {
			const edge = {
				id: 'edge-3',
				source: 'node-1',
				target: 'node-2',
				data: { patternType: 'watch' as const }
			};

			const validationResult: ValidationResult = {
				validation_status: 'valid',
				errors: [],
				warnings: [],
				nodes: [],
				discovered_connections: []
			};

			const visualState = computeConnectionVisualState(edge, validationResult);

			expect(visualState.linePattern).toBe('dotted');
			expect(visualState.strokeDasharray).toBe('2 3');
		});

		it('should default to stream pattern when pattern type missing', () => {
			const edge = {
				id: 'edge-4',
				source: 'node-1',
				target: 'node-2',
				data: {}
			};

			const validationResult: ValidationResult = {
				validation_status: 'valid',
				errors: [],
				warnings: [],
				nodes: [],
				discovered_connections: []
			};

			const visualState = computeConnectionVisualState(edge, validationResult);

			expect(visualState.linePattern).toBe('solid'); // Default to stream
			expect(visualState.strokeDasharray).toBe('0');
		});
	});
});
