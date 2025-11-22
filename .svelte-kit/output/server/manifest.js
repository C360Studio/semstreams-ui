export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["robots.txt"]),
	mimeTypes: {".txt":"text/plain"},
	_: {
		client: {start:"_app/immutable/entry/start.DnxJYeg6.js",app:"_app/immutable/entry/app.CH9qkp1O.js",imports:["_app/immutable/entry/start.DnxJYeg6.js","_app/immutable/chunks/Nne6mvNZ.js","_app/immutable/chunks/BkwaiKXi.js","_app/immutable/entry/app.CH9qkp1O.js","_app/immutable/chunks/BkwaiKXi.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/BnpdicBt.js","_app/immutable/chunks/Ud_oaDXL.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js')),
			__memo(() => import('./nodes/4.js')),
			__memo(() => import('./nodes/5.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/flows/[id]",
				pattern: /^\/flows\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/test-xyflow-wrapped",
				pattern: /^\/test-xyflow-wrapped\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/test-xyflow",
				pattern: /^\/test-xyflow\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
