
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/" | "/api" | "/api/ai" | "/api/ai/generate-flow" | "/flows" | "/flows/[id]";
		RouteParams(): {
			"/flows/[id]": { id: string }
		};
		LayoutParams(): {
			"/": { id?: string };
			"/api": Record<string, never>;
			"/api/ai": Record<string, never>;
			"/api/ai/generate-flow": Record<string, never>;
			"/flows": { id?: string };
			"/flows/[id]": { id: string }
		};
		Pathname(): "/" | "/api" | "/api/" | "/api/ai" | "/api/ai/" | "/api/ai/generate-flow" | "/api/ai/generate-flow/" | "/flows" | "/flows/" | `/flows/${string}` & {} | `/flows/${string}/` & {};
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/robots.txt" | string & {};
	}
}