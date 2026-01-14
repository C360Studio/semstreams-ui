

export const index = 3;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/flows/_id_/_page.svelte.js')).default;
export const universal = {
  "ssr": false
};
export const universal_id = "src/routes/flows/[id]/+page.ts";
export const imports = ["_app/immutable/nodes/3.BdMzAwv8.js","_app/immutable/chunks/4LF6yYm1.js","_app/immutable/chunks/Mdsrn-sT.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/DaqNudQJ.js","_app/immutable/chunks/BfTtFuzB.js","_app/immutable/chunks/CWmhHnL_.js","_app/immutable/chunks/-vPpbTQc.js"];
export const stylesheets = ["_app/immutable/assets/3.BOW7S8aS.css"];
export const fonts = [];
