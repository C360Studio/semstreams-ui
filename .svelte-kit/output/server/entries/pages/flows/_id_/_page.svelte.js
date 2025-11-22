import { J as attributes, K as clsx, N as spread_props, y as attr, F as attr_class, O as attr_style, z as ensure_array_like, G as stringify, P as bind_props, x as head } from "../../../../chunks/index2.js";
import { u as useStore, P as Panel, H as Handle, B as BaseEdge, S as SvelteFlow, a as SvelteMap } from "../../../../chunks/style.js";
import "clsx";
import { g as getContext, e as escape_html } from "../../../../chunks/context.js";
import { Position, getBezierPath } from "@xyflow/system";
import { g as goto } from "../../../../chunks/client.js";
function ControlButton($$renderer, $$props) {
  let {
    class: className,
    bgColor,
    bgColorHover,
    color,
    colorHover,
    borderColor,
    onclick,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$renderer.push(`<button${attributes(
    {
      type: "button",
      class: clsx(["svelte-flow__controls-button", className]),
      ...restProps
    },
    void 0,
    void 0,
    {
      "--xy-controls-button-background-color-props": bgColor,
      "--xy-controls-button-background-color-hover-props": bgColorHover,
      "--xy-controls-button-color-props": color,
      "--xy-controls-button-color-hover-props": colorHover,
      "--xy-controls-button-border-color-props": borderColor
    }
  )}>`);
  children?.($$renderer);
  $$renderer.push(`<!----></button>`);
}
function Plus($$renderer) {
  $$renderer.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M32 18.133H18.133V32h-4.266V18.133H0v-4.266h13.867V0h4.266v13.867H32z"></path></svg>`);
}
function Minus($$renderer) {
  $$renderer.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 5"><path d="M0 0h32v4.2H0z"></path></svg>`);
}
function Fit($$renderer) {
  $$renderer.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 30"><path d="M3.692 4.63c0-.53.4-.938.939-.938h5.215V0H4.708C2.13 0 0 2.054 0 4.63v5.216h3.692V4.631zM27.354 0h-5.2v3.692h5.17c.53 0 .984.4.984.939v5.215H32V4.631A4.624 4.624 0 0027.354 0zm.954 24.83c0 .532-.4.94-.939.94h-5.215v3.768h5.215c2.577 0 4.631-2.13 4.631-4.707v-5.139h-3.692v5.139zm-23.677.94c-.531 0-.939-.4-.939-.94v-5.138H0v5.139c0 2.577 2.13 4.707 4.708 4.707h5.138V25.77H4.631z"></path></svg>`);
}
function Lock($$renderer) {
  $$renderer.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 32"><path d="M21.333 10.667H19.81V7.619C19.81 3.429 16.38 0 12.19 0 8 0 4.571 3.429 4.571 7.619v3.048H3.048A3.056 3.056 0 000 13.714v15.238A3.056 3.056 0 003.048 32h18.285a3.056 3.056 0 003.048-3.048V13.714a3.056 3.056 0 00-3.048-3.047zM12.19 24.533a3.056 3.056 0 01-3.047-3.047 3.056 3.056 0 013.047-3.048 3.056 3.056 0 013.048 3.048 3.056 3.056 0 01-3.048 3.047zm4.724-13.866H7.467V7.619c0-2.59 2.133-4.724 4.723-4.724 2.591 0 4.724 2.133 4.724 4.724v3.048z"></path></svg>`);
}
function Unlock($$renderer) {
  $$renderer.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 32"><path d="M21.333 10.667H19.81V7.619C19.81 3.429 16.38 0 12.19 0c-4.114 1.828-1.37 2.133.305 2.438 1.676.305 4.42 2.59 4.42 5.181v3.048H3.047A3.056 3.056 0 000 13.714v15.238A3.056 3.056 0 003.048 32h18.285a3.056 3.056 0 003.048-3.048V13.714a3.056 3.056 0 00-3.048-3.047zM12.19 24.533a3.056 3.056 0 01-3.047-3.047 3.056 3.056 0 013.047-3.048 3.056 3.056 0 013.048 3.048 3.056 3.056 0 01-3.048 3.047z"></path></svg>`);
}
function Controls($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      position = "bottom-left",
      orientation = "vertical",
      showZoom = true,
      showFitView = true,
      showLock = true,
      style,
      class: className,
      buttonBgColor,
      buttonBgColorHover,
      buttonColor,
      buttonColorHover,
      buttonBorderColor,
      fitViewOptions,
      children,
      before,
      after,
      $$slots,
      $$events,
      ...rest
    } = $$props;
    let store = useStore();
    const buttonProps = {
      bgColor: buttonBgColor,
      bgColorHover: buttonBgColorHover,
      color: buttonColor,
      colorHover: buttonColorHover,
      borderColor: buttonBorderColor
    };
    let isInteractive = store.nodesDraggable || store.nodesConnectable || store.elementsSelectable;
    let minZoomReached = store.viewport.zoom <= store.minZoom;
    let maxZoomReached = store.viewport.zoom >= store.maxZoom;
    let ariaLabelConfig = store.ariaLabelConfig;
    let orientationClass = orientation === "horizontal" ? "horizontal" : "vertical";
    const onZoomInHandler = () => {
      store.zoomIn();
    };
    const onZoomOutHandler = () => {
      store.zoomOut();
    };
    const onFitViewHandler = () => {
      store.fitView(fitViewOptions);
    };
    const onToggleInteractivity = () => {
      let interactive = !isInteractive;
      store.nodesDraggable = interactive;
      store.nodesConnectable = interactive;
      store.elementsSelectable = interactive;
    };
    Panel($$renderer2, spread_props([
      {
        class: ["svelte-flow__controls", orientationClass, className],
        position,
        "data-testid": "svelte-flow__controls",
        "aria-label": ariaLabelConfig["controls.ariaLabel"],
        style
      },
      rest,
      {
        children: ($$renderer3) => {
          if (before) {
            $$renderer3.push("<!--[-->");
            before($$renderer3);
            $$renderer3.push(`<!---->`);
          } else {
            $$renderer3.push("<!--[!-->");
          }
          $$renderer3.push(`<!--]--> `);
          if (showZoom) {
            $$renderer3.push("<!--[-->");
            ControlButton($$renderer3, spread_props([
              {
                onclick: onZoomInHandler,
                class: "svelte-flow__controls-zoomin",
                title: ariaLabelConfig["controls.zoomIn.ariaLabel"],
                "aria-label": ariaLabelConfig["controls.zoomIn.ariaLabel"],
                disabled: maxZoomReached
              },
              buttonProps,
              {
                children: ($$renderer4) => {
                  Plus($$renderer4);
                },
                $$slots: { default: true }
              }
            ]));
            $$renderer3.push(`<!----> `);
            ControlButton($$renderer3, spread_props([
              {
                onclick: onZoomOutHandler,
                class: "svelte-flow__controls-zoomout",
                title: ariaLabelConfig["controls.zoomOut.ariaLabel"],
                "aria-label": ariaLabelConfig["controls.zoomOut.ariaLabel"],
                disabled: minZoomReached
              },
              buttonProps,
              {
                children: ($$renderer4) => {
                  Minus($$renderer4);
                },
                $$slots: { default: true }
              }
            ]));
            $$renderer3.push(`<!---->`);
          } else {
            $$renderer3.push("<!--[!-->");
          }
          $$renderer3.push(`<!--]--> `);
          if (showFitView) {
            $$renderer3.push("<!--[-->");
            ControlButton($$renderer3, spread_props([
              {
                class: "svelte-flow__controls-fitview",
                onclick: onFitViewHandler,
                title: ariaLabelConfig["controls.fitView.ariaLabel"],
                "aria-label": ariaLabelConfig["controls.fitView.ariaLabel"]
              },
              buttonProps,
              {
                children: ($$renderer4) => {
                  Fit($$renderer4);
                },
                $$slots: { default: true }
              }
            ]));
          } else {
            $$renderer3.push("<!--[!-->");
          }
          $$renderer3.push(`<!--]--> `);
          if (showLock) {
            $$renderer3.push("<!--[-->");
            ControlButton($$renderer3, spread_props([
              {
                class: "svelte-flow__controls-interactive",
                onclick: onToggleInteractivity,
                title: ariaLabelConfig["controls.interactive.ariaLabel"],
                "aria-label": ariaLabelConfig["controls.interactive.ariaLabel"]
              },
              buttonProps,
              {
                children: ($$renderer4) => {
                  if (isInteractive) {
                    $$renderer4.push("<!--[-->");
                    Unlock($$renderer4);
                  } else {
                    $$renderer4.push("<!--[!-->");
                    Lock($$renderer4);
                  }
                  $$renderer4.push(`<!--]-->`);
                },
                $$slots: { default: true }
              }
            ]));
          } else {
            $$renderer3.push("<!--[!-->");
          }
          $$renderer3.push(`<!--]--> `);
          if (children) {
            $$renderer3.push("<!--[-->");
            children($$renderer3);
            $$renderer3.push(`<!---->`);
          } else {
            $$renderer3.push("<!--[!-->");
          }
          $$renderer3.push(`<!--]--> `);
          if (after) {
            $$renderer3.push("<!--[-->");
            after($$renderer3);
            $$renderer3.push(`<!---->`);
          } else {
            $$renderer3.push("<!--[!-->");
          }
          $$renderer3.push(`<!--]-->`);
        },
        $$slots: { default: true }
      }
    ]));
  });
}
var BackgroundVariant;
(function(BackgroundVariant2) {
  BackgroundVariant2["Lines"] = "lines";
  BackgroundVariant2["Dots"] = "dots";
  BackgroundVariant2["Cross"] = "cross";
})(BackgroundVariant || (BackgroundVariant = {}));
function DotPattern($$renderer, $$props) {
  let { radius, class: className } = $$props;
  $$renderer.push(`<circle${attr("cx", radius)}${attr("cy", radius)}${attr("r", radius)}${attr_class(clsx(["svelte-flow__background-pattern", "dots", className]))}></circle>`);
}
function LinePattern($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { lineWidth, dimensions, variant, class: className } = $$props;
    $$renderer2.push(`<path${attr("stroke-width", lineWidth)}${attr("d", `M${dimensions[0] / 2} 0 V${dimensions[1]} M0 ${dimensions[1] / 2} H${dimensions[0]}`)}${attr_class(clsx(["svelte-flow__background-pattern", variant, className]))}></path>`);
  });
}
const defaultSize = {
  [BackgroundVariant.Dots]: 1,
  [BackgroundVariant.Lines]: 1,
  [BackgroundVariant.Cross]: 6
};
function Background($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      id,
      variant = BackgroundVariant.Dots,
      gap = 20,
      size,
      lineWidth = 1,
      bgColor,
      patternColor,
      patternClass,
      class: className
    } = $$props;
    let store = useStore();
    let isDots = variant === BackgroundVariant.Dots;
    let isCross = variant === BackgroundVariant.Cross;
    let gapXY = Array.isArray(gap) ? gap : [gap, gap];
    let patternId = `background-pattern-${store.flowId}-${id ?? ""}`;
    let scaledGap = [
      gapXY[0] * store.viewport.zoom || 1,
      gapXY[1] * store.viewport.zoom || 1
    ];
    let scaledSize = (size ?? defaultSize[variant]) * store.viewport.zoom;
    let patternDimensions = isCross ? [scaledSize, scaledSize] : scaledGap;
    let patternOffset = isDots ? [scaledSize / 2, scaledSize / 2] : [patternDimensions[0] / 2, patternDimensions[1] / 2];
    $$renderer2.push(`<svg${attr_class(clsx([
      "svelte-flow__background",
      "svelte-flow__container",
      className
    ]))} data-testid="svelte-flow__background"${attr_style("", {
      "--xy-background-color-props": bgColor,
      "--xy-background-pattern-color-props": patternColor
    })}><pattern${attr("id", patternId)}${attr("x", store.viewport.x % scaledGap[0])}${attr("y", store.viewport.y % scaledGap[1])}${attr("width", scaledGap[0])}${attr("height", scaledGap[1])} patternUnits="userSpaceOnUse"${attr("patternTransform", `translate(-${patternOffset[0]},-${patternOffset[1]})`)}>`);
    if (isDots) {
      $$renderer2.push("<!--[-->");
      DotPattern($$renderer2, { radius: scaledSize / 2, class: patternClass });
    } else {
      $$renderer2.push("<!--[!-->");
      LinePattern($$renderer2, {
        dimensions: patternDimensions,
        variant,
        lineWidth,
        class: patternClass
      });
    }
    $$renderer2.push(`<!--]--></pattern><rect x="0" y="0" width="100%" height="100%"${attr("fill", `url(#${patternId})`)}></rect></svg>`);
  });
}
function useUpdateNodeInternals() {
  const { domNode, updateNodeInternals } = useStore();
  const nodeId = getContext("svelteflow__node_id");
  const updateInternals = (id) => {
    if (!id && !nodeId) {
      throw new Error("When using outside of a node, you must provide an id.");
    }
    const updateIds = id ? Array.isArray(id) ? id : [id] : [nodeId];
    const updates = /* @__PURE__ */ new Map();
    updateIds.forEach((updateId) => {
      const nodeElement = domNode?.querySelector(`.svelte-flow__node[data-id="${updateId}"]`);
      if (nodeElement) {
        updates.set(updateId, { id: updateId, nodeElement, force: true });
      }
    });
    requestAnimationFrame(() => updateNodeInternals(updates));
  };
  return updateInternals;
}
const PORT_COLORS = {
  nats_stream: "var(--port-pattern-stream)",
  // Blue-700
  nats_request: "var(--port-pattern-request)",
  // Purple-700
  kv_watch: "var(--port-pattern-watch)",
  // Emerald-700
  network: "var(--port-pattern-api)",
  // Orange-700
  file: "var(--port-pattern-file)"
  // Gray-700
};
const BORDER_PATTERNS = {
  required: "solid",
  optional: "dashed"
};
const PORT_ICONS = {
  nats_stream: "arrow-path-rounded-square",
  nats_request: "arrow-path",
  kv_watch: "eye",
  network: "server",
  file: "document-text"
};
function computePortVisualStyle(port) {
  let portType;
  switch (port.pattern) {
    case "stream":
      portType = "nats_stream";
      break;
    case "request":
      portType = "nats_request";
      break;
    case "watch":
      portType = "kv_watch";
      break;
    case "api":
      portType = "network";
      break;
    default:
      if (port.connection_id?.startsWith("file://")) {
        portType = "file";
      } else {
        portType = "network";
      }
  }
  const color = PORT_COLORS[portType];
  const borderPattern = port.required ? BORDER_PATTERNS.required : BORDER_PATTERNS.optional;
  const iconName = PORT_ICONS[portType];
  const typeLabel = portType.replace("_", " ");
  const directionLabel = port.direction === "input" ? "Input" : "Output";
  const requirementText = port.required ? "required" : "optional";
  const ariaLabel = `${typeLabel} ${directionLabel}: ${port.name} (${requirementText})`;
  const cssClasses = ["port-handle", `port-${portType}`, `port-${borderPattern}`];
  return {
    color,
    borderPattern,
    iconName,
    ariaLabel,
    cssClasses
  };
}
const DOMAIN_COLORS = {
  robotics: {
    color: "var(--domain-robotics)",
    label: "Robotics",
    description: "Autonomous vehicles and MAVLink processing"
  },
  semantic: {
    color: "var(--domain-semantic)",
    label: "Semantic Processing",
    description: "Knowledge graphs, rules, and reasoning"
  },
  network: {
    color: "var(--domain-network)",
    label: "Network I/O",
    description: "Data ingestion and output (UDP, WebSocket, HTTP)"
  },
  storage: {
    color: "var(--domain-storage)",
    label: "Storage",
    description: "Data persistence and retrieval"
  },
  // Future domains (reserved for expansion)
  telemetry: {
    color: "var(--domain-telemetry)",
    label: "Telemetry",
    description: "Metrics and observability"
  },
  geospatial: {
    color: "var(--domain-geospatial)",
    label: "Geospatial",
    description: "GIS, mapping, and location services"
  },
  media: {
    color: "var(--domain-media)",
    label: "Media",
    description: "Video, audio, and image processing"
  },
  integration: {
    color: "var(--domain-integration)",
    label: "Integration",
    description: "External system connectors"
  }
};
function getDomainColor(domain) {
  const metadata = DOMAIN_COLORS[domain];
  return metadata?.color || "var(--ui-border-subtle)";
}
function CustomFlowNode($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { $$slots, $$events, ...props } = $$props;
    const id = props.id;
    const data = props.data;
    useUpdateNodeInternals();
    const domainColor = getDomainColor(data.node.type || "network");
    const ports = [...data.input_ports || [], ...data.output_ports || []];
    $$renderer2.push(`<div class="custom-flow-node svelte-102d1ml"${attr(
      "data-node-id",
      // Update XYFlow internals when ports change
      // Notify XYFlow that this node's handles have changed
      id
    )}${attr("data-node-type", data.node.type)}${attr_style(`border-left: var(--canvas-node-domain-accent-width) solid ${stringify(domainColor)};`)}>`);
    if (ports.length === 0) {
      $$renderer2.push("<!--[-->");
      Handle($$renderer2, {
        type: "target",
        position: Position.Left,
        id: "nats_output",
        class: "nodrag",
        "data-port-name": "nats_output",
        "data-direction": "input"
      });
      $$renderer2.push(`<!----> `);
      Handle($$renderer2, {
        type: "target",
        position: Position.Left,
        id: "mavlink_input",
        class: "nodrag",
        "data-port-name": "mavlink_input",
        "data-direction": "input"
      });
      $$renderer2.push(`<!----> `);
      Handle($$renderer2, {
        type: "source",
        position: Position.Right,
        id: "nats_output",
        class: "nodrag",
        "data-port-name": "nats_output",
        "data-direction": "output"
      });
      $$renderer2.push(`<!----> `);
      Handle($$renderer2, {
        type: "source",
        position: Position.Right,
        id: "mavlink_input",
        class: "nodrag",
        "data-port-name": "mavlink_input",
        "data-direction": "output"
      });
      $$renderer2.push(`<!---->`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->  <!--[-->`);
    const each_array = ensure_array_like(ports.filter((p) => p.direction === "input"));
    for (let index = 0, $$length = each_array.length; index < $$length; index++) {
      let port = each_array[index];
      const style = computePortVisualStyle(port);
      const tooltipText = `${port.name} (${port.required ? "required" : "optional"}): ${port.description || port.connection_id}`;
      Handle($$renderer2, {
        type: "target",
        position: Position.Left,
        id: port.name,
        class: "port-handle port-handle-input",
        "data-required": port.required,
        "data-port-name": port.name,
        "data-tooltip": tooltipText,
        style: `top: ${stringify(50 + index * 35)}px; left: -6px; --port-color: ${stringify(style.color)};`
      });
    }
    $$renderer2.push(`<!--]--> <!--[-->`);
    const each_array_1 = ensure_array_like(ports.filter((p) => p.direction === "output"));
    for (let index = 0, $$length = each_array_1.length; index < $$length; index++) {
      let port = each_array_1[index];
      const style = computePortVisualStyle(port);
      const tooltipText = `${port.name} (${port.required ? "required" : "optional"}): ${port.description || port.connection_id}`;
      Handle($$renderer2, {
        type: "source",
        position: Position.Right,
        id: port.name,
        class: "port-handle port-handle-output",
        "data-required": port.required,
        "data-port-name": port.name,
        "data-tooltip": tooltipText,
        style: `top: ${stringify(50 + index * 35)}px; right: -6px; --port-color: ${stringify(style.color)};`
      });
    }
    $$renderer2.push(`<!--]--> <div class="node-content svelte-102d1ml"><div class="node-label svelte-102d1ml">${escape_html(data.label)}</div> <div class="port-summary svelte-102d1ml">${escape_html(ports.filter((p) => p.direction === "input").length)} inputs, ${escape_html(ports.filter((p) => p.direction === "output").length)} outputs</div></div></div>`);
  });
}
function ConnectionLine($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      id,
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
      data,
      markerEnd
    } = $$props;
    console.log("[ConnectionLine] Rendering edge:", id, "source:", sourceX, sourceY, "target:", targetX, targetY);
    const edgeClasses = () => {
      const classes = ["connection-line"];
      if (data?.source) {
        classes.push(`edge-${data.source}`);
      }
      if (data?.validationState) {
        classes.push(`edge-${data.validationState}`);
      }
      return classes.join(" ");
    };
    const [edgePath, _labelX, _labelY] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition
    });
    const strokeColor = () => {
      if (!data?.validationState) return void 0;
      switch (data.validationState) {
        case "error":
          return "var(--status-error)";
        case // CSS variable for error color
        "warning":
          return "var(--status-warning)";
        case // CSS variable for warning color
        "valid":
          return "var(--ui-interactive-primary)";
        default:
          return void 0;
      }
    };
    const strokeWidth = () => {
      if (!data?.validationState) return 2;
      switch (data.validationState) {
        case "error":
          return 3;
        case "warning":
          return 2;
        default:
          return 2;
      }
    };
    const strokeDasharray = data?.source === "auto" ? "5, 5" : void 0;
    $$renderer2.push(`<g${attr_class(clsx(edgeClasses()), "svelte-u12a0a")}${attr("data-connection-id", id)}${attr("data-source", data?.source)}${attr("data-validation-state", data?.validationState)}>`);
    BaseEdge($$renderer2, {
      path: edgePath,
      markerEnd,
      style: `stroke: ${stringify(strokeColor() || "#b1b1b7")}; stroke-width: ${stringify(strokeWidth())}; stroke-dasharray: ${stringify(strokeDasharray)};`
    });
    $$renderer2.push(`<!----></g>`);
  });
}
function convertToXYFlowNode(flowNode, onNodeClick) {
  return {
    id: flowNode.id,
    type: "custom",
    // Our custom node component
    position: flowNode.position,
    data: {
      label: flowNode.name || flowNode.type,
      node: flowNode,
      onNodeClick
    },
    // XYFlow properties for interactivity
    selectable: true,
    focusable: true,
    draggable: true,
    connectable: true
  };
}
function convertToFlowNode(xyflowNode) {
  return {
    id: xyflowNode.id,
    type: xyflowNode.data.node.type,
    name: xyflowNode.data.label,
    position: xyflowNode.position,
    config: xyflowNode.data.node.config
  };
}
function convertToXYFlowEdge(connection) {
  const style = {};
  if (connection.source === "auto") {
    style.strokeDasharray = "5, 5";
  }
  if (connection.validationState) {
    switch (connection.validationState) {
      case "error":
        style.stroke = "#dc3545";
        style.strokeWidth = 3;
        break;
      case "warning":
        style.stroke = "#ffc107";
        style.strokeWidth = 2;
        break;
      case "valid":
        style.stroke = "#0066cc";
        break;
    }
  }
  const styleString = Object.keys(style).length > 0 ? Object.entries(style).map(([key, value]) => `${key}: ${value}`).join("; ") : void 0;
  return {
    id: connection.id,
    source: connection.source_node_id,
    target: connection.target_node_id,
    sourceHandle: connection.source_port,
    targetHandle: connection.target_port,
    // type: edgeType,  // Omit to use XYFlow default
    data: {
      source: connection.source,
      validationState: connection.validationState,
      sourceNodeId: connection.source_node_id,
      sourcePort: connection.source_port,
      targetNodeId: connection.target_node_id,
      targetPort: connection.target_port
    },
    style: styleString
  };
}
function convertToFlowConnection(edge) {
  return {
    id: edge.id,
    source_node_id: edge.source,
    target_node_id: edge.target,
    source_port: edge.sourceHandle || "",
    target_port: edge.targetHandle || ""
  };
}
function convertFlowNodesToXYFlow(flowNodes, onNodeClick) {
  return flowNodes.map((node) => convertToXYFlowNode(node, onNodeClick));
}
function convertXYFlowNodesToFlow(xyflowNodes) {
  return xyflowNodes.map(convertToFlowNode);
}
function convertFlowConnectionsToXYFlow(connections) {
  return connections.map(convertToXYFlowEdge);
}
function convertXYFlowEdgesToFlow(edges) {
  return edges.map(convertToFlowConnection);
}
function FlowCanvas($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const nodeTypes = { custom: CustomFlowNode };
    const edgeTypes = {
      default: ConnectionLine,
      manual: ConnectionLine,
      auto: ConnectionLine
    };
    let {
      nodes = [],
      edges = [],
      onNodeClick,
      onConnectionCreate,
      runtimeState
    } = $$props;
    function handleNodeClick(event) {
      const domEvent = event.event;
      const target = domEvent?.target;
      console.log("[handleNodeClick] Clicked:", {
        tagName: target?.tagName,
        classes: target?.className,
        isHandle: target?.classList?.contains("svelte-flow__handle")
      });
      if (target?.classList?.contains("svelte-flow__handle") || target?.closest?.(".svelte-flow__handle")) {
        console.log("[handleNodeClick] Handle clicked - ignoring");
        return;
      }
      const node = event.node;
      if (!node || !node.id) {
        return;
      }
      console.log("[handleNodeClick] Opening config for node:", node.id);
      onNodeClick?.(node.id);
    }
    function validateConnection(connection) {
      const isDuplicate = edges.some((edge) => edge.source === connection.source && edge.target === connection.target && edge.sourceHandle === connection.sourceHandle && edge.targetHandle === connection.targetHandle);
      if (isDuplicate) {
        return "Connection already exists between these ports";
      }
      if (connection.source === connection.target) {
        return "Cannot connect a component to itself";
      }
      return null;
    }
    function handleConnect(connection) {
      console.log("[handleConnect] Creating manual connection:", connection.source, "→", connection.target);
      if (runtimeState === "running") {
        return;
      }
      if (!connection.source || !connection.target || !connection.sourceHandle || !connection.targetHandle) {
        return;
      }
      const validationError = validateConnection(connection);
      if (validationError) {
        console.log("[handleConnect] Rejected:", validationError);
        return;
      }
      const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const flowConnection = {
        id: connectionId,
        source_node_id: connection.source,
        source_port: connection.sourceHandle,
        target_node_id: connection.target,
        target_port: connection.targetHandle,
        source: "manual",
        validationState: "unknown"
        // Will be updated by validation
      };
      const xyflowEdge = convertToXYFlowEdge(flowConnection);
      edges = [...edges, xyflowEdge];
      console.log("[handleConnect] ✓ Manual connection created");
      onConnectionCreate?.();
    }
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<div id="flow-canvas" class="flow-canvas svelte-5kezjk" role="application" aria-label="Flow canvas for visual flow design">`);
      SvelteFlow($$renderer3, {
        nodeTypes,
        edgeTypes,
        fitView: true,
        nodesDraggable: true,
        nodesConnectable: true,
        nodeClickDistance: 0,
        onnodeclick: handleNodeClick,
        onconnect: handleConnect,
        get nodes() {
          return nodes;
        },
        set nodes($$value) {
          nodes = $$value;
          $$settled = false;
        },
        get edges() {
          return edges;
        },
        set edges($$value) {
          edges = $$value;
          $$settled = false;
        },
        children: ($$renderer4) => {
          Controls($$renderer4, {});
          $$renderer4.push(`<!----> `);
          Background($$renderer4, {});
          $$renderer4.push(`<!---->`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!----></div>`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
    bind_props($$props, { nodes, edges });
  });
}
function ComponentPalette($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let components = [];
    (() => {
      const groups = new SvelteMap();
      components.forEach((component) => {
        const category = component.category || "other";
        if (!groups.has(category)) {
          groups.set(category, []);
        }
        groups.get(category).push(component);
      });
      return groups;
    })();
    $$renderer2.push(`<div class="component-palette svelte-f0ohny"><header class="svelte-f0ohny"><h3 class="svelte-f0ohny">Components</h3></header> <div class="palette-content svelte-f0ohny">`);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="loading svelte-f0ohny">Loading components...</div>`);
    }
    $$renderer2.push(`<!--]--></div></div>`);
  });
}
function JsonEditor($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { config = {}, warning, parseError = null } = $$props;
    let jsonString = JSON.stringify(config, null, 2);
    $$renderer2.push(`<div class="json-editor svelte-1r0n3md">`);
    if (warning) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="warning svelte-1r0n3md" role="alert">⚠️ ${escape_html(warning)}</div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <label for="json-config" class="svelte-1r0n3md">Configuration (JSON)</label> <textarea id="json-config" rows="15"${attr("aria-invalid", parseError ? "true" : void 0)}${attr("aria-describedby", parseError ? "json-error" : void 0)} class="svelte-1r0n3md">`);
    const $$body = escape_html(jsonString);
    if ($$body) {
      $$renderer2.push(`${$$body}`);
    }
    $$renderer2.push(`</textarea> `);
    if (parseError) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<span class="error svelte-1r0n3md" id="json-error" role="alert">${escape_html(parseError)}</span>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <p class="help-text svelte-1r0n3md">Enter valid JSON configuration for this component.</p></div>`);
    bind_props($$props, { config, parseError });
  });
}
function ConfigPanel($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { component } = $$props;
    let editingConfig = {};
    let jsonParseError = null;
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      if (component) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<div class="config-panel svelte-wzegms"><header class="svelte-wzegms"><h3 class="svelte-wzegms">Configure: ${escape_html(component.type)}</h3> <button class="close-button svelte-wzegms" aria-label="Close">✕</button></header> <div class="panel-body svelte-wzegms"><div class="component-info svelte-wzegms"><div class="info-item svelte-wzegms"><span class="label svelte-wzegms">ID:</span> <span class="value svelte-wzegms">${escape_html(component.id)}</span></div> <div class="info-item svelte-wzegms"><span class="label svelte-wzegms">Type:</span> <span class="value svelte-wzegms">${escape_html(component.type)}</span></div> <div class="info-item svelte-wzegms"><span class="label svelte-wzegms">Name:</span> <span class="value svelte-wzegms">${escape_html(component.name)}</span></div> `);
        if (component.health) {
          $$renderer3.push("<!--[-->");
          $$renderer3.push(`<div class="info-item svelte-wzegms"><span class="label svelte-wzegms">Health:</span> <span${attr_class(`value ${stringify(component.health.status)}`, "svelte-wzegms")}>${escape_html(component.health.status)}</span></div>`);
        } else {
          $$renderer3.push("<!--[!-->");
        }
        $$renderer3.push(`<!--]--></div> `);
        {
          $$renderer3.push("<!--[!-->");
          {
            $$renderer3.push("<!--[!-->");
            {
              $$renderer3.push("<!--[!-->");
              JsonEditor($$renderer3, {
                warning: "Schema not available for this component type",
                get config() {
                  return editingConfig;
                },
                set config($$value) {
                  editingConfig = $$value;
                  $$settled = false;
                },
                get parseError() {
                  return jsonParseError;
                },
                set parseError($$value) {
                  jsonParseError = $$value;
                  $$settled = false;
                }
              });
              $$renderer3.push(`<!----> <footer class="svelte-wzegms"><button class="cancel-button svelte-wzegms">Cancel</button> <button class="save-button svelte-wzegms">Apply</button></footer>`);
            }
            $$renderer3.push(`<!--]-->`);
          }
          $$renderer3.push(`<!--]-->`);
        }
        $$renderer3.push(`<!--]--></div></div>`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]-->`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
  });
}
function StatusBar($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      runtimeState,
      showRuntimePanel = false
    } = $$props;
    const showDeploy = runtimeState.state === "not_deployed";
    const showStart = runtimeState.state === "deployed_stopped";
    const showStop = runtimeState.state === "running";
    const showDebugButton = runtimeState.state === "running";
    const isDeployDisabled = runtimeState.state !== "not_deployed";
    const deployTooltip = (() => {
      if (runtimeState.state !== "not_deployed") {
        return "Flow must be in not_deployed state";
      }
      return "Deploy this flow";
    })();
    $$renderer2.push(`<div class="status-bar svelte-1piydef" data-testid="status-bar"><div class="status-section svelte-1piydef"><span class="status-label svelte-1piydef">Runtime:</span> <span${attr_class(`runtime-state ${stringify(runtimeState.state)}`, "svelte-1piydef")}${attr("data-state", runtimeState.state)} aria-live="polite" aria-atomic="true">`);
    if (runtimeState.state === "running") {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<span class="state-icon svelte-1piydef" role="img" aria-label="Running">▶️</span>`);
    } else {
      $$renderer2.push("<!--[!-->");
      if (runtimeState.state === "deployed_stopped") {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<span class="state-icon svelte-1piydef" role="img" aria-label="Stopped">⏹️</span>`);
      } else {
        $$renderer2.push("<!--[!-->");
        if (runtimeState.state === "error") {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<span class="state-icon svelte-1piydef" role="img" aria-label="Error">🔴</span>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]-->`);
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--> ${escape_html(runtimeState.state)}</span></div> `);
    if (runtimeState.state === "error" && runtimeState.message) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="error-section svelte-1piydef" role="alert"><span class="error-icon svelte-1piydef">⚠</span> <span class="error-message svelte-1piydef">${escape_html(runtimeState.message)}</span></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (runtimeState.state === "running") {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="status-message svelte-1piydef" role="status">Cannot edit running flow</div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <div class="button-section svelte-1piydef">`);
    if (showDeploy) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<button class="deploy-button svelte-1piydef"${attr("disabled", isDeployDisabled, true)} aria-label="Deploy flow"${attr("title", deployTooltip)}>Deploy</button>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (showStart) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<button class="start-button svelte-1piydef"${attr("disabled", runtimeState.state !== "deployed_stopped", true)} aria-label="Start flow">Start</button>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (showStop) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<button class="stop-button svelte-1piydef"${attr("disabled", runtimeState.state !== "running", true)} aria-label="Stop flow">Stop</button>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (showDebugButton) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<button class="debug-button svelte-1piydef" aria-label="Toggle runtime panel" title="Toggle runtime panel (Ctrl+\`)" data-testid="debug-toggle-button">${escape_html(showRuntimePanel ? "▼" : "▲")} Debug</button>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div></div>`);
  });
}
function LogsTab($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let logs = [];
    let selectedLevel = "all";
    let selectedComponent = "all";
    let autoScroll = true;
    const uniqueComponents = Array.from(new Set(logs.map((log) => log.component))).sort();
    const filteredLogs = logs.filter((log) => {
      const componentMatch = selectedComponent === "all";
      return componentMatch;
    });
    function formatTimestamp(isoString) {
      try {
        const date = new Date(isoString);
        const hours = date.getHours().toString().padStart(2, "0");
        const minutes = date.getMinutes().toString().padStart(2, "0");
        const seconds = date.getSeconds().toString().padStart(2, "0");
        const milliseconds = date.getMilliseconds().toString().padStart(3, "0");
        return `${hours}:${minutes}:${seconds}.${milliseconds}`;
      } catch {
        return isoString;
      }
    }
    function getLevelColor(level) {
      const colors = {
        DEBUG: "var(--ui-text-secondary)",
        INFO: "var(--status-info)",
        WARN: "var(--status-warning)",
        ERROR: "var(--status-error)"
      };
      return colors[level];
    }
    $$renderer2.push(`<div class="logs-tab svelte-v3r1ht" data-testid="logs-tab"><div class="filter-bar svelte-v3r1ht"><div class="filter-controls svelte-v3r1ht"><label for="level-filter" class="svelte-v3r1ht"><span class="filter-label svelte-v3r1ht">Level:</span> `);
    $$renderer2.select(
      {
        id: "level-filter",
        value: (
          // Effect: Manage SSE connection lifecycle
          // Cleanup on unmount
          // Effect: Scroll to bottom when filtered logs change (if auto-scroll enabled)
          // Access filteredLogs to subscribe to changes
          selectedLevel
        ),
        "data-testid": "level-filter",
        class: ""
      },
      ($$renderer3) => {
        $$renderer3.option({ value: "all" }, ($$renderer4) => {
          $$renderer4.push(`All Levels`);
        });
        $$renderer3.option({ value: "DEBUG" }, ($$renderer4) => {
          $$renderer4.push(`DEBUG`);
        });
        $$renderer3.option({ value: "INFO" }, ($$renderer4) => {
          $$renderer4.push(`INFO`);
        });
        $$renderer3.option({ value: "WARN" }, ($$renderer4) => {
          $$renderer4.push(`WARN`);
        });
        $$renderer3.option({ value: "ERROR" }, ($$renderer4) => {
          $$renderer4.push(`ERROR`);
        });
      },
      "svelte-v3r1ht"
    );
    $$renderer2.push(`</label> <label for="component-filter" class="svelte-v3r1ht"><span class="filter-label svelte-v3r1ht">Component:</span> `);
    $$renderer2.select(
      {
        id: "component-filter",
        value: selectedComponent,
        "data-testid": "component-filter",
        class: ""
      },
      ($$renderer3) => {
        $$renderer3.option({ value: "all" }, ($$renderer4) => {
          $$renderer4.push(`All Components`);
        });
        $$renderer3.push(`<!--[-->`);
        const each_array = ensure_array_like(uniqueComponents);
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          let component = each_array[$$index];
          $$renderer3.option({ value: component }, ($$renderer4) => {
            $$renderer4.push(`${escape_html(component)}`);
          });
        }
        $$renderer3.push(`<!--]-->`);
      },
      "svelte-v3r1ht"
    );
    $$renderer2.push(`</label> <button class="clear-button svelte-v3r1ht" data-testid="clear-logs-button" aria-label="Clear all logs">Clear</button></div> <div class="auto-scroll-control svelte-v3r1ht"><label for="auto-scroll" class="svelte-v3r1ht"><input type="checkbox" id="auto-scroll"${attr("checked", autoScroll, true)} data-testid="auto-scroll-toggle" class="svelte-v3r1ht"/> <span>Auto-scroll</span></label></div></div> `);
    {
      $$renderer2.push("<!--[!-->");
      {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--> <div class="log-container svelte-v3r1ht" data-testid="log-container">`);
    if (filteredLogs.length === 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="empty-state svelte-v3r1ht">`);
      if (logs.length === 0) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<p class="svelte-v3r1ht">No logs yet. Waiting for runtime events...</p>`);
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`<p class="svelte-v3r1ht">No logs match current filters.</p>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<div class="log-entries svelte-v3r1ht" role="log" aria-live="polite" aria-atomic="false"><!--[-->`);
      const each_array_1 = ensure_array_like(filteredLogs);
      for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
        let log = each_array_1[$$index_1];
        $$renderer2.push(`<div class="log-entry svelte-v3r1ht"${attr("data-level", log.level)} data-testid="log-entry"><span class="log-timestamp svelte-v3r1ht">${escape_html(formatTimestamp(log.timestamp))}</span> <span class="log-level svelte-v3r1ht"${attr_style(`color: ${stringify(getLevelColor(log.level))}`)}>${escape_html(log.level)}</span> <span class="log-component svelte-v3r1ht">[${escape_html(log.component)}]</span> <span class="log-message svelte-v3r1ht">${escape_html(log.message)}</span></div>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    }
    $$renderer2.push(`<!--]--></div></div>`);
  });
}
function RuntimePanel($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { isOpen = false, height = 300 } = $$props;
    let activeTab = "logs";
    if (isOpen) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="runtime-panel svelte-1v0suwy"${attr_style(`height: ${stringify(height)}px;`)} data-testid="runtime-panel"><header class="svelte-1v0suwy"><div class="header-content svelte-1v0suwy"><h3 class="svelte-1v0suwy">Runtime Debugging</h3> <div class="tab-nav svelte-1v0suwy" role="tablist" aria-label="Runtime debugging tabs"><button role="tab" id="tab-logs"${attr("aria-selected", activeTab === "logs")} aria-controls="logs-panel"${attr_class("tab-button svelte-1v0suwy", void 0, { "active": activeTab === "logs" })} data-testid="tab-logs">Logs</button> <button role="tab" id="tab-messages"${attr("aria-selected", activeTab === "messages")} aria-controls="messages-panel"${attr_class("tab-button svelte-1v0suwy", void 0, { "active": activeTab === "messages" })} data-testid="tab-messages">Messages</button> <button role="tab" id="tab-metrics"${attr("aria-selected", activeTab === "metrics")} aria-controls="metrics-panel"${attr_class("tab-button svelte-1v0suwy", void 0, { "active": activeTab === "metrics" })} data-testid="tab-metrics">Metrics</button> <button role="tab" id="tab-health"${attr("aria-selected", activeTab === "health")} aria-controls="health-panel"${attr_class("tab-button svelte-1v0suwy", void 0, { "active": activeTab === "health" })} data-testid="tab-health">Health</button></div></div> <button class="close-button svelte-1v0suwy" aria-label="Close runtime panel">✕</button></header> <div class="panel-body svelte-1v0suwy">`);
      {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div id="logs-panel" role="tabpanel" aria-labelledby="tab-logs" class="tab-content svelte-1v0suwy" data-testid="logs-panel">`);
        LogsTab($$renderer2);
        $$renderer2.push(`<!----></div>`);
      }
      $$renderer2.push(`<!--]--></div></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
function SaveStatusIndicator($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { saveState, onSave } = $$props;
    function formatTime(date) {
      if (!date) return "";
      return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" }).format(date);
    }
    const statusConfig = (() => {
      switch (saveState.status) {
        case "clean":
          return { text: "Valid", icon: "✓", class: "status-clean" };
        case "draft":
          return {
            text: `Draft - ${saveState.error || "has errors"}`,
            icon: "⚠",
            class: "status-draft"
          };
        case "dirty":
          return { text: "Unsaved changes", icon: "●", class: "status-dirty" };
        case "saving":
          return { text: "Saving...", icon: "⟳", class: "status-saving" };
        case "error":
          return { text: "Save failed", icon: "⚠", class: "status-error" };
      }
    })();
    const validationStatusDisplay = (() => {
      {
        return {
          text: "Validating...",
          icon: "⟳",
          class: "validation-validating"
        };
      }
    })();
    $$renderer2.push(`<div id="save-status" class="save-status-indicator save-status svelte-djbjik"${attr("data-status", saveState.status)}><div class="status-content svelte-djbjik">`);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<button type="button"${attr_class(`validation-status ${stringify(validationStatusDisplay.class)}`, "svelte-djbjik")} data-testid="validation-status" aria-label="View validation details"><span class="status-icon svelte-djbjik">${escape_html(validationStatusDisplay.icon)}</span> <span class="status-text svelte-djbjik">${escape_html(validationStatusDisplay.text)}</span></button>`);
    }
    $$renderer2.push(`<!--]--> `);
    if (saveState.status === "draft") {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<span${attr_class(`status-icon ${stringify(statusConfig.class)}`, "svelte-djbjik")}${attr("aria-label", statusConfig.text)} role="img">${escape_html(statusConfig.icon)}</span> <span class="status-text svelte-djbjik">${escape_html(statusConfig.text)}</span>`);
    } else {
      $$renderer2.push("<!--[!-->");
      if (saveState.status === "dirty") {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<span${attr_class(`status-icon ${stringify(statusConfig.class)}`, "svelte-djbjik")}${attr("aria-label", statusConfig.text)} role="img">${escape_html(statusConfig.icon)}</span> <span class="status-text svelte-djbjik">${escape_html(statusConfig.text)}</span>`);
      } else {
        $$renderer2.push("<!--[!-->");
        if (saveState.status === "saving") {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<span${attr_class(`status-icon ${stringify(statusConfig.class)}`, "svelte-djbjik")}${attr("aria-label", statusConfig.text)} role="img">${escape_html(statusConfig.icon)}</span> <span class="status-text svelte-djbjik">${escape_html(statusConfig.text)}</span>`);
        } else {
          $$renderer2.push("<!--[!-->");
          if (saveState.status === "error") {
            $$renderer2.push("<!--[-->");
            $$renderer2.push(`<span${attr_class(`status-icon ${stringify(statusConfig.class)}`, "svelte-djbjik")}${attr("aria-label", statusConfig.text)} role="img">${escape_html(statusConfig.icon)}</span> <span class="status-text svelte-djbjik">${escape_html(statusConfig.text)}</span>`);
          } else {
            $$renderer2.push("<!--[!-->");
          }
          $$renderer2.push(`<!--]-->`);
        }
        $$renderer2.push(`<!--]-->`);
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--> `);
    if (saveState.lastSaved && (saveState.status === "clean" || saveState.status === "draft")) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<span class="timestamp svelte-djbjik">saved at ${escape_html(formatTime(saveState.lastSaved))}</span>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (onSave) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<button type="button" class="save-button svelte-djbjik"${attr("disabled", saveState.status === "clean" || saveState.status === "draft" || saveState.status === "saving", true)} aria-label="Save flow">Save</button>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div> `);
    if (saveState.status === "error" && saveState.error) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="error-message svelte-djbjik" role="alert">${escape_html(saveState.error)}</div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
function NavigationGuard($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      saveState,
      showDialog = false,
      onShowDialog,
      onNavigationAllowed
    } = $$props;
    let pendingNavigation = null;
    function allowNavigation() {
      if (pendingNavigation) {
        pendingNavigation.url;
        pendingNavigation = null;
        showDialog = false;
        onShowDialog?.(false);
        onNavigationAllowed?.();
        goto();
      }
    }
    function cancelNavigation() {
      pendingNavigation = null;
      showDialog = false;
      onShowDialog?.(false);
    }
    bind_props($$props, { showDialog, allowNavigation, cancelNavigation });
  });
}
function NavigationDialog($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { isOpen } = $$props;
    if (isOpen) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="dialog-overlay svelte-1nrguxe" role="dialog" aria-modal="true" aria-labelledby="navigation-dialog-title" tabindex="-1"><div class="dialog-content svelte-1nrguxe"><h2 id="navigation-dialog-title" class="svelte-1nrguxe">You have unsaved changes</h2> <p class="svelte-1nrguxe">You have unsaved changes. Are you sure you want to leave?</p> <div class="dialog-actions svelte-1nrguxe"><button type="button" class="button-save svelte-1nrguxe">Save Changes</button> <button type="button" class="button-discard svelte-1nrguxe">Discard Changes</button> <button type="button" class="button-cancel svelte-1nrguxe">Cancel</button></div></div></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
function ValidationErrorDialog($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { isOpen, validationResult } = $$props;
    function groupByComponent(issues) {
      const grouped = new SvelteMap();
      for (const issue of issues) {
        const key = issue.component_name;
        if (!grouped.has(key)) {
          grouped.set(key, []);
        }
        grouped.get(key).push(issue);
      }
      return grouped;
    }
    let errorsByComponent = validationResult ? groupByComponent(validationResult.errors) : new SvelteMap();
    let warningsByComponent = validationResult ? groupByComponent(validationResult.warnings) : new SvelteMap();
    if (isOpen && validationResult) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="dialog-overlay svelte-pna667" role="dialog" aria-modal="true" aria-labelledby="dialog-title" tabindex="-1"><div class="dialog-content svelte-pna667"><header class="dialog-header svelte-pna667"><h2 id="dialog-title" class="svelte-pna667">Flow Validation Failed</h2> <button class="close-button svelte-pna667" aria-label="Close dialog">×</button></header> <div class="dialog-body svelte-pna667">`);
      if (validationResult.errors.length > 0) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<section class="errors-section svelte-pna667"><h3 class="svelte-pna667">❌ Errors (${escape_html(validationResult.errors.length)})</h3> <p class="section-description svelte-pna667">These issues must be fixed before deployment:</p> <!--[-->`);
        const each_array = ensure_array_like([...errorsByComponent.entries()]);
        for (let $$index_2 = 0, $$length = each_array.length; $$index_2 < $$length; $$index_2++) {
          let [componentName, issues] = each_array[$$index_2];
          $$renderer2.push(`<div class="issue-group svelte-pna667"><h4 class="svelte-pna667">${escape_html(componentName)}</h4> <ul class="svelte-pna667"><!--[-->`);
          const each_array_1 = ensure_array_like(issues);
          for (let idx = 0, $$length2 = each_array_1.length; idx < $$length2; idx++) {
            let issue = each_array_1[idx];
            $$renderer2.push(`<li class="error-item svelte-pna667"><div class="issue-message svelte-pna667">`);
            if (issue.port_name) {
              $$renderer2.push("<!--[-->");
              $$renderer2.push(`<strong>${escape_html(issue.port_name)}:</strong>`);
            } else {
              $$renderer2.push("<!--[!-->");
            }
            $$renderer2.push(`<!--]--> ${escape_html(issue.message)}</div> `);
            if (issue.suggestions && issue.suggestions.length > 0) {
              $$renderer2.push("<!--[-->");
              $$renderer2.push(`<div class="suggestions svelte-pna667"><strong>Suggestions:</strong> <ul class="svelte-pna667"><!--[-->`);
              const each_array_2 = ensure_array_like(issue.suggestions);
              for (let suggIdx = 0, $$length3 = each_array_2.length; suggIdx < $$length3; suggIdx++) {
                let suggestion = each_array_2[suggIdx];
                $$renderer2.push(`<li class="svelte-pna667">${escape_html(suggestion)}</li>`);
              }
              $$renderer2.push(`<!--]--></ul></div>`);
            } else {
              $$renderer2.push("<!--[!-->");
            }
            $$renderer2.push(`<!--]--></li>`);
          }
          $$renderer2.push(`<!--]--></ul></div>`);
        }
        $$renderer2.push(`<!--]--></section>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> `);
      if (validationResult.warnings.length > 0) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<section class="warnings-section svelte-pna667"><h3 class="svelte-pna667">⚠️ Warnings (${escape_html(validationResult.warnings.length)})</h3> <p class="section-description svelte-pna667">These issues won't block deployment but should be reviewed:</p> <!--[-->`);
        const each_array_3 = ensure_array_like([...warningsByComponent.entries()]);
        for (let $$index_5 = 0, $$length = each_array_3.length; $$index_5 < $$length; $$index_5++) {
          let [componentName, issues] = each_array_3[$$index_5];
          $$renderer2.push(`<div class="issue-group svelte-pna667"><h4 class="svelte-pna667">${escape_html(componentName)}</h4> <ul class="svelte-pna667"><!--[-->`);
          const each_array_4 = ensure_array_like(issues);
          for (let idx = 0, $$length2 = each_array_4.length; idx < $$length2; idx++) {
            let issue = each_array_4[idx];
            $$renderer2.push(`<li class="warning-item svelte-pna667"><div class="issue-message svelte-pna667">`);
            if (issue.port_name) {
              $$renderer2.push("<!--[-->");
              $$renderer2.push(`<strong>${escape_html(issue.port_name)}:</strong>`);
            } else {
              $$renderer2.push("<!--[!-->");
            }
            $$renderer2.push(`<!--]--> ${escape_html(issue.message)}</div> `);
            if (issue.suggestions && issue.suggestions.length > 0) {
              $$renderer2.push("<!--[-->");
              $$renderer2.push(`<div class="suggestions svelte-pna667"><strong>Suggestions:</strong> <ul class="svelte-pna667"><!--[-->`);
              const each_array_5 = ensure_array_like(issue.suggestions);
              for (let suggIdx = 0, $$length3 = each_array_5.length; suggIdx < $$length3; suggIdx++) {
                let suggestion = each_array_5[suggIdx];
                $$renderer2.push(`<li class="svelte-pna667">${escape_html(suggestion)}</li>`);
              }
              $$renderer2.push(`<!--]--></ul></div>`);
            } else {
              $$renderer2.push("<!--[!-->");
            }
            $$renderer2.push(`<!--]--></li>`);
          }
          $$renderer2.push(`<!--]--></ul></div>`);
        }
        $$renderer2.push(`<!--]--></section>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--></div> <footer class="dialog-footer svelte-pna667"><button class="primary-button svelte-pna667">Close and Edit Flow</button></footer></div></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
function DeployErrorModal($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const errorsByComponent = (() => {
      return new SvelteMap();
    })();
    (() => {
      return Array.from(errorsByComponent.entries());
    })();
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
function ValidationStatusModal($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    {
      $$renderer2.push("<!--[!-->");
      {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]-->`);
  });
}
class ValidationError extends Error {
  constructor(message, validationResult) {
    super(message);
    this.validationResult = validationResult;
    this.name = "ValidationError";
  }
}
async function saveFlow(flowId, data) {
  const response = await fetch(`/flowbuilder/flows/${flowId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Save failed");
  }
  return await response.json();
}
async function deployFlow(flowId) {
  const response = await fetch(`/flowbuilder/deployment/${flowId}/deploy`, {
    method: "POST"
  });
  if (!response.ok) {
    const error = await response.json();
    if (error.validation_result) {
      const validationError = new ValidationError(
        error.error || "Flow validation failed",
        error.validation_result
      );
      throw validationError;
    }
    throw new Error(error.error || "Deploy failed");
  }
  return await response.json();
}
function isValidationError(error) {
  return error instanceof ValidationError;
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    let backendFlow = data.flow;
    let dirty = false;
    let selectedComponent = null;
    let showNavigationDialog = false;
    let navigationGuard;
    let shouldNavigateAfterSave = false;
    let showValidationDialog = false;
    let deployValidationResult = null;
    let pendingDeploy = false;
    let saveState = { status: "clean", lastSaved: null, error: null };
    let runtimeState = {
      state: data.flow.runtime_state,
      message: null,
      lastTransition: null
    };
    let showRuntimePanel = false;
    let runtimePanelHeight = 300;
    function handleNodeClick(nodeId) {
      const xyflowNode = xyflowNodes.find((n) => n.id === nodeId);
      if (xyflowNode) {
        selectedComponent = {
          ...xyflowNode.data.node,
          health: { status: "not_running", lastUpdated: (/* @__PURE__ */ new Date()).toISOString() }
        };
      }
    }
    let xyflowNodes = convertFlowNodesToXYFlow(backendFlow.nodes, handleNodeClick);
    let xyflowEdges = convertFlowConnectionsToXYFlow(backendFlow.connections);
    xyflowNodes.length;
    xyflowEdges.length;
    async function runFlowValidation(flowId) {
      try {
        const flowNodes = convertXYFlowNodesToFlow(xyflowNodes);
        const flowDefinition = {
          id: flowId,
          name: backendFlow.name,
          runtime_state: backendFlow.runtime_state,
          nodes: flowNodes,
          connections: convertXYFlowEdgesToFlow(xyflowEdges)
        };
        console.log("[runFlowValidation] Sending node IDs to validation:", flowNodes.map((n) => n.id));
        const response = await fetch(`/flowbuilder/flows/${flowId}/validate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(flowDefinition)
        });
        if (!response.ok) {
          console.error("Validation request failed:", response.status, response.statusText);
          return null;
        }
        const result = await response.json();
        return result;
      } catch (error) {
        console.error("Validation failed:", error);
        return null;
      }
    }
    let saveInProgress = false;
    async function handleSave() {
      if (saveInProgress) {
        return;
      }
      saveInProgress = true;
      saveState = { ...saveState, status: "saving" };
      try {
        const validation = await runFlowValidation(backendFlow.id);
        const updated = await saveFlow(backendFlow.id, {
          id: backendFlow.id,
          name: backendFlow.name,
          description: backendFlow.description,
          version: backendFlow.version,
          runtime_state: backendFlow.runtime_state,
          nodes: convertXYFlowNodesToFlow(xyflowNodes),
          connections: convertXYFlowEdgesToFlow(xyflowEdges)
        });
        backendFlow = {
          ...backendFlow,
          version: updated.version,
          runtime_state: updated.runtime_state,
          updated_at: updated.updated_at
        };
        dirty = false;
        if (validation?.validation_status === "errors") {
          saveState = {
            status: "draft",
            lastSaved: /* @__PURE__ */ new Date(),
            error: `${validation.errors.length} error${validation.errors.length > 1 ? "s" : ""}`,
            validationResult: validation
          };
        } else {
          saveState = {
            status: "clean",
            lastSaved: /* @__PURE__ */ new Date(),
            error: null,
            validationResult: validation
          };
        }
        if (runtimeState.state !== updated.runtime_state) {
          runtimeState = {
            state: updated.runtime_state,
            message: null,
            lastTransition: /* @__PURE__ */ new Date()
          };
        }
        if (pendingDeploy) {
          pendingDeploy = false;
          await handleDeploy();
        }
        if (shouldNavigateAfterSave) {
          shouldNavigateAfterSave = false;
          navigationGuard?.allowNavigation();
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Save failed";
        saveState = { ...saveState, status: "error", error: message };
        pendingDeploy = false;
        shouldNavigateAfterSave = false;
      } finally {
        saveInProgress = false;
      }
    }
    async function handleDeploy() {
      if (dirty) {
        pendingDeploy = true;
        await handleSave();
        return;
      }
      try {
        const updated = await deployFlow(backendFlow.id);
        backendFlow = {
          ...backendFlow,
          runtime_state: updated.runtime_state,
          updated_at: updated.updated_at
        };
        runtimeState = {
          state: updated.runtime_state,
          message: null,
          lastTransition: /* @__PURE__ */ new Date()
        };
      } catch (err) {
        if (isValidationError(err)) {
          deployValidationResult = err.validationResult;
          showValidationDialog = true;
          runtimeState = { ...runtimeState, state: "not_deployed", message: null };
        } else {
          const message = err instanceof Error ? err.message : "Deploy failed";
          runtimeState = { ...runtimeState, state: "error", message };
        }
      }
    }
    const headerHeight = 70;
    const statusBarHeight = 50;
    const canvasHeight = `calc(100vh - ${headerHeight}px - ${statusBarHeight}px)`;
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head($$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>${escape_html(backendFlow?.name || "Flow Editor")} - SemStreams</title>`);
        });
      });
      NavigationGuard($$renderer3, {
        saveState,
        get showDialog() {
          return showNavigationDialog;
        },
        set showDialog($$value) {
          showNavigationDialog = $$value;
          $$settled = false;
        }
      });
      $$renderer3.push(`<!----> `);
      NavigationDialog($$renderer3, {
        isOpen: showNavigationDialog
      });
      $$renderer3.push(`<!----> `);
      ValidationErrorDialog($$renderer3, {
        isOpen: showValidationDialog,
        validationResult: deployValidationResult
      });
      $$renderer3.push(`<!----> `);
      DeployErrorModal($$renderer3);
      $$renderer3.push(`<!----> `);
      ValidationStatusModal($$renderer3);
      $$renderer3.push(`<!----> <div class="editor-layout svelte-1dk9wgy"><aside class="palette-sidebar svelte-1dk9wgy">`);
      ComponentPalette($$renderer3);
      $$renderer3.push(`<!----></aside> <main class="canvas-area svelte-1dk9wgy"><header class="editor-header svelte-1dk9wgy"><div class="header-content svelte-1dk9wgy"><a href="/" data-sveltekit-reload="" class="back-button svelte-1dk9wgy" aria-label="Back to flows">← Flows</a> <div class="header-text svelte-1dk9wgy"><h1 class="svelte-1dk9wgy">${escape_html(backendFlow?.name || "Loading...")}</h1> `);
      if (backendFlow?.description) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<p class="svelte-1dk9wgy">${escape_html(backendFlow.description)}</p>`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--></div> `);
      SaveStatusIndicator($$renderer3, {
        saveState,
        onSave: handleSave
      });
      $$renderer3.push(`<!----></div></header> <div class="canvas-container svelte-1dk9wgy"${attr_style(`height: ${stringify(canvasHeight)};`)}>`);
      FlowCanvas($$renderer3, {
        onNodeClick: handleNodeClick,
        onConnectionCreate: () => {
          dirty = true;
          saveState = { ...saveState, status: "dirty" };
        },
        runtimeState: backendFlow.runtime_state,
        get nodes() {
          return xyflowNodes;
        },
        set nodes($$value) {
          xyflowNodes = $$value;
          $$settled = false;
        },
        get edges() {
          return xyflowEdges;
        },
        set edges($$value) {
          xyflowEdges = $$value;
          $$settled = false;
        }
      });
      $$renderer3.push(`<!----></div> `);
      StatusBar($$renderer3, {
        runtimeState,
        showRuntimePanel
      });
      $$renderer3.push(`<!----> `);
      RuntimePanel($$renderer3, {
        isOpen: showRuntimePanel,
        height: runtimePanelHeight,
        flowId: backendFlow.id
      });
      $$renderer3.push(`<!----></main> `);
      if (selectedComponent) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<aside class="config-sidebar svelte-1dk9wgy">`);
        ConfigPanel($$renderer3, {
          component: selectedComponent
        });
        $$renderer3.push(`<!----></aside>`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--></div>`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
  });
}
export {
  _page as default
};
