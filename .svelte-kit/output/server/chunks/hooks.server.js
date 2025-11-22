import { c as private_env } from "./internal.js";
const handle = async ({ event, resolve }) => {
  return resolve(event);
};
async function handleFetch({ request, fetch }) {
  const url = new URL(request.url);
  const startTime = Date.now();
  if (url.pathname.startsWith("/flowbuilder") || url.pathname.startsWith("/components") || url.pathname.startsWith("/health")) {
    const backendHost = private_env.BACKEND_HOST;
    if (backendHost) {
      url.protocol = "http:";
      url.host = backendHost;
      console.log(`[handleFetch] Transforming ${request.method} ${request.url} → ${url.toString()}`);
      const modifiedRequest = new Request(url.toString(), {
        method: request.method,
        headers: request.headers,
        body: request.body,
        // @ts-expect-error - duplex is valid but not in TypeScript types yet
        duplex: "half"
      });
      const response = await fetch(modifiedRequest);
      const elapsed = Date.now() - startTime;
      console.log(`[handleFetch] ${request.method} ${url.pathname} completed in ${elapsed}ms (status: ${response.status})`);
      return response;
    }
  }
  return fetch(request);
}
export {
  handle,
  handleFetch
};
