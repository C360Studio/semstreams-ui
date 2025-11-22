import { e as escape_html } from "../../../chunks/context.js";
import "clsx";
import { S as SvelteFlow } from "../../../chunks/style.js";
import { T as TestNode } from "../../../chunks/TestNode.js";
function _page($$renderer) {
  const nodeTypes = { withHandles: TestNode };
  let nodes = [
    {
      id: "1",
      position: { x: 100, y: 100 },
      data: { label: "Node 1 (no handles)" }
    },
    {
      id: "2",
      position: { x: 300, y: 100 },
      data: { label: "Node 2 (no handles)" }
    },
    // Test 2: Nodes WITH handles (testing if this works)
    {
      id: "3",
      type: "withHandles",
      position: { x: 100, y: 300 },
      data: { label: "Node 3 (with handles)" }
    },
    {
      id: "4",
      type: "withHandles",
      position: { x: 300, y: 300 },
      data: { label: "Node 4 (with handles)" }
    }
  ];
  let edges = [];
  console.log("[TEST PAGE] Initial nodes:", nodes.length);
  console.log("[TEST PAGE] Initial edges:", edges.length);
  setTimeout(
    () => {
      console.log("[TEST PAGE] Updating node data AND adding edges (simulating validation)");
      nodes = nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          updated: true
          // Simulate data change
        }
      }));
      edges = [
        { id: "e1-2", source: "1", target: "2" },
        {
          id: "e3-4",
          source: "3",
          target: "4",
          sourceHandle: "out",
          targetHandle: "in"
        }
      ];
      console.log("[TEST PAGE] Nodes updated:", nodes.length, "Edges added:", edges.length);
    },
    1e3
  );
  $$renderer.push(`<div style="width: 100vw; height: 100vh; background: #f0f0f0;"><h1 style="position: absolute; top: 10px; left: 10px; z-index: 10;">XYFlow Minimal Test - Nodes: ${escape_html(nodes.length)}, Edges: ${escape_html(edges.length)}</h1> `);
  SvelteFlow($$renderer, { nodes, edges, nodeTypes });
  $$renderer.push(`<!----></div>`);
}
export {
  _page as default
};
