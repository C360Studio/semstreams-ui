import * as universal from '../entries/pages/_page.ts.js';

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_page.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/+page.ts";
export const imports = ["_app/immutable/nodes/2.DjbAa9Tz.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/BkwaiKXi.js","_app/immutable/chunks/BnpdicBt.js","_app/immutable/chunks/Cb8jkM66.js","_app/immutable/chunks/C9UW2KHr.js","_app/immutable/chunks/vE4479mo.js"];
export const stylesheets = ["_app/immutable/assets/2.DL3ySTNk.css"];
export const fonts = [];
