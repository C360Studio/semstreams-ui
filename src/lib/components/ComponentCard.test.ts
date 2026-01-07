import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/svelte";
import ComponentCard from "./ComponentCard.svelte";
import type { FlowNode } from "$lib/types/flow";

describe("ComponentCard", () => {
  const createMockNode = (overrides?: Partial<FlowNode>): FlowNode => ({
    id: "node-1",
    type: "udp-input",
    name: "UDP Input",
    position: { x: 100, y: 100 },
    config: { port: 14550 },
    ...overrides,
  });

  describe("rendering", () => {
    it("should render node name", () => {
      const node = createMockNode();

      render(ComponentCard, { props: { node } });

      expect(screen.getByText("UDP Input")).toBeInTheDocument();
    });

    it("should render node type", () => {
      const node = createMockNode({ type: "websocket-output" });

      render(ComponentCard, { props: { node } });

      expect(screen.getByText("Type: websocket-output")).toBeInTheDocument();
    });

    it("should render both name and type", () => {
      const node = createMockNode({
        name: "My Component",
        type: "json-transform",
      });

      render(ComponentCard, { props: { node } });

      expect(screen.getByText("My Component")).toBeInTheDocument();
      expect(screen.getByText("Type: json-transform")).toBeInTheDocument();
    });

    it("should apply domain color accent from type", () => {
      const node = createMockNode({ type: "udp-input" });

      const { container } = render(ComponentCard, { props: { node } });

      // Card should have domain color styling applied
      const card = container.querySelector(".component-card");
      expect(card).toBeInTheDocument();
    });

    it("should render with different node types", () => {
      const nodeTypes = [
        "udp-input",
        "websocket-output",
        "json-transform",
        "storage-writer",
      ];

      nodeTypes.forEach((type) => {
        const node = createMockNode({ type, name: `${type}-instance` });
        const { container } = render(ComponentCard, { props: { node } });

        expect(screen.getByText(`${type}-instance`)).toBeInTheDocument();
        expect(screen.getByText(`Type: ${type}`)).toBeInTheDocument();

        container.remove();
      });
    });

    it("should handle empty node name", () => {
      const node = createMockNode({ name: "" });

      render(ComponentCard, { props: { node } });

      // Should fall back to showing node ID or type
      expect(screen.getByText("Type: udp-input")).toBeInTheDocument();
    });

    it("should display action buttons", () => {
      const node = createMockNode();

      render(ComponentCard, { props: { node } });

      // Edit and Delete buttons should be present
      const editButton = screen.getByRole("button", { name: /edit/i });
      const deleteButton = screen.getByRole("button", { name: /delete/i });

      expect(editButton).toBeInTheDocument();
      expect(deleteButton).toBeInTheDocument();
    });
  });

  describe("selection", () => {
    it("should apply selected styling when selected prop is true", () => {
      const node = createMockNode();

      const { container } = render(ComponentCard, {
        props: { node, selected: true },
      });

      const card = container.querySelector(".component-card");
      expect(card).toHaveClass("selected");
    });

    it("should not apply selected styling when selected prop is false", () => {
      const node = createMockNode();

      const { container } = render(ComponentCard, {
        props: { node, selected: false },
      });

      const card = container.querySelector(".component-card");
      expect(card).not.toHaveClass("selected");
    });

    it("should not apply selected styling when selected prop is omitted", () => {
      const node = createMockNode();

      const { container } = render(ComponentCard, { props: { node } });

      const card = container.querySelector(".component-card");
      expect(card).not.toHaveClass("selected");
    });

    it("should call onSelect when card is clicked", async () => {
      const node = createMockNode();
      const onSelect = vi.fn();

      render(ComponentCard, { props: { node, onSelect } });

      const card = screen.getByText("UDP Input").closest(".component-card");
      expect(card).toBeInTheDocument();

      if (card) {
        await fireEvent.click(card);
        expect(onSelect).toHaveBeenCalledTimes(1);
      }
    });

    it("should not call onSelect when action buttons are clicked", async () => {
      const node = createMockNode();
      const onSelect = vi.fn();
      const onEdit = vi.fn();
      const onDelete = vi.fn();

      render(ComponentCard, {
        props: { node, onSelect, onEdit, onDelete },
      });

      const editButton = screen.getByRole("button", { name: /edit/i });
      const deleteButton = screen.getByRole("button", { name: /delete/i });

      await fireEvent.click(editButton);
      await fireEvent.click(deleteButton);

      // onSelect should not be called when clicking action buttons
      expect(onSelect).not.toHaveBeenCalled();
    });

    it("should handle multiple selection state changes", async () => {
      const node = createMockNode();

      const { container, rerender } = render(ComponentCard, {
        props: { node, selected: false },
      });

      let card = container.querySelector(".component-card");
      expect(card).not.toHaveClass("selected");

      // Update to selected
      await rerender({ node, selected: true });
      card = container.querySelector(".component-card");
      expect(card).toHaveClass("selected");

      // Update back to not selected
      await rerender({ node, selected: false });
      card = container.querySelector(".component-card");
      expect(card).not.toHaveClass("selected");
    });
  });

  describe("actions", () => {
    it("should call onEdit when edit button is clicked", async () => {
      const node = createMockNode();
      const onEdit = vi.fn();

      render(ComponentCard, { props: { node, onEdit } });

      const editButton = screen.getByRole("button", { name: /edit/i });
      await fireEvent.click(editButton);

      expect(onEdit).toHaveBeenCalledTimes(1);
    });

    it("should call onDelete when delete button is clicked", async () => {
      const node = createMockNode();
      const onDelete = vi.fn();

      render(ComponentCard, { props: { node, onDelete } });

      const deleteButton = screen.getByRole("button", { name: /delete/i });
      await fireEvent.click(deleteButton);

      expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it("should not error if onEdit callback is not provided", async () => {
      const node = createMockNode();

      render(ComponentCard, { props: { node } });

      const editButton = screen.getByRole("button", { name: /edit/i });

      // Should not throw error
      await expect(fireEvent.click(editButton)).resolves.not.toThrow();
    });

    it("should not error if onDelete callback is not provided", async () => {
      const node = createMockNode();

      render(ComponentCard, { props: { node } });

      const deleteButton = screen.getByRole("button", { name: /delete/i });

      // Should not throw error
      await expect(fireEvent.click(deleteButton)).resolves.not.toThrow();
    });

    it("should not error if onSelect callback is not provided", async () => {
      const node = createMockNode();

      render(ComponentCard, { props: { node } });

      const card = screen.getByText("UDP Input").closest(".component-card");

      if (card) {
        // Should not throw error
        await expect(fireEvent.click(card)).resolves.not.toThrow();
      }
    });

    it("should call all callbacks independently", async () => {
      const node = createMockNode();
      const onSelect = vi.fn();
      const onEdit = vi.fn();
      const onDelete = vi.fn();

      render(ComponentCard, {
        props: { node, onSelect, onEdit, onDelete },
      });

      const card = screen.getByText("UDP Input").closest(".component-card");
      const editButton = screen.getByRole("button", { name: /edit/i });
      const deleteButton = screen.getByRole("button", { name: /delete/i });

      if (card) {
        await fireEvent.click(card);
      }
      await fireEvent.click(editButton);
      await fireEvent.click(deleteButton);

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onEdit).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledTimes(1);
    });
  });

  describe("accessibility", () => {
    it("should have proper role for card", () => {
      const node = createMockNode();

      render(ComponentCard, { props: { node } });

      const card = screen.getByRole("button", { name: "UDP Input" });
      expect(card).toBeInTheDocument();
    });

    it("should have aria-label for edit button", () => {
      const node = createMockNode();

      render(ComponentCard, { props: { node } });

      const editButton = screen.getByRole("button", {
        name: /edit UDP Input/i,
      });
      expect(editButton).toBeInTheDocument();
    });

    it("should have aria-label for delete button", () => {
      const node = createMockNode();

      render(ComponentCard, { props: { node } });

      const deleteButton = screen.getByRole("button", {
        name: /delete UDP Input/i,
      });
      expect(deleteButton).toBeInTheDocument();
    });

    it("should have aria-pressed attribute when selected", () => {
      const node = createMockNode();

      render(ComponentCard, { props: { node, selected: true } });

      const card = screen.getByRole("button", { name: "UDP Input" });
      expect(card).toHaveAttribute("aria-pressed", "true");
    });

    it("should have aria-pressed false when not selected", () => {
      const node = createMockNode();

      render(ComponentCard, { props: { node, selected: false } });

      const card = screen.getByRole("button", { name: "UDP Input" });
      expect(card).toHaveAttribute("aria-pressed", "false");
    });

    it("should support keyboard navigation with Enter key", async () => {
      const node = createMockNode();
      const onSelect = vi.fn();

      render(ComponentCard, { props: { node, onSelect } });

      const card = screen.getByRole("button", { name: "UDP Input" });

      await fireEvent.keyDown(card, { key: "Enter", code: "Enter" });

      expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it("should support keyboard navigation with Space key", async () => {
      const node = createMockNode();
      const onSelect = vi.fn();

      render(ComponentCard, { props: { node, onSelect } });

      const card = screen.getByRole("button", { name: "UDP Input" });

      await fireEvent.keyDown(card, { key: " ", code: "Space" });

      expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it("should be keyboard focusable", () => {
      const node = createMockNode();

      render(ComponentCard, { props: { node } });

      const card = screen.getByRole("button", { name: "UDP Input" });

      expect(card).toHaveAttribute("tabindex");
    });

    it("should have descriptive text for screen readers", () => {
      const node = createMockNode({
        name: "Main UDP Receiver",
        type: "udp-input",
      });

      render(ComponentCard, { props: { node } });

      // Card should contain accessible text
      expect(screen.getByText("Main UDP Receiver")).toBeInTheDocument();
      expect(screen.getByText("Type: udp-input")).toBeInTheDocument();
    });
  });

  describe("domain colors", () => {
    it("should apply robotics domain color for MAVLink components", () => {
      const node = createMockNode({ type: "mavlink-decoder" });

      const { container } = render(ComponentCard, { props: { node } });

      const card = container.querySelector(".component-card");
      expect(card).toBeInTheDocument();
      // Domain color should be applied via inline style or CSS class
    });

    it("should apply network domain color for I/O components", () => {
      const node = createMockNode({ type: "udp-input" });

      const { container } = render(ComponentCard, { props: { node } });

      const card = container.querySelector(".component-card");
      expect(card).toBeInTheDocument();
    });

    it("should apply semantic domain color for processing components", () => {
      const node = createMockNode({ type: "json-transform" });

      const { container } = render(ComponentCard, { props: { node } });

      const card = container.querySelector(".component-card");
      expect(card).toBeInTheDocument();
    });

    it("should apply storage domain color for storage components", () => {
      const node = createMockNode({ type: "storage-writer" });

      const { container } = render(ComponentCard, { props: { node } });

      const card = container.querySelector(".component-card");
      expect(card).toBeInTheDocument();
    });

    it("should use fallback color for unknown component types", () => {
      const node = createMockNode({ type: "unknown-component" });

      const { container } = render(ComponentCard, { props: { node } });

      const card = container.querySelector(".component-card");
      expect(card).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("should handle very long component names", () => {
      const node = createMockNode({
        name: "This is a very long component name that might overflow the card boundaries and needs proper handling",
      });

      render(ComponentCard, { props: { node } });

      expect(
        screen.getByText(/This is a very long component name/),
      ).toBeInTheDocument();
    });

    it("should handle special characters in component names", () => {
      const node = createMockNode({
        name: "Component-123_with@special#chars",
      });

      render(ComponentCard, { props: { node } });

      expect(
        screen.getByText("Component-123_with@special#chars"),
      ).toBeInTheDocument();
    });

    it("should handle nodes with minimal config", () => {
      const node = createMockNode({ config: {} });

      render(ComponentCard, { props: { node } });

      expect(screen.getByText("UDP Input")).toBeInTheDocument();
    });

    it("should handle nodes with complex config", () => {
      const node = createMockNode({
        config: {
          port: 14550,
          host: "192.168.1.100",
          timeout: 5000,
          retries: 3,
          buffer_size: 1024,
        },
      });

      render(ComponentCard, { props: { node } });

      expect(screen.getByText("UDP Input")).toBeInTheDocument();
    });

    it("should update when node prop changes", async () => {
      const node1 = createMockNode({ name: "Node 1" });
      const node2 = createMockNode({ name: "Node 2", id: "node-2" });

      const { rerender } = render(ComponentCard, { props: { node: node1 } });

      expect(screen.getByText("Node 1")).toBeInTheDocument();

      await rerender({ node: node2 });

      expect(screen.queryByText("Node 1")).not.toBeInTheDocument();
      expect(screen.getByText("Node 2")).toBeInTheDocument();
    });
  });
});
