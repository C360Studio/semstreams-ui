import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/svelte";
import { tick } from "svelte";
import AddComponentModal from "./AddComponentModal.svelte";
import type { ComponentType } from "$lib/types/component";

describe("AddComponentModal", () => {
  const mockComponentTypes: ComponentType[] = [
    {
      id: "udp-input",
      name: "UDP Input",
      type: "input",
      protocol: "udp",
      category: "input",
      description: "Receives data over UDP protocol",
      version: "1.0.0",
      configSchema: {
        type: "object",
        properties: {
          port: {
            type: "number",
            description: "UDP port to listen on",
            default: 5000,
            minimum: 1024,
            maximum: 65535,
          },
          bufferSize: {
            type: "number",
            description: "Buffer size in bytes",
            default: 1024,
          },
        },
        required: ["port"],
      },
    },
    {
      id: "nats-processor",
      name: "NATS Processor",
      type: "processor",
      protocol: "nats",
      category: "processor",
      description: "Processes messages from NATS",
      version: "1.0.0",
      configSchema: {
        type: "object",
        properties: {
          subject: {
            type: "string",
            description: "NATS subject pattern",
            default: "data.*",
          },
          workers: {
            type: "number",
            description: "Number of worker threads",
            default: 4,
            minimum: 1,
            maximum: 16,
          },
        },
        required: ["subject"],
      },
    },
    {
      id: "websocket-output",
      name: "WebSocket Output",
      type: "output",
      protocol: "websocket",
      category: "output",
      description: "Sends data via WebSocket",
      version: "1.0.0",
      configSchema: {
        type: "object",
        properties: {
          endpoint: {
            type: "string",
            description: "WebSocket endpoint URL",
            default: "ws://localhost:8080",
          },
        },
        required: ["endpoint"],
      },
    },
  ];

  // Test 1: DOM Output - Rendering States
  describe("DOM Output - Rendering States", () => {
    it("should not render when isOpen is false", () => {
      const { container } = render(AddComponentModal, {
        props: {
          isOpen: false,
          componentTypes: mockComponentTypes,
          onAdd: vi.fn(),
          onClose: vi.fn(),
        },
      });

      expect(
        container.querySelector('[role="dialog"]'),
      ).not.toBeInTheDocument();
    });

    it("should render dialog when isOpen is true", () => {
      const { container } = render(AddComponentModal, {
        props: {
          isOpen: true,
          componentTypes: mockComponentTypes,
          onAdd: vi.fn(),
          onClose: vi.fn(),
        },
      });

      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog).toBeInTheDocument();
    });

    it("should render correct dialog title", () => {
      const { container } = render(AddComponentModal, {
        props: {
          isOpen: true,
          componentTypes: mockComponentTypes,
          onAdd: vi.fn(),
          onClose: vi.fn(),
        },
      });

      const title = container.querySelector("#dialog-title");
      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent("Add Component");
    });

    it("should render component type dropdown", () => {
      const { container } = render(AddComponentModal, {
        props: {
          isOpen: true,
          componentTypes: mockComponentTypes,
          onAdd: vi.fn(),
          onClose: vi.fn(),
        },
      });

      const select = container.querySelector('select[name="componentType"]');
      expect(select).toBeInTheDocument();
    });

    it("should render name input field", () => {
      const { container } = render(AddComponentModal, {
        props: {
          isOpen: true,
          componentTypes: mockComponentTypes,
          onAdd: vi.fn(),
          onClose: vi.fn(),
        },
      });

      const nameInput = container.querySelector('input[name="name"]');
      expect(nameInput).toBeInTheDocument();
      expect(nameInput).toHaveAttribute("type", "text");
    });

    it("should render Cancel and Add buttons", () => {
      const { container } = render(AddComponentModal, {
        props: {
          isOpen: true,
          componentTypes: mockComponentTypes,
          onAdd: vi.fn(),
          onClose: vi.fn(),
        },
      });

      const buttons = container.querySelectorAll("button");
      const cancelButton = Array.from(buttons).find((btn) =>
        btn.textContent?.includes("Cancel"),
      );
      const addButton = Array.from(buttons).find((btn) =>
        btn.textContent?.includes("Add Component"),
      );

      expect(cancelButton).toBeInTheDocument();
      expect(addButton).toBeInTheDocument();
    });

    it("should render close button (X)", () => {
      const { container } = render(AddComponentModal, {
        props: {
          isOpen: true,
          componentTypes: mockComponentTypes,
          onAdd: vi.fn(),
          onClose: vi.fn(),
        },
      });

      const closeButton = container.querySelector(".close-button");
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toHaveAttribute("aria-label", "Close dialog");
    });
  });

  // Test 2: Component Type Selection
  describe("Component Type Selection", () => {
    it("should populate dropdown with component types", () => {
      const { container } = render(AddComponentModal, {
        props: {
          isOpen: true,
          componentTypes: mockComponentTypes,
          onAdd: vi.fn(),
          onClose: vi.fn(),
        },
      });

      const select = container.querySelector(
        'select[name="componentType"]',
      ) as HTMLSelectElement;
      const options = Array.from(select.options);

      // Should have placeholder + all component types
      expect(options.length).toBe(mockComponentTypes.length + 1);
      expect(options[0].textContent).toContain("Select a component type");
      expect(options[1].textContent).toContain("UDP Input");
      expect(options[2].textContent).toContain("NATS Processor");
      expect(options[3].textContent).toContain("WebSocket Output");
    });

    it("should auto-generate default name when component type selected", async () => {
      const { container } = render(AddComponentModal, {
        props: {
          isOpen: true,
          componentTypes: mockComponentTypes,
          onAdd: vi.fn(),
          onClose: vi.fn(),
        },
      });

      const select = container.querySelector(
        'select[name="componentType"]',
      ) as HTMLSelectElement;
      const nameInput = container.querySelector(
        'input[name="name"]',
      ) as HTMLInputElement;

      // Initially empty
      expect(nameInput.value).toBe("");

      // Select UDP Input
      await fireEvent.change(select, { target: { value: "udp-input" } });
      await tick();

      // Should auto-populate name
      expect(nameInput.value).toMatch(/^udp-input-\d+$/);
    });

    it("should show component-specific config fields when type selected", async () => {
      const { container } = render(AddComponentModal, {
        props: {
          isOpen: true,
          componentTypes: mockComponentTypes,
          onAdd: vi.fn(),
          onClose: vi.fn(),
        },
      });

      const select = container.querySelector(
        'select[name="componentType"]',
      ) as HTMLSelectElement;

      // Select UDP Input
      await fireEvent.change(select, { target: { value: "udp-input" } });
      await tick();

      // Should show config fields from schema
      const portInput = container.querySelector('input[name="config.port"]');
      const bufferInput = container.querySelector(
        'input[name="config.bufferSize"]',
      );

      expect(portInput).toBeInTheDocument();
      expect(bufferInput).toBeInTheDocument();
    });

    it("should populate config fields with default values", async () => {
      const { container } = render(AddComponentModal, {
        props: {
          isOpen: true,
          componentTypes: mockComponentTypes,
          onAdd: vi.fn(),
          onClose: vi.fn(),
        },
      });

      const select = container.querySelector(
        'select[name="componentType"]',
      ) as HTMLSelectElement;

      // Select UDP Input
      await fireEvent.change(select, { target: { value: "udp-input" } });
      await tick();

      // Should show default values
      const portInput = container.querySelector(
        'input[name="config.port"]',
      ) as HTMLInputElement;
      const bufferInput = container.querySelector(
        'input[name="config.bufferSize"]',
      ) as HTMLInputElement;

      expect(portInput.value).toBe("5000");
      expect(bufferInput.value).toBe("1024");
    });

    it("should update config fields when component type changes", async () => {
      const { container } = render(AddComponentModal, {
        props: {
          isOpen: true,
          componentTypes: mockComponentTypes,
          onAdd: vi.fn(),
          onClose: vi.fn(),
        },
      });

      const select = container.querySelector(
        'select[name="componentType"]',
      ) as HTMLSelectElement;

      // Select UDP Input
      await fireEvent.change(select, { target: { value: "udp-input" } });
      await tick();

      expect(
        container.querySelector('input[name="config.port"]'),
      ).toBeInTheDocument();

      // Change to NATS Processor
      await fireEvent.change(select, { target: { value: "nats-processor" } });
      await tick();

      // UDP config fields should be gone
      expect(
        container.querySelector('input[name="config.port"]'),
      ).not.toBeInTheDocument();

      // NATS config fields should appear
      expect(
        container.querySelector('input[name="config.subject"]'),
      ).toBeInTheDocument();
      expect(
        container.querySelector('input[name="config.workers"]'),
      ).toBeInTheDocument();
    });
  });

  // Test 3: Form Validation
  describe("Form Validation", () => {
    it("should disable Add button when no component type selected", () => {
      const { container } = render(AddComponentModal, {
        props: {
          isOpen: true,
          componentTypes: mockComponentTypes,
          onAdd: vi.fn(),
          onClose: vi.fn(),
        },
      });

      const buttons = container.querySelectorAll("button");
      const addButton = Array.from(buttons).find((btn) =>
        btn.textContent?.includes("Add Component"),
      ) as HTMLButtonElement;

      expect(addButton).toBeDisabled();
    });

    it("should disable Add button when name is empty", async () => {
      const { container } = render(AddComponentModal, {
        props: {
          isOpen: true,
          componentTypes: mockComponentTypes,
          onAdd: vi.fn(),
          onClose: vi.fn(),
        },
      });

      const select = container.querySelector(
        'select[name="componentType"]',
      ) as HTMLSelectElement;
      const nameInput = container.querySelector(
        'input[name="name"]',
      ) as HTMLInputElement;

      // Select component type
      await fireEvent.change(select, { target: { value: "udp-input" } });
      await tick();

      // Clear the auto-generated name
      await fireEvent.input(nameInput, { target: { value: "" } });
      await tick();

      const buttons = container.querySelectorAll("button");
      const addButton = Array.from(buttons).find((btn) =>
        btn.textContent?.includes("Add Component"),
      ) as HTMLButtonElement;

      expect(addButton).toBeDisabled();
    });

    it("should disable Add button when required config field is empty", async () => {
      const { container } = render(AddComponentModal, {
        props: {
          isOpen: true,
          componentTypes: mockComponentTypes,
          onAdd: vi.fn(),
          onClose: vi.fn(),
        },
      });

      const select = container.querySelector(
        'select[name="componentType"]',
      ) as HTMLSelectElement;

      // Select UDP Input (port is required)
      await fireEvent.change(select, { target: { value: "udp-input" } });
      await tick();

      const portInput = container.querySelector(
        'input[name="config.port"]',
      ) as HTMLInputElement;

      // Clear required field
      await fireEvent.input(portInput, { target: { value: "" } });
      await tick();

      const buttons = container.querySelectorAll("button");
      const addButton = Array.from(buttons).find((btn) =>
        btn.textContent?.includes("Add Component"),
      ) as HTMLButtonElement;

      expect(addButton).toBeDisabled();
    });

    it("should enable Add button when all required fields are valid", async () => {
      const { container } = render(AddComponentModal, {
        props: {
          isOpen: true,
          componentTypes: mockComponentTypes,
          onAdd: vi.fn(),
          onClose: vi.fn(),
        },
      });

      const select = container.querySelector(
        'select[name="componentType"]',
      ) as HTMLSelectElement;

      // Select component type (auto-generates name and default config)
      await fireEvent.change(select, { target: { value: "udp-input" } });
      await tick();

      const buttons = container.querySelectorAll("button");
      const addButton = Array.from(buttons).find((btn) =>
        btn.textContent?.includes("Add Component"),
      ) as HTMLButtonElement;

      expect(addButton).not.toBeDisabled();
    });

    it("should show validation error for invalid number input", async () => {
      const { container } = render(AddComponentModal, {
        props: {
          isOpen: true,
          componentTypes: mockComponentTypes,
          onAdd: vi.fn(),
          onClose: vi.fn(),
        },
      });

      const select = container.querySelector(
        'select[name="componentType"]',
      ) as HTMLSelectElement;

      // Select UDP Input
      await fireEvent.change(select, { target: { value: "udp-input" } });
      await tick();

      const portInput = container.querySelector(
        'input[name="config.port"]',
      ) as HTMLInputElement;

      // Enter value below minimum
      await fireEvent.input(portInput, { target: { value: "500" } });
      await tick();

      // Should show validation error
      const errorMessage = container.querySelector(".validation-error");
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveTextContent(/minimum.*1024/i);
    });

    it("should show validation error for value above maximum", async () => {
      const { container } = render(AddComponentModal, {
        props: {
          isOpen: true,
          componentTypes: mockComponentTypes,
          onAdd: vi.fn(),
          onClose: vi.fn(),
        },
      });

      const select = container.querySelector(
        'select[name="componentType"]',
      ) as HTMLSelectElement;

      // Select UDP Input
      await fireEvent.change(select, { target: { value: "udp-input" } });
      await tick();

      const portInput = container.querySelector(
        'input[name="config.port"]',
      ) as HTMLInputElement;

      // Enter value above maximum
      await fireEvent.input(portInput, { target: { value: "70000" } });
      await tick();

      // Should show validation error
      const errorMessage = container.querySelector(".validation-error");
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveTextContent(/maximum.*65535/i);
    });
  });

  // Test 4: User Actions
  describe("User Actions", () => {
    it("should call onClose when Cancel button clicked", async () => {
      const onClose = vi.fn();
      const { container } = render(AddComponentModal, {
        props: {
          isOpen: true,
          componentTypes: mockComponentTypes,
          onAdd: vi.fn(),
          onClose,
        },
      });

      const buttons = container.querySelectorAll("button");
      const cancelButton = Array.from(buttons).find((btn) =>
        btn.textContent?.includes("Cancel"),
      ) as HTMLButtonElement;

      await fireEvent.click(cancelButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("should call onClose when close button (X) clicked", async () => {
      const onClose = vi.fn();
      const { container } = render(AddComponentModal, {
        props: {
          isOpen: true,
          componentTypes: mockComponentTypes,
          onAdd: vi.fn(),
          onClose,
        },
      });

      const closeButton = container.querySelector(
        ".close-button",
      ) as HTMLButtonElement;

      await fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("should call onClose when clicking outside dialog (background)", async () => {
      const onClose = vi.fn();
      const { container } = render(AddComponentModal, {
        props: {
          isOpen: true,
          componentTypes: mockComponentTypes,
          onAdd: vi.fn(),
          onClose,
        },
      });

      const overlay = container.querySelector(".dialog-overlay") as HTMLElement;

      // Click on overlay background
      await fireEvent.click(overlay);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("should NOT close when clicking inside dialog content", async () => {
      const onClose = vi.fn();
      const { container } = render(AddComponentModal, {
        props: {
          isOpen: true,
          componentTypes: mockComponentTypes,
          onAdd: vi.fn(),
          onClose,
        },
      });

      const dialogContent = container.querySelector(
        ".dialog-content",
      ) as HTMLElement;

      // Click inside dialog content
      await fireEvent.click(dialogContent);

      expect(onClose).not.toHaveBeenCalled();
    });

    it("should call onAdd with correct data when Add button clicked", async () => {
      const onAdd = vi.fn();
      const { container } = render(AddComponentModal, {
        props: {
          isOpen: true,
          componentTypes: mockComponentTypes,
          onAdd,
          onClose: vi.fn(),
        },
      });

      const select = container.querySelector(
        'select[name="componentType"]',
      ) as HTMLSelectElement;
      const nameInput = container.querySelector(
        'input[name="name"]',
      ) as HTMLInputElement;

      // Select component type
      await fireEvent.change(select, { target: { value: "udp-input" } });
      await tick();

      // Customize name
      await fireEvent.input(nameInput, { target: { value: "my-udp-input" } });
      await tick();

      // Customize config
      const portInput = container.querySelector(
        'input[name="config.port"]',
      ) as HTMLInputElement;
      await fireEvent.input(portInput, { target: { value: "8000" } });
      await tick();

      // Click Add button
      const buttons = container.querySelectorAll("button");
      const addButton = Array.from(buttons).find((btn) =>
        btn.textContent?.includes("Add Component"),
      ) as HTMLButtonElement;
      await fireEvent.click(addButton);

      // Verify onAdd called with correct data
      expect(onAdd).toHaveBeenCalledTimes(1);
      expect(onAdd).toHaveBeenCalledWith(
        mockComponentTypes[0], // UDP Input component type
        "my-udp-input",
        {
          port: 8000,
          bufferSize: 1024,
        },
      );
    });

    it("should reset form when Add is successful", async () => {
      const onAdd = vi.fn();
      const { container } = render(AddComponentModal, {
        props: {
          isOpen: true,
          componentTypes: mockComponentTypes,
          onAdd,
          onClose: vi.fn(),
        },
      });

      const select = container.querySelector(
        'select[name="componentType"]',
      ) as HTMLSelectElement;

      // Select component type
      await fireEvent.change(select, { target: { value: "udp-input" } });
      await tick();

      // Click Add button
      const buttons = container.querySelectorAll("button");
      const addButton = Array.from(buttons).find((btn) =>
        btn.textContent?.includes("Add Component"),
      ) as HTMLButtonElement;
      await fireEvent.click(addButton);
      await tick();

      // Form should reset
      expect(select.value).toBe("");
      const nameInput = container.querySelector(
        'input[name="name"]',
      ) as HTMLInputElement;
      expect(nameInput.value).toBe("");
    });
  });

  // Test 5: Keyboard Navigation
  describe("Keyboard Navigation", () => {
    it("should close dialog when ESC key pressed", async () => {
      const onClose = vi.fn();
      render(AddComponentModal, {
        props: {
          isOpen: true,
          componentTypes: mockComponentTypes,
          onAdd: vi.fn(),
          onClose,
        },
      });

      // Simulate ESC key press
      const escEvent = new KeyboardEvent("keydown", { key: "Escape" });
      window.dispatchEvent(escEvent);

      await tick();

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("should NOT close when other keys pressed", async () => {
      const onClose = vi.fn();
      render(AddComponentModal, {
        props: {
          isOpen: true,
          componentTypes: mockComponentTypes,
          onAdd: vi.fn(),
          onClose,
        },
      });

      // Simulate other key presses
      const enterEvent = new KeyboardEvent("keydown", { key: "Enter" });
      window.dispatchEvent(enterEvent);

      const spaceEvent = new KeyboardEvent("keydown", { key: " " });
      window.dispatchEvent(spaceEvent);

      await tick();

      expect(onClose).not.toHaveBeenCalled();
    });

    it("should NOT trigger ESC handler when dialog is closed", async () => {
      const onClose = vi.fn();
      render(AddComponentModal, {
        props: {
          isOpen: false,
          componentTypes: mockComponentTypes,
          onAdd: vi.fn(),
          onClose,
        },
      });

      // Simulate ESC key press
      const escEvent = new KeyboardEvent("keydown", { key: "Escape" });
      window.dispatchEvent(escEvent);

      await tick();

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  // Test 6: Accessibility
  describe("Accessibility", () => {
    it("should have proper ARIA attributes", () => {
      const { container } = render(AddComponentModal, {
        props: {
          isOpen: true,
          componentTypes: mockComponentTypes,
          onAdd: vi.fn(),
          onClose: vi.fn(),
        },
      });

      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(dialog).toHaveAttribute("aria-labelledby", "dialog-title");

      const title = container.querySelector("#dialog-title");
      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent("Add Component");
    });

    it("should have aria-label on close button", () => {
      const { container } = render(AddComponentModal, {
        props: {
          isOpen: true,
          componentTypes: mockComponentTypes,
          onAdd: vi.fn(),
          onClose: vi.fn(),
        },
      });

      const closeButton = container.querySelector(".close-button");
      expect(closeButton).toHaveAttribute("aria-label", "Close dialog");
    });

    it("should have proper label associations for form fields", () => {
      const { container } = render(AddComponentModal, {
        props: {
          isOpen: true,
          componentTypes: mockComponentTypes,
          onAdd: vi.fn(),
          onClose: vi.fn(),
        },
      });

      // Component type field
      const typeLabel = container.querySelector('label[for="componentType"]');
      const typeSelect = container.querySelector("#componentType");
      expect(typeLabel).toBeInTheDocument();
      expect(typeSelect).toBeInTheDocument();

      // Name field
      const nameLabel = container.querySelector('label[for="name"]');
      const nameInput = container.querySelector("#name");
      expect(nameLabel).toBeInTheDocument();
      expect(nameInput).toBeInTheDocument();
    });

    it("should mark required fields with aria-required", () => {
      const { container } = render(AddComponentModal, {
        props: {
          isOpen: true,
          componentTypes: mockComponentTypes,
          onAdd: vi.fn(),
          onClose: vi.fn(),
        },
      });

      const nameInput = container.querySelector('input[name="name"]');
      expect(nameInput).toHaveAttribute("aria-required", "true");
    });

    it("should have aria-invalid on fields with validation errors", async () => {
      const { container } = render(AddComponentModal, {
        props: {
          isOpen: true,
          componentTypes: mockComponentTypes,
          onAdd: vi.fn(),
          onClose: vi.fn(),
        },
      });

      const select = container.querySelector(
        'select[name="componentType"]',
      ) as HTMLSelectElement;

      // Select UDP Input
      await fireEvent.change(select, { target: { value: "udp-input" } });
      await tick();

      const portInput = container.querySelector(
        'input[name="config.port"]',
      ) as HTMLInputElement;

      // Enter invalid value
      await fireEvent.input(portInput, { target: { value: "500" } });
      await tick();

      expect(portInput).toHaveAttribute("aria-invalid", "true");
    });
  });

  // Test 7: Reactivity
  describe("Reactivity", () => {
    it("should update when isOpen changes", async () => {
      const { container, rerender } = render(AddComponentModal, {
        props: {
          isOpen: false,
          componentTypes: mockComponentTypes,
          onAdd: vi.fn(),
          onClose: vi.fn(),
        },
      });

      // Initially not visible
      expect(
        container.querySelector('[role="dialog"]'),
      ).not.toBeInTheDocument();

      // Open modal
      await rerender({ isOpen: true });
      await tick();

      // Now visible
      expect(container.querySelector('[role="dialog"]')).toBeInTheDocument();
    });

    it("should update when componentTypes change", async () => {
      const { container, rerender } = render(AddComponentModal, {
        props: {
          isOpen: true,
          componentTypes: [mockComponentTypes[0]],
          onAdd: vi.fn(),
          onClose: vi.fn(),
        },
      });

      const select = container.querySelector(
        'select[name="componentType"]',
      ) as HTMLSelectElement;

      // Only 1 component type + placeholder
      expect(select.options.length).toBe(2);

      // Add more component types
      await rerender({ componentTypes: mockComponentTypes });
      await tick();

      // Should now have all component types
      expect(select.options.length).toBe(4);
    });
  });

  // Test 8: Edge Cases
  describe("Edge Cases", () => {
    it("should handle empty componentTypes array", () => {
      const { container } = render(AddComponentModal, {
        props: {
          isOpen: true,
          componentTypes: [],
          onAdd: vi.fn(),
          onClose: vi.fn(),
        },
      });

      const select = container.querySelector(
        'select[name="componentType"]',
      ) as HTMLSelectElement;

      // Should only have placeholder option
      expect(select.options.length).toBe(1);
      expect(select.options[0].textContent).toContain(
        "Select a component type",
      );
    });

    it("should handle component type without configSchema", async () => {
      const componentWithoutSchema: ComponentType = {
        id: "simple-component",
        name: "Simple Component",
        type: "processor",
        protocol: "nats",
        category: "processor",
        description: "Simple component without config schema",
        version: "1.0.0",
      };

      const { container } = render(AddComponentModal, {
        props: {
          isOpen: true,
          componentTypes: [componentWithoutSchema],
          onAdd: vi.fn(),
          onClose: vi.fn(),
        },
      });

      const select = container.querySelector(
        'select[name="componentType"]',
      ) as HTMLSelectElement;

      // Select component
      await fireEvent.change(select, { target: { value: "simple-component" } });
      await tick();

      // Should not show config fields
      const configSection = container.querySelector(".config-section");
      expect(configSection).not.toBeInTheDocument();
    });

    it("should handle missing onAdd callback", async () => {
      const { container } = render(AddComponentModal, {
        props: {
          isOpen: true,
          componentTypes: mockComponentTypes,
          onClose: vi.fn(),
        },
      });

      const select = container.querySelector(
        'select[name="componentType"]',
      ) as HTMLSelectElement;

      // Select component type
      await fireEvent.change(select, { target: { value: "udp-input" } });
      await tick();

      const buttons = container.querySelectorAll("button");
      const addButton = Array.from(buttons).find((btn) =>
        btn.textContent?.includes("Add Component"),
      ) as HTMLButtonElement;

      // Should not throw error when clicking Add
      expect(() => fireEvent.click(addButton)).not.toThrow();
    });

    it("should handle missing onClose callback", async () => {
      const { container } = render(AddComponentModal, {
        props: {
          isOpen: true,
          componentTypes: mockComponentTypes,
          onAdd: vi.fn(),
        },
      });

      const buttons = container.querySelectorAll("button");
      const cancelButton = Array.from(buttons).find((btn) =>
        btn.textContent?.includes("Cancel"),
      ) as HTMLButtonElement;

      // Should not throw error when clicking Cancel
      expect(() => fireEvent.click(cancelButton)).not.toThrow();
    });

    it("should sanitize auto-generated names", async () => {
      const componentWithSpecialChars: ComponentType = {
        id: "special-component-@#$",
        name: "Special Component @#$",
        type: "processor",
        protocol: "nats",
        category: "processor",
        description: "Component with special characters",
        version: "1.0.0",
      };

      const { container } = render(AddComponentModal, {
        props: {
          isOpen: true,
          componentTypes: [componentWithSpecialChars],
          onAdd: vi.fn(),
          onClose: vi.fn(),
        },
      });

      const select = container.querySelector(
        'select[name="componentType"]',
      ) as HTMLSelectElement;
      const nameInput = container.querySelector(
        'input[name="name"]',
      ) as HTMLInputElement;

      // Select component
      await fireEvent.change(select, {
        target: { value: "special-component-@#$" },
      });
      await tick();

      // Name should be sanitized (alphanumeric, dashes, underscores only)
      expect(nameInput.value).toMatch(/^[a-z0-9-_]+$/);
    });
  });
});
