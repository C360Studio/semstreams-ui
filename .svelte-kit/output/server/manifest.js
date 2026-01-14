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
		client: {start:"_app/immutable/entry/start.Ck620GUU.js",app:"_app/immutable/entry/app.Cf90gNu1.js",imports:["_app/immutable/entry/start.Ck620GUU.js","_app/immutable/chunks/4LF6yYm1.js","_app/immutable/chunks/Mdsrn-sT.js","_app/immutable/entry/app.Cf90gNu1.js","_app/immutable/chunks/Mdsrn-sT.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/DaqNudQJ.js","_app/immutable/chunks/CWmhHnL_.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js'))
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
				id: "/api/ai/generate-flow",
				pattern: /^\/api\/ai\/generate-flow\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/ai/generate-flow/_server.ts.js'))
			},
			{
				id: "/flows/[id]",
				pattern: /^\/flows\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
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
