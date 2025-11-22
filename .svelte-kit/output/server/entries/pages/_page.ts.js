const load = async ({ fetch }) => {
  try {
    const response = await fetch("/flowbuilder/flows");
    if (!response.ok) {
      throw new Error(`Failed to load flows: ${response.statusText}`);
    }
    const data = await response.json();
    return {
      flows: data.flows || []
    };
  } catch (error) {
    console.error("Failed to load flows:", error);
    return {
      flows: [],
      error: error instanceof Error ? error.message : "Failed to load flows"
    };
  }
};
export {
  load
};
