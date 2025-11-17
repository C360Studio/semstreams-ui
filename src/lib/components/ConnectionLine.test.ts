import { render } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import ConnectionLine from './ConnectionLine.svelte';
import type { ConnectionSource } from '$lib/types/flow';
import type { ValidationState } from '$lib/types/port';

describe('ConnectionLine', () => {
	// Mock XYFlow EdgeProps
	const createEdgeProps = (source: ConnectionSource, validationState?: ValidationState) => ({
		id: 'edge-1',
		source: 'node-1',
		target: 'node-2',
		sourceX: 100,
		sourceY: 100,
		targetX: 300,
		targetY: 300,
		sourcePosition: 'right' as const,
		targetPosition: 'left' as const,
		data: {
			source,
			validationState,
			sourceNodeId: 'node-1',
			sourcePort: 'output1',
			targetNodeId: 'node-2',
			targetPort: 'input1',
		},
	});

	it('should render auto-discovered connection with dashed line', () => {
		const props = createEdgeProps('auto');

		const { container } = render(ConnectionLine, { props });

		const edge = container.querySelector('[data-source="auto"]');
		expect(edge).toBeTruthy();
		expect(edge?.classList.contains('edge-auto')).toBe(true);

		// Check for dashed line styling (stroke-dasharray in style attribute)
		const path = container.querySelector('path');
		expect(path).toBeTruthy();
		const style = path?.getAttribute('style');
		expect(style).toBeTruthy();
		expect(style).toContain('stroke-dasharray');
		expect(style).toContain('5');
	});

	it('should render manual connection with solid line', () => {
		const props = createEdgeProps('manual');

		const { container } = render(ConnectionLine, { props });

		const edge = container.querySelector('[data-source="manual"]');
		expect(edge).toBeTruthy();
		expect(edge?.classList.contains('edge-manual')).toBe(true);

		// Check for solid line (no stroke-dasharray or empty)
		const path = container.querySelector('path');
		const strokeDasharray = path?.getAttribute('stroke-dasharray');
		expect(!strokeDasharray || strokeDasharray === 'none' || strokeDasharray === '').toBe(true);
	});

	it('should render valid connection with blue styling', () => {
		const props = createEdgeProps('manual', 'valid');

		const { container } = render(ConnectionLine, { props });

		const edge = container.querySelector('[data-validation-state="valid"]');
		expect(edge).toBeTruthy();
		expect(edge?.classList.contains('edge-valid')).toBe(true);

		// Check stroke color in inline style (CSS variable for primary interactive color)
		const path = container.querySelector('path');
		const style = path?.getAttribute('style');
		expect(style).toBeTruthy();
		expect(style).toContain('stroke: var(--ui-interactive-primary)');
	});

	it('should render error connection with red styling', () => {
		const props = createEdgeProps('manual', 'error');

		const { container } = render(ConnectionLine, { props });

		const edge = container.querySelector('[data-validation-state="error"]');
		expect(edge).toBeTruthy();
		expect(edge?.classList.contains('edge-error')).toBe(true);

		// Check stroke color (CSS variable for error) and width (3px) in inline style
		const path = container.querySelector('path');
		const style = path?.getAttribute('style');
		expect(style).toBeTruthy();
		expect(style).toContain('stroke: var(--status-error)');
		expect(style).toContain('stroke-width: 3');
	});

	it('should render warning connection with yellow styling', () => {
		const props = createEdgeProps('manual', 'warning');

		const { container } = render(ConnectionLine, { props });

		const edge = container.querySelector('[data-validation-state="warning"]');
		expect(edge).toBeTruthy();
		expect(edge?.classList.contains('edge-warning')).toBe(true);

		// Check stroke color (CSS variable for warning) and width (2px) in inline style
		const path = container.querySelector('path');
		const style = path?.getAttribute('style');
		expect(style).toBeTruthy();
		expect(style).toContain('stroke: var(--status-warning)');
		expect(style).toContain('stroke-width: 2');
	});
});
