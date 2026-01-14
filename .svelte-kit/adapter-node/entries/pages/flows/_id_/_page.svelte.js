import { F as attr_class, y as attr, G as stringify, z as ensure_array_like, J as attr_style, K as bind_props, x as head } from "../../../../chunks/index2.js";
import "d3";
import { e as escape_html } from "../../../../chunks/context.js";
import "clsx";
import { g as goto } from "../../../../chunks/client.js";
const DEFAULT_CONFIG = {
  nodeWidth: 200,
  nodeHeight: 80,
  horizontalSpacing: 100,
  verticalSpacing: 60,
  padding: 50
};
function layoutNodes(nodes, connections, config = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  if (nodes.length === 0) {
    return [];
  }
  const incomingEdges = /* @__PURE__ */ new Map();
  const outgoingEdges = /* @__PURE__ */ new Map();
  for (const node of nodes) {
    incomingEdges.set(node.id, []);
    outgoingEdges.set(node.id, []);
  }
  for (const conn of connections) {
    const incoming = incomingEdges.get(conn.target_node_id);
    if (incoming) {
      incoming.push(conn.source_node_id);
    }
    const outgoing = outgoingEdges.get(conn.source_node_id);
    if (outgoing) {
      outgoing.push(conn.target_node_id);
    }
  }
  const columns = /* @__PURE__ */ new Map();
  const visited = /* @__PURE__ */ new Set();
  function assignColumn(nodeId) {
    if (columns.has(nodeId)) {
      return columns.get(nodeId);
    }
    if (visited.has(nodeId)) {
      return 0;
    }
    visited.add(nodeId);
    const incoming = incomingEdges.get(nodeId) || [];
    if (incoming.length === 0) {
      columns.set(nodeId, 0);
      return 0;
    }
    const maxParentCol = Math.max(...incoming.map((id) => assignColumn(id)));
    const col = maxParentCol + 1;
    columns.set(nodeId, col);
    return col;
  }
  for (const node of nodes) {
    assignColumn(node.id);
  }
  const columnGroups = /* @__PURE__ */ new Map();
  for (const node of nodes) {
    const col = columns.get(node.id) || 0;
    if (!columnGroups.has(col)) {
      columnGroups.set(col, []);
    }
    columnGroups.get(col).push(node);
  }
  const layoutNodes2 = [];
  for (const [col, colNodes] of columnGroups) {
    const x = cfg.padding + col * (cfg.nodeWidth + cfg.horizontalSpacing);
    colNodes.forEach((node, rowIndex) => {
      const y = cfg.padding + rowIndex * (cfg.nodeHeight + cfg.verticalSpacing);
      layoutNodes2.push({
        id: node.id,
        type: node.type,
        name: node.name,
        x,
        y,
        width: cfg.nodeWidth,
        height: cfg.nodeHeight,
        config: node.config,
        original: node
      });
    });
  }
  return layoutNodes2;
}
function layoutEdges(connections, layoutNodes2) {
  const nodeMap = /* @__PURE__ */ new Map();
  for (const node of layoutNodes2) {
    nodeMap.set(node.id, node);
  }
  return connections.map((conn) => {
    const sourceNode = nodeMap.get(conn.source_node_id);
    const targetNode = nodeMap.get(conn.target_node_id);
    if (!sourceNode || !targetNode) {
      return null;
    }
    const sourceX = sourceNode.x + sourceNode.width;
    const sourceY = sourceNode.y + sourceNode.height / 2;
    const targetX = targetNode.x;
    const targetY = targetNode.y + targetNode.height / 2;
    return {
      id: conn.id,
      sourceNodeId: conn.source_node_id,
      sourcePort: conn.source_port,
      targetNodeId: conn.target_node_id,
      targetPort: conn.target_port,
      sourceX,
      sourceY,
      targetX,
      targetY,
      original: conn
    };
  }).filter((edge) => edge !== null);
}
function calculateCanvasBounds(layoutNodes2, padding = 50) {
  if (layoutNodes2.length === 0) {
    return { width: 800, height: 600 };
  }
  let maxX = 0;
  let maxY = 0;
  for (const node of layoutNodes2) {
    maxX = Math.max(maxX, node.x + node.width);
    maxY = Math.max(maxY, node.y + node.height);
  }
  return {
    width: maxX + padding,
    height: maxY + padding
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
function FlowNode($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      node,
      inputPorts = [],
      outputPorts = [],
      selected = false
    } = $$props;
    const domainColor = getDomainColor(node.type || "network");
    const portSpacing = 20;
    const portRadius = 6;
    const accentWidth = 4;
    const inputPortPositions = inputPorts.map((port, index) => ({
      port,
      x: 0,
      y: 30 + index * portSpacing,
      style: computePortVisualStyle(port)
    }));
    const outputPortPositions = outputPorts.map((port, index) => ({
      port,
      x: node.width,
      y: 30 + index * portSpacing,
      style: computePortVisualStyle(port)
    }));
    $$renderer2.push(`<g${attr_class("flow-node svelte-12wvdkg", void 0, { "selected": selected })}${attr("data-node-id", node.id)}${attr("data-node-type", node.type)}${attr("transform", `translate(${stringify(node.x)}, ${stringify(node.y)})`)} role="button" tabindex="0"${attr("aria-label", `Flow node: ${stringify(node.name)}. Click to edit.`)}><rect class="node-background svelte-12wvdkg" x="0" y="0"${attr("width", node.width)}${attr("height", node.height)} rx="8" ry="8"></rect><rect class="node-accent" x="0" y="0"${attr("width", accentWidth)}${attr("height", node.height)} rx="8" ry="0"${attr("fill", domainColor)}></rect><rect class="node-accent-cover"${attr("x", accentWidth - 2)} y="0" width="4"${attr("height", node.height)}${attr("fill", domainColor)}></rect><text class="node-label svelte-12wvdkg"${attr("x", accentWidth + 12)} y="24">${escape_html(node.name)}</text><text class="node-type svelte-12wvdkg"${attr("x", accentWidth + 12)} y="42">${escape_html(node.type)}</text><text class="port-summary svelte-12wvdkg"${attr("x", accentWidth + 12)}${attr("y", node.height - 12)}>${escape_html(inputPorts.length)} in, ${escape_html(outputPorts.length)} out</text><!--[-->`);
    const each_array = ensure_array_like(inputPortPositions);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let { port, x, y, style } = each_array[$$index];
      $$renderer2.push(`<circle${attr_class("port port-input svelte-12wvdkg", void 0, { "port-required": port.required })}${attr("data-port-name", port.name)}${attr("cx", x)}${attr("cy", y)}${attr("r", portRadius)}${attr("fill", port.required ? style.color : "var(--pico-background-color)")}${attr("stroke", style.color)} stroke-width="2"><title>${escape_html(port.name)} (${escape_html(port.required ? "required" : "optional")})</title></circle>`);
    }
    $$renderer2.push(`<!--]--><!--[-->`);
    const each_array_1 = ensure_array_like(outputPortPositions);
    for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
      let { port, x, y, style } = each_array_1[$$index_1];
      $$renderer2.push(`<circle${attr_class("port port-output svelte-12wvdkg", void 0, { "port-required": port.required })}${attr("data-port-name", port.name)}${attr("cx", x)}${attr("cy", y)}${attr("r", portRadius)}${attr("fill", port.required ? style.color : "var(--pico-background-color)")}${attr("stroke", style.color)} stroke-width="2"><title>${escape_html(port.name)} (${escape_html(port.required ? "required" : "optional")})</title></circle>`);
    }
    $$renderer2.push(`<!--]--></g>`);
  });
}
const PATH_STYLES = {
  valid: {
    stroke: "var(--pico-primary)",
    strokeWidth: 2,
    strokeDasharray: "",
    showArrow: true
  },
  error: {
    stroke: "var(--pico-del-color, #c62828)",
    strokeWidth: 2,
    strokeDasharray: "5,5",
    showArrow: true
  },
  warning: {
    stroke: "var(--pico-mark-background-color, #ff9800)",
    strokeWidth: 2,
    strokeDasharray: "5,5",
    showArrow: true
  },
  auto: {
    stroke: "var(--pico-secondary)",
    strokeWidth: 2,
    strokeDasharray: "3,3",
    showArrow: true
  }
};
function generateBezierPath(sourceX, sourceY, targetX, targetY) {
  const dx = Math.abs(targetX - sourceX);
  const controlOffset = Math.min(dx * 0.5, 100);
  const c1x = sourceX + controlOffset;
  const c1y = sourceY;
  const c2x = targetX - controlOffset;
  const c2y = targetY;
  return `M ${sourceX} ${sourceY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${targetX} ${targetY}`;
}
function edgeToPath(edge) {
  return generateBezierPath(edge.sourceX, edge.sourceY, edge.targetX, edge.targetY);
}
function getPathStyle(edge) {
  const conn = edge.original;
  if (conn.validationState === "error") {
    return PATH_STYLES.error;
  }
  if (conn.validationState === "warning") {
    return PATH_STYLES.warning;
  }
  if (conn.source === "auto") {
    return PATH_STYLES.auto;
  }
  return PATH_STYLES.valid;
}
function FlowEdge($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { edge, selected = false, markerId = "arrow" } = $$props;
    const path = edgeToPath(edge);
    const style = getPathStyle(edge);
    const isAuto = edge.original.source === "auto";
    $$renderer2.push(`<g${attr_class("flow-edge svelte-17hph7n", void 0, { "selected": selected, "auto": isAuto })}${attr("data-connection-id", edge.id)}${attr("data-source", isAuto ? "auto" : "manual")}><path class="edge-hitbox"${attr("d", path)} stroke="transparent" stroke-width="20" fill="none"></path><path class="edge-path svelte-17hph7n"${attr("d", path)}${attr("stroke", style.stroke)}${attr("stroke-width", style.strokeWidth)}${attr("stroke-dasharray", style.strokeDasharray)} fill="none"${attr("marker-end", style.showArrow ? `url(#${markerId})` : void 0)}></path>`);
    if (edge.original.validationState === "error" || edge.original.validationState === "warning") {
      $$renderer2.push("<!--[-->");
      const midX = (edge.sourceX + edge.targetX) / 2;
      const midY = (edge.sourceY + edge.targetY) / 2;
      $$renderer2.push(`<g${attr("transform", `translate(${stringify(midX)}, ${stringify(midY)})`)}><circle class="edge-status-indicator svelte-17hph7n" r="8"${attr("fill", edge.original.validationState === "error" ? "var(--pico-del-color)" : "var(--pico-mark-background-color)")}></circle><text class="edge-status-icon svelte-17hph7n" text-anchor="middle" dominant-baseline="central" fill="white" font-size="12">${escape_html(edge.original.validationState === "error" ? "!" : "?")}</text>`);
      if (edge.original.validationMessage) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<title>${escape_html(edge.original.validationMessage)}</title>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--></g>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></g>`);
  });
}
function FlowCanvas($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      nodes,
      connections,
      portsMap = {},
      selectedNodeId = null
    } = $$props;
    let transform = { x: 0, y: 0, k: 1 };
    const layoutedNodes = layoutNodes(nodes, connections);
    const layoutedEdges = layoutEdges(connections, layoutedNodes);
    calculateCanvasBounds(layoutedNodes);
    function getNodePorts(nodeId) {
      const ports = portsMap[nodeId];
      return {
        input: ports?.input_ports || [],
        output: ports?.output_ports || []
      };
    }
    const arrowMarkers = [
      { id: "arrow-default", color: "var(--pico-primary)" },
      { id: "arrow-error", color: "var(--pico-del-color)" },
      {
        id: "arrow-warning",
        color: "var(--pico-mark-background-color)"
      },
      { id: "arrow-auto", color: "var(--pico-secondary)" }
    ];
    $$renderer2.push(`<div class="flow-canvas-container svelte-5kezjk"><svg id="flow-canvas" class="flow-canvas svelte-5kezjk" role="img" aria-label="Flow diagram"><defs><!--[-->`);
    const each_array = ensure_array_like(arrowMarkers);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let marker = each_array[$$index];
      $$renderer2.push(`<marker${attr("id", marker.id)} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z"${attr("fill", marker.color)}></path></marker>`);
    }
    $$renderer2.push(`<!--]--></defs><g class="canvas-content"${attr("transform", `translate(${stringify(transform.x)}, ${stringify(transform.y)}) scale(${stringify(transform.k)})`)}><defs><pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--pico-muted-border-color)" stroke-width="0.5" opacity="0.5"></path></pattern></defs><rect x="-5000" y="-5000" width="10000" height="10000" fill="url(#grid)"></rect><!--[-->`);
    const each_array_1 = ensure_array_like(layoutedEdges);
    for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
      let edge = each_array_1[$$index_1];
      FlowEdge($$renderer2, { edge, markerId: "arrow-default" });
    }
    $$renderer2.push(`<!--]--><!--[-->`);
    const each_array_2 = ensure_array_like(layoutedNodes);
    for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
      let node = each_array_2[$$index_2];
      const ports = getNodePorts(node.id);
      FlowNode($$renderer2, {
        node,
        inputPorts: ports.input,
        outputPorts: ports.output,
        selected: selectedNodeId === node.id
      });
    }
    $$renderer2.push(`<!--]--></g></svg> <div class="canvas-controls svelte-5kezjk"><button type="button" class="control-button svelte-5kezjk" aria-label="Zoom in">+</button> <button type="button" class="control-button svelte-5kezjk" aria-label="Zoom out">−</button> <button type="button" class="control-button svelte-5kezjk" aria-label="Fit to content">⊡</button></div> `);
    if (nodes.length === 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="empty-state svelte-5kezjk"><p class="svelte-5kezjk">No components in this flow.</p> <p class="hint svelte-5kezjk">Add components using the sidebar or describe your flow to the AI.</p></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
function getComponentDomain(type) {
  const normalizedType = type.toLowerCase();
  if (normalizedType.includes("mavlink") || normalizedType.includes("telemetry") || normalizedType.includes("drone") || normalizedType.includes("vehicle")) {
    return "robotics";
  }
  if (normalizedType.includes("udp") || normalizedType.includes("websocket") || normalizedType.includes("http") || normalizedType.includes("tcp") || normalizedType.includes("input") || normalizedType.includes("output")) {
    return "network";
  }
  if (normalizedType.includes("json") || normalizedType.includes("transform") || normalizedType.includes("processor") || normalizedType.includes("filter") || normalizedType.includes("parser") || normalizedType.includes("semantic") || normalizedType.includes("rule")) {
    return "semantic";
  }
  if (normalizedType.includes("storage") || normalizedType.includes("database") || normalizedType.includes("writer") || normalizedType.includes("reader") || normalizedType.includes("persist")) {
    return "storage";
  }
  if (normalizedType.includes("geo") || normalizedType.includes("map") || normalizedType.includes("location") || normalizedType.includes("gis")) {
    return "geospatial";
  }
  if (normalizedType.includes("video") || normalizedType.includes("audio") || normalizedType.includes("image") || normalizedType.includes("media")) {
    return "media";
  }
  if (normalizedType.includes("api") || normalizedType.includes("connector") || normalizedType.includes("integration")) {
    return "integration";
  }
  return "network";
}
function ComponentCard($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { node, selected = false } = $$props;
    const domainColor = getDomainColor(getComponentDomain(node.type));
    $$renderer2.push(`<div${attr_class("component-card svelte-2nqj9l", void 0, { "selected": selected })}${attr_style(`border-left: 4px solid ${stringify(domainColor)}`)} role="button" tabindex="0"${attr("aria-label", node.name)}${attr("aria-pressed", selected)}><div class="card-content svelte-2nqj9l"><div class="card-header svelte-2nqj9l"><h4 class="component-name svelte-2nqj9l">${escape_html(node.name || node.id)}</h4></div> <div class="component-type svelte-2nqj9l">Type: ${escape_html(node.type)}</div></div> <div class="card-actions svelte-2nqj9l"><button class="action-button edit-button svelte-2nqj9l"${attr("aria-label", `Edit ${stringify(node.name)}`)} title="Edit component">⚙️</button> <button class="action-button delete-button svelte-2nqj9l"${attr("aria-label", `Delete ${stringify(node.name)}`)} title="Delete component">🗑️</button></div></div>`);
  });
}
function ComponentList($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      nodes,
      selectedNodeId = null
    } = $$props;
    let searchQuery = "";
    const filteredNodes = (() => {
      if (!searchQuery.trim()) {
        return nodes;
      }
      const query = searchQuery.toLowerCase().trim();
      return nodes.filter((node) => node.name.toLowerCase().includes(query) || node.type.toLowerCase().includes(query));
    })();
    $$renderer2.push(`<div class="component-list svelte-i468xr"><header class="list-header svelte-i468xr"><h3 class="svelte-i468xr">Components (${escape_html(filteredNodes.length)})</h3> <button class="add-button svelte-i468xr" aria-label="Add component" title="Add new component">+ Add</button></header> <div class="search-section svelte-i468xr"><label for="component-search" class="visually-hidden svelte-i468xr">Search components</label> <input id="component-search" type="text" class="search-input svelte-i468xr" placeholder="Search components..."${attr("value", searchQuery)} aria-label="Search components"/></div> <div class="list-content svelte-i468xr">`);
    if (nodes.length === 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="empty-state svelte-i468xr"><p class="empty-message svelte-i468xr">No components yet</p> <p class="empty-hint svelte-i468xr">Add a component to get started</p></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
      if (filteredNodes.length === 0) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="empty-state svelte-i468xr"><p class="empty-message svelte-i468xr">No components found</p> <p class="empty-hint svelte-i468xr">Try a different search term</p></div>`);
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`<ul class="component-list-items svelte-i468xr" role="list" aria-live="polite"><!--[-->`);
        const each_array = ensure_array_like(filteredNodes);
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          let node = each_array[$$index];
          $$renderer2.push(`<li role="listitem" class="svelte-i468xr">`);
          ComponentCard($$renderer2, {
            node,
            selected: node.id === selectedNodeId
          });
          $$renderer2.push(`<!----></li>`);
        }
        $$renderer2.push(`<!--]--></ul>`);
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></div></div>`);
  });
}
const SvelteMap = globalThis.Map;
function AddComponentModal($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { componentTypes } = $$props;
    let selectedTypeId = "";
    componentTypes.find((ct) => ct.id === selectedTypeId) || null;
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
function EditComponentModal($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
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
function AIPromptInput($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      disabled = false,
      loading = false,
      placeholder = "Describe your flow in natural language...",
      maxLength = 2e3
    } = $$props;
    let promptText = "";
    let trimmedPrompt = promptText.trim();
    let charCount = promptText.length;
    let isValid = trimmedPrompt.length > 0 && charCount <= maxLength;
    let isSubmitDisabled = !isValid || disabled || loading;
    let nearLimit = charCount >= maxLength * 0.95;
    let atLimit = charCount >= maxLength;
    let exceedsLimit = charCount > maxLength;
    let submitButtonText = loading ? "Generating..." : "Generate Flow";
    $$renderer2.push(`<div class="ai-prompt-input svelte-1mc16ro"><div class="input-container svelte-1mc16ro"><textarea${attr("placeholder", placeholder)}${attr("disabled", disabled || loading, true)} aria-label="Describe your flow in natural language"${attr("aria-disabled", disabled || loading)} rows="5" class="svelte-1mc16ro">`);
    const $$body = escape_html(promptText);
    if ($$body) {
      $$renderer2.push(`${$$body}`);
    }
    $$renderer2.push(`</textarea> `);
    if (exceedsLimit) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="validation-message error svelte-1mc16ro" role="alert">Prompt exceeds maximum length of ${escape_html(maxLength)} characters</div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <div class="character-count svelte-1mc16ro" aria-live="polite"><span${attr_class("svelte-1mc16ro", void 0, { "warning": nearLimit, "error": atLimit && !exceedsLimit })}>${escape_html(charCount)}`);
    if (maxLength) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`/ ${escape_html(maxLength)}`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></span></div></div> <div class="actions svelte-1mc16ro"><button type="button"${attr("disabled", isSubmitDisabled, true)}${attr("aria-busy", loading)} class="primary svelte-1mc16ro">`);
    if (loading) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<span class="spinner svelte-1mc16ro" role="status" aria-label="Loading"></span>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> ${escape_html(submitButtonText)}</button> <button type="button"${attr("disabled", disabled || loading, true)} class="svelte-1mc16ro">Cancel</button></div></div>`);
  });
}
function AIFlowPreview($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      isOpen = false,
      flow = null,
      validationResult = null,
      loading = false,
      error = null
    } = $$props;
    let hasErrors = validationResult?.errors && validationResult.errors.length > 0;
    let hasWarnings = validationResult?.warnings && validationResult.warnings.length > 0;
    let isValid = validationResult?.validation_status === "valid";
    let canApply = !hasErrors && flow !== null && !loading;
    let nodeCount = flow?.nodes?.length ?? 0;
    let connectionCount = flow?.connections?.length ?? 0;
    function getConnectionText(connection) {
      const sourceName = flow?.nodes?.find((n) => n.id === connection.source_node_id)?.name || "Unknown";
      const targetName = flow?.nodes?.find((n) => n.id === connection.target_node_id)?.name || "Unknown";
      return `${sourceName} (${connection.source_port}) → ${targetName} (${connection.target_port})`;
    }
    if (isOpen) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="modal-backdrop backdrop svelte-1f3rfsi" role="presentation"><dialog open aria-modal="true" aria-label="Generated Flow Preview" class="svelte-1f3rfsi"><article class="svelte-1f3rfsi"><header class="svelte-1f3rfsi"><h2 class="svelte-1f3rfsi">Generated Flow Preview</h2> <button type="button" class="close svelte-1f3rfsi"${attr("disabled", loading, true)} aria-label="Close">✕</button></header> <div class="modal-content svelte-1f3rfsi">`);
      if (loading) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="loading-state svelte-1f3rfsi" role="status" aria-live="polite"><div class="spinner svelte-1f3rfsi"></div> <p>Generating flow...</p></div>`);
      } else {
        $$renderer2.push("<!--[!-->");
        if (error) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<div class="error-state svelte-1f3rfsi" role="alert"><div class="error-icon svelte-1f3rfsi">⚠️</div> <h3 class="svelte-1f3rfsi">Error</h3> <p>${escape_html(error)}</p></div>`);
        } else {
          $$renderer2.push("<!--[!-->");
          if (flow) {
            $$renderer2.push("<!--[-->");
            if (flow.description) {
              $$renderer2.push("<!--[-->");
              $$renderer2.push(`<section class="flow-description svelte-1f3rfsi"><p>${escape_html(flow.description)}</p></section>`);
            } else {
              $$renderer2.push("<!--[!-->");
            }
            $$renderer2.push(`<!--]--> <section class="flow-section svelte-1f3rfsi"><h3 class="svelte-1f3rfsi">Components (${escape_html(nodeCount)})</h3> `);
            if (nodeCount === 0) {
              $$renderer2.push("<!--[-->");
              $$renderer2.push(`<p class="empty-state svelte-1f3rfsi">No components in this flow</p>`);
            } else {
              $$renderer2.push("<!--[!-->");
              $$renderer2.push(`<ul class="node-list svelte-1f3rfsi"><!--[-->`);
              const each_array = ensure_array_like(flow.nodes);
              for (let index = 0, $$length = each_array.length; index < $$length; index++) {
                let node = each_array[index];
                $$renderer2.push(`<li class="svelte-1f3rfsi"><div><strong class="node-name">${escape_html(node.name)}</strong> <span class="node-type svelte-1f3rfsi">(${escape_html(node.type)})</span></div> `);
                if (Object.keys(node.config || {}).length > 0) {
                  $$renderer2.push("<!--[-->");
                  $$renderer2.push(`<div class="node-config svelte-1f3rfsi"><!--[-->`);
                  const each_array_1 = ensure_array_like(Object.entries(node.config));
                  for (let $$index = 0, $$length2 = each_array_1.length; $$index < $$length2; $$index++) {
                    let [key, value] = each_array_1[$$index];
                    $$renderer2.push(`<div class="config-item svelte-1f3rfsi">${escape_html(key)}: ${escape_html(JSON.stringify(value))}</div>`);
                  }
                  $$renderer2.push(`<!--]--></div>`);
                } else {
                  $$renderer2.push("<!--[!-->");
                }
                $$renderer2.push(`<!--]--></li>`);
              }
              $$renderer2.push(`<!--]--></ul>`);
            }
            $$renderer2.push(`<!--]--></section> <section class="flow-section svelte-1f3rfsi"><h3 class="svelte-1f3rfsi">Connections (${escape_html(connectionCount)})</h3> `);
            if (connectionCount === 0) {
              $$renderer2.push("<!--[-->");
              $$renderer2.push(`<p class="empty-state svelte-1f3rfsi">No connections in this flow</p>`);
            } else {
              $$renderer2.push("<!--[!-->");
              $$renderer2.push(`<ul class="connection-list svelte-1f3rfsi"><!--[-->`);
              const each_array_2 = ensure_array_like(flow.connections);
              for (let index = 0, $$length = each_array_2.length; index < $$length; index++) {
                let connection = each_array_2[index];
                $$renderer2.push(`<li class="svelte-1f3rfsi">${escape_html(getConnectionText(connection))}</li>`);
              }
              $$renderer2.push(`<!--]--></ul>`);
            }
            $$renderer2.push(`<!--]--></section> `);
            if (validationResult) {
              $$renderer2.push("<!--[-->");
              $$renderer2.push(`<section class="validation-section svelte-1f3rfsi"><h3 class="svelte-1f3rfsi">Validation</h3> `);
              if (isValid) {
                $$renderer2.push("<!--[-->");
                $$renderer2.push(`<div class="validation-success svelte-1f3rfsi"><span class="icon svelte-1f3rfsi">✓</span> <span>Flow is valid</span></div>`);
              } else {
                $$renderer2.push("<!--[!-->");
              }
              $$renderer2.push(`<!--]--> `);
              if (hasErrors) {
                $$renderer2.push("<!--[-->");
                $$renderer2.push(`<div class="validation-errors svelte-1f3rfsi"><h4 class="svelte-1f3rfsi"><span class="icon">✗</span> ${escape_html(validationResult.errors.length)} Error${escape_html(validationResult.errors.length !== 1 ? "s" : "")}</h4> <ul class="svelte-1f3rfsi"><!--[-->`);
                const each_array_3 = ensure_array_like(validationResult.errors);
                for (let index = 0, $$length = each_array_3.length; index < $$length; index++) {
                  let errorItem = each_array_3[index];
                  $$renderer2.push(`<li${attr("data-node-id", errorItem.component_name)} data-severity="error" class="svelte-1f3rfsi"><strong>${escape_html(errorItem.component_name)}</strong> `);
                  if (errorItem.port_name) {
                    $$renderer2.push("<!--[-->");
                    $$renderer2.push(`<span class="port-name svelte-1f3rfsi">(${escape_html(errorItem.port_name)})</span>`);
                  } else {
                    $$renderer2.push("<!--[!-->");
                  }
                  $$renderer2.push(`<!--]--> : ${escape_html(errorItem.message)}</li>`);
                }
                $$renderer2.push(`<!--]--></ul></div>`);
              } else {
                $$renderer2.push("<!--[!-->");
              }
              $$renderer2.push(`<!--]--> `);
              if (hasWarnings) {
                $$renderer2.push("<!--[-->");
                $$renderer2.push(`<div class="validation-warnings svelte-1f3rfsi"><h4 class="svelte-1f3rfsi"><span class="icon">⚠</span> ${escape_html(validationResult.warnings.length)} Warning${escape_html(validationResult.warnings.length !== 1 ? "s" : "")}</h4> <ul class="svelte-1f3rfsi"><!--[-->`);
                const each_array_4 = ensure_array_like(validationResult.warnings);
                for (let index = 0, $$length = each_array_4.length; index < $$length; index++) {
                  let warning = each_array_4[index];
                  $$renderer2.push(`<li${attr("data-node-id", warning.component_name)} data-severity="warning" class="svelte-1f3rfsi"><strong>${escape_html(warning.component_name)}</strong> `);
                  if (warning.port_name) {
                    $$renderer2.push("<!--[-->");
                    $$renderer2.push(`<span class="port-name svelte-1f3rfsi">(${escape_html(warning.port_name)})</span>`);
                  } else {
                    $$renderer2.push("<!--[!-->");
                  }
                  $$renderer2.push(`<!--]--> : ${escape_html(warning.message)}</li>`);
                }
                $$renderer2.push(`<!--]--></ul></div>`);
              } else {
                $$renderer2.push("<!--[!-->");
              }
              $$renderer2.push(`<!--]--></section>`);
            } else {
              $$renderer2.push("<!--[!-->");
            }
            $$renderer2.push(`<!--]-->`);
          } else {
            $$renderer2.push("<!--[!-->");
            $$renderer2.push(`<div class="empty-state svelte-1f3rfsi"><p>No flow to preview</p></div>`);
          }
          $$renderer2.push(`<!--]-->`);
        }
        $$renderer2.push(`<!--]-->`);
      }
      $$renderer2.push(`<!--]--></div> <footer class="svelte-1f3rfsi">`);
      if (error) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<button type="button" class="svelte-1f3rfsi">Retry</button>`);
      } else {
        $$renderer2.push("<!--[!-->");
        if (!loading) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<button type="button"${attr("disabled", !canApply, true)} class="primary svelte-1f3rfsi">Apply to Canvas</button> <button type="button" class="svelte-1f3rfsi">Reject</button> <button type="button" class="svelte-1f3rfsi">Retry</button>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]-->`);
      }
      $$renderer2.push(`<!--]--></footer></article></dialog></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
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
    let componentTypes = [];
    let showNavigationDialog = false;
    let navigationGuard;
    let shouldNavigateAfterSave = false;
    let showValidationDialog = false;
    let deployValidationResult = null;
    let showAIPreview = false;
    let aiLoading = false;
    let aiGeneratedFlow = null;
    let aiValidationResult = null;
    let aiError = null;
    let pendingDeploy = false;
    let saveState = { status: "clean", lastSaved: null, error: null };
    let runtimeState = {
      state: data.flow.runtime_state,
      message: null,
      lastTransition: null
    };
    let showRuntimePanel = false;
    let runtimePanelHeight = 300;
    let flowNodes = backendFlow.nodes;
    let flowConnections = backendFlow.connections;
    let portsMap = {};
    flowNodes.length;
    flowConnections.length;
    async function runFlowValidation(flowId) {
      try {
        const flowDefinition = {
          id: flowId,
          name: backendFlow.name,
          runtime_state: backendFlow.runtime_state,
          nodes: flowNodes,
          connections: flowConnections
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
          nodes: flowNodes,
          connections: flowConnections
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
    const aiPromptHeight = 180;
    const statusBarHeight = 50;
    const canvasHeight = `calc(100vh - ${headerHeight}px - ${aiPromptHeight}px - ${statusBarHeight}px)`;
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
      $$renderer3.push(`<!----> `);
      AIFlowPreview($$renderer3, {
        isOpen: showAIPreview,
        flow: aiGeneratedFlow,
        validationResult: aiValidationResult,
        loading: aiLoading,
        error: aiError
      });
      $$renderer3.push(`<!----> <div class="editor-layout svelte-1dk9wgy"><aside class="palette-sidebar svelte-1dk9wgy">`);
      ComponentList($$renderer3, {
        nodes: flowNodes,
        selectedNodeId: null
      });
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
      $$renderer3.push(`<!----></div></header> <div class="ai-prompt-section svelte-1dk9wgy">`);
      AIPromptInput($$renderer3, {
        loading: aiLoading,
        disabled: aiLoading
      });
      $$renderer3.push(`<!----></div> <div class="canvas-container svelte-1dk9wgy"${attr_style(`height: ${stringify(canvasHeight)};`)}>`);
      FlowCanvas($$renderer3, {
        nodes: flowNodes,
        connections: flowConnections,
        portsMap,
        selectedNodeId: null
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
      $$renderer3.push(`<!----></main></div> `);
      AddComponentModal($$renderer3, {
        componentTypes
      });
      $$renderer3.push(`<!----> `);
      EditComponentModal($$renderer3);
      $$renderer3.push(`<!---->`);
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
