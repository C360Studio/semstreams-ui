import * as universal from '../entries/pages/_page.ts.js';

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_page.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/+page.ts";
export const imports = ["_app/immutable/nodes/2.j_6VmO2O.js","_app/immutable/chunks/DWg6l2ov.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/DyRE0cBX.js","_app/immutable/chunks/dEYrHuzZ.js","_app/immutable/chunks/cw9Ti4I1.js","_app/immutable/chunks/BN3MZzqc.js","_app/immutable/chunks/DR4KUQce.js"];
export const stylesheets = ["_app/immutable/assets/2.ChVU7Co2.css"];
export const fonts = [];
