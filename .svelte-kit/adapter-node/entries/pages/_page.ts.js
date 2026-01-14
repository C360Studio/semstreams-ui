function isConnectivityError(error) {
  if (!(error instanceof Error)) {
    return false;
  }
  return error.name === "AbortError" || error.message.includes("Failed to fetch") || error.message.includes("NetworkError") || error.message.includes("network") || error.message.includes("ECONNREFUSED");
}
function getUserFriendlyErrorMessage(error) {
  if (isConnectivityError(error)) {
    return "Cannot connect to backend. Please ensure the backend service is running and accessible.";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred";
}
const load = async ({ fetch }) => {
  try {
    const response = await fetch("/flowbuilder/flows");
    if (!response.ok) {
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("text/html")) {
        throw new Error("Backend service unavailable (received HTML error page)");
      }
      throw new Error(`Failed to load flows: ${response.statusText}`);
    }
    const data = await response.json();
    return {
      flows: data.flows || []
    };
  } catch (error) {
    console.error("Failed to load flows:", error);
    let errorMessage;
    if (isConnectivityError(error)) {
      errorMessage = "Cannot connect to backend service";
    } else {
      errorMessage = getUserFriendlyErrorMessage(error);
    }
    return {
      flows: [],
      error: errorMessage
    };
  }
};
export {
  load
};
