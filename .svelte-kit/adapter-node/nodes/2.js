import * as universal from '../entries/pages/_page.ts.js';

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_page.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/+page.ts";
export const imports = ["_app/immutable/nodes/2.zGBDwyd5.js","_app/immutable/chunks/BfTtFuzB.js","_app/immutable/chunks/Mdsrn-sT.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/DaqNudQJ.js","_app/immutable/chunks/4LF6yYm1.js"];
export const stylesheets = ["_app/immutable/assets/2.ChVU7Co2.css"];
export const fonts = [];
