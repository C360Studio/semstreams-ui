

export const index = 3;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/flows/_id_/_page.svelte.js')).default;
export const universal = {
  "ssr": false
};
export const universal_id = "src/routes/flows/[id]/+page.ts";
export const imports = ["_app/immutable/nodes/3.DuxGo4qL.js","_app/immutable/chunks/Cb8jkM66.js","_app/immutable/chunks/BkwaiKXi.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/BnpdicBt.js","_app/immutable/chunks/CvlBOBPg.js","_app/immutable/chunks/vE4479mo.js","_app/immutable/chunks/Ud_oaDXL.js","_app/immutable/chunks/0sAz7CIx.js","_app/immutable/chunks/C9UW2KHr.js","_app/immutable/chunks/C3nM0Ame.js"];
export const stylesheets = ["_app/immutable/assets/style.BjhDLxN9.css","_app/immutable/assets/3.BlT9Bzyw.css"];
export const fonts = [];
