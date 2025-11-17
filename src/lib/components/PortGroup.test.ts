import { render, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import { tick } from 'svelte';
import PortGroup from './PortGroup.svelte';
import type { PortGroup as PortGroupType, ValidatedPort } from '$lib/types/port';

describe('PortGroup', () => {
	const createPort = (name: string, direction: 'input' | 'output'): ValidatedPort => ({
		name,
		direction,
		required: false,
		description: `${name} description`,
		pattern: 'stream', // Backend pattern type
		type: 'message.Storable', // Interface contract type
		connection_id: `test.${name}`, // NATS subject or connection ID
	});

	const createPortGroup = (overrides?: Partial<PortGroupType>): PortGroupType => ({
		id: 'inputs',
		label: 'Input Ports (3)',
		ports: [
			createPort('port1', 'input'),
			createPort('port2', 'input'),
			createPort('port3', 'input'),
		],
		collapsed: false,
		position: 'left',
		...overrides,
	});

	it('should render group label with port count', () => {
		const group = createPortGroup();

		const { container } = render(PortGroup, { props: { group, renderHandles: false } });

		expect(container.textContent).toContain('Input Ports (3)');
	});

	it('should show all ports when expanded', () => {
		const group = createPortGroup({
			collapsed: false,
		});

		const { container } = render(PortGroup, { props: { group, renderHandles: false } });

		const portItems = container.querySelectorAll('.port-item');
		expect(portItems.length).toBe(3);
	});

	it('should hide ports when collapsed', async () => {
		const group = createPortGroup({
			collapsed: false,
		});

		const { container } = render(PortGroup, { props: { group, renderHandles: false } });

		// Initially expanded - ports visible
		let portItems = container.querySelectorAll('.port-item');
		expect(portItems.length).toBeGreaterThan(0);

		// Click collapse button (now the whole header is a button)
		const toggleButton = container.querySelector('button.port-group-header');
		expect(toggleButton).toBeTruthy();

		await fireEvent.click(toggleButton!);
		await tick();

		// Ports should be hidden (removed from DOM with {#if})
		portItems = container.querySelectorAll('.port-item');
		expect(portItems.length).toBe(0);
	});

	it('should expand ports when clicking toggle button', async () => {
		const group = createPortGroup({
			collapsed: true,
		});

		const { container } = render(PortGroup, { props: { group, renderHandles: false } });

		// Initially collapsed - ports hidden (not in DOM)
		let portItems = container.querySelectorAll('.port-item');
		expect(portItems.length).toBe(0);

		// Click header button to expand
		const toggleButton = container.querySelector('button.port-group-header');
		expect(toggleButton).toBeTruthy();

		await fireEvent.click(toggleButton!);
		await tick();

		// Ports should now be visible (added to DOM)
		portItems = container.querySelectorAll('.port-item');
		expect(portItems.length).toBe(3);

		// Ports container should exist
		const portsContainer = container.querySelector('.port-group-ports');
		expect(portsContainer).toBeTruthy();
	});

	it('should filter ports by direction', () => {
		const inputPorts = [
			createPort('in1', 'input'),
			createPort('in2', 'input'),
		];

		const group = createPortGroup({
			id: 'inputs',
			label: 'Input Ports (2)',
			ports: inputPorts,
		});

		const { container } = render(PortGroup, { props: { group, renderHandles: false } });

		// Should only render input ports
		const portItems = container.querySelectorAll('.port-item');
		expect(portItems.length).toBe(2);

		// Check port names are rendered
		const portNames = container.querySelectorAll('.port-name');
		expect(portNames.length).toBe(2);
		expect(portNames[0].textContent).toBe('in1');
		expect(portNames[1].textContent).toBe('in2');
	});
});
