import { z as ensure_array_like, F as attr_class, G as stringify, x as head } from "../../chunks/index2.js";
import "@sveltejs/kit/internal";
import "../../chunks/exports.js";
import "../../chunks/utils.js";
import { e as escape_html } from "../../chunks/context.js";
import "clsx";
import "@sveltejs/kit/internal/server";
import "../../chunks/state.svelte.js";
function FlowList($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { flows } = $$props;
    $$renderer2.push(`<div class="flow-list svelte-fcx454"><header class="svelte-fcx454"><h2>Flows</h2> <button aria-label="Create New Flow">Create New Flow</button></header> `);
    if (flows.length === 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="empty-state svelte-fcx454"><p>No flows yet. Create your first flow to get started.</p></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<div class="flow-grid svelte-fcx454"><!--[-->`);
      const each_array = ensure_array_like(flows);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let flow = each_array[$$index];
        $$renderer2.push(`<button class="flow-card svelte-fcx454"><h3 class="svelte-fcx454">${escape_html(flow.name)}</h3> `);
        if (flow.description) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<p class="description svelte-fcx454">${escape_html(flow.description)}</p>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--> <span${attr_class(`runtime-state ${stringify(flow.runtime_state)}`, "svelte-fcx454")}>${escape_html(flow.runtime_state)}</span></button>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    let backendHealthy = null;
    head($$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>SemStreams - Flow Builder</title>`);
      });
    });
    $$renderer2.push(`<main class="svelte-1uha8ag"><div class="page-header svelte-1uha8ag"><h1 class="svelte-1uha8ag">Visual Flow Builder</h1> <p class="svelte-1uha8ag">Create and manage semantic stream processing flows</p></div> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (data.error && backendHealthy !== false) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="error-banner svelte-1uha8ag"><strong class="svelte-1uha8ag">Error:</strong> ${escape_html(data.error)}</div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    FlowList($$renderer2, {
      flows: data.flows
    });
    $$renderer2.push(`<!----></main>`);
  });
}
export {
  _page as default
};
