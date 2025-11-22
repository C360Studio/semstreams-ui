

export const index = 3;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/flows/_id_/_page.svelte.js')).default;
export const universal = {
  "ssr": false
};
export const universal_id = "src/routes/flows/[id]/+page.ts";
export const imports = ["_app/immutable/nodes/3.BhAC1QG9.js","_app/immutable/chunks/cw9Ti4I1.js","_app/immutable/chunks/DyRE0cBX.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/dEYrHuzZ.js","_app/immutable/chunks/CS1JKlFV.js","_app/immutable/chunks/DR4KUQce.js","_app/immutable/chunks/CpSTawGE.js","_app/immutable/chunks/BlLU2np4.js","_app/immutable/chunks/BN3MZzqc.js","_app/immutable/chunks/DVrxQD1b.js","_app/immutable/chunks/DWg6l2ov.js"];
export const stylesheets = ["_app/immutable/assets/style.BjhDLxN9.css","_app/immutable/assets/3.BlT9Bzyw.css"];
export const fonts = [];
