import { e as escape_html } from "./context.js";
import "clsx";
import { H as Handle } from "./style.js";
import { Position } from "@xyflow/system";
function TestNode($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    $$renderer2.push(`<div class="test-node svelte-63il2t">`);
    Handle($$renderer2, {
      type: "target",
      position: Position.Left,
      id: "in",
      style: "background: #555;"
    });
    $$renderer2.push(`<!----> <div>${escape_html(data.label)}</div> `);
    Handle($$renderer2, {
      type: "source",
      position: Position.Right,
      id: "out",
      style: "background: #555;"
    });
    $$renderer2.push(`<!----></div>`);
  });
}
export {
  TestNode as T
};
