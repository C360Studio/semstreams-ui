import { e as escape_html } from "../../../chunks/context.js";
import "clsx";
import { S as SvelteFlow } from "../../../chunks/style.js";
import { P as bind_props } from "../../../chunks/index2.js";
import { T as TestNode } from "../../../chunks/TestNode.js";
function TestCanvas($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { nodes = [], edges = [] } = $$props;
    const nodeTypes = { withHandles: TestNode };
    console.log("[TestCanvas] Rendering with nodes:", nodes.length, "edges:", edges.length);
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<div style="width: 100%; height: 100%; background: #f8f9fa;">`);
      SvelteFlow($$renderer3, {
        nodeTypes,
        fitView: true,
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
        }
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
function _page($$renderer) {
  let nodes = [
    {
      id: "1",
      position: { x: 100, y: 100 },
      data: { label: "Node 1" }
    },
    {
      id: "2",
      position: { x: 300, y: 100 },
      data: { label: "Node 2" }
    },
    {
      id: "3",
      type: "withHandles",
      position: { x: 100, y: 300 },
      data: { label: "Node 3 (handles)" }
    },
    {
      id: "4",
      type: "withHandles",
      position: { x: 300, y: 300 },
      data: { label: "Node 4 (handles)" }
    }
  ];
  let edges = [];
  console.log("[WRAPPED TEST] Initial setup - nodes:", nodes.length, "edges:", edges.length);
  setTimeout(
    () => {
      console.log("[WRAPPED TEST] Adding edges via state update");
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
      console.log("[WRAPPED TEST] Edges added:", edges.length);
    },
    1e3
  );
  let $$settled = true;
  let $$inner_renderer;
  function $$render_inner($$renderer2) {
    $$renderer2.push(`<div style="width: 100vw; height: 100vh;"><h1 style="position: absolute; top: 10px; left: 10px; z-index: 10;">Wrapped Test - Nodes: ${escape_html(nodes.length)}, Edges: ${escape_html(edges.length)}</h1> `);
    TestCanvas($$renderer2, {
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
      }
    });
    $$renderer2.push(`<!----></div>`);
  }
  do {
    $$settled = true;
    $$inner_renderer = $$renderer.copy();
    $$render_inner($$inner_renderer);
  } while (!$$settled);
  $$renderer.subsume($$inner_renderer);
}
export {
  _page as default
};
