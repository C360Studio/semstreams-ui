import { json } from "@sveltejs/kit";
import Anthropic from "@anthropic-ai/sdk";
import { b as private_env } from "../../../../../chunks/shared-server.js";
function createGetComponentCatalogTool(config) {
  return {
    name: "get_component_catalog",
    description: "Fetches available component types from the backend component registry",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    },
    async execute() {
      const response = await fetch(`${config.backendUrl}/components/types`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    }
  };
}
function createValidateFlowTool(config) {
  return {
    name: "validate_flow",
    description: "Validates a flow configuration and returns validation results",
    inputSchema: {
      type: "object",
      properties: {
        flowId: {
          type: "string",
          description: "The ID of the flow to validate"
        },
        flow: {
          type: "object",
          description: "The flow configuration to validate"
        }
      },
      required: ["flowId", "flow"]
    },
    async execute(input) {
      const { flowId, flow } = input;
      if (!flowId || !flow) {
        throw new Error("Missing required parameters");
      }
      const response = await fetch(
        `${config.backendUrl}/flowbuilder/flows/${flowId}/validate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(flow)
        }
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    }
  };
}
function createMCPTools(config) {
  return [
    createGetComponentCatalogTool(config),
    createValidateFlowTool(config)
  ];
}
class MCPServer {
  tools = /* @__PURE__ */ new Map();
  cache = /* @__PURE__ */ new Map();
  config;
  /**
   * Create a new MCP server
   *
   * @param config Server configuration
   */
  constructor(config) {
    this.config = {
      ...config,
      cacheEnabled: config.cacheEnabled !== false
      // Default to true
    };
  }
  /**
   * Register a single tool
   *
   * @param tool MCP tool to register
   */
  registerTool(tool) {
    this.tools.set(tool.name, tool);
  }
  /**
   * Register all available tools
   *
   * Creates and registers all MCP tools with the server configuration.
   */
  registerTools() {
    const toolConfig = {
      backendUrl: this.config.backendUrl
    };
    const tools = createMCPTools(toolConfig);
    tools.forEach((tool) => this.registerTool(tool));
  }
  /**
   * Execute a tool by name
   *
   * @param name Tool name
   * @param input Tool input parameters
   * @returns Tool execution result
   */
  async executeTool(name, input) {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }
    if (name === "get_component_catalog" && this.config.cacheEnabled) {
      return await this.executeWithCache("component_catalog", async () => {
        return await tool.execute(input);
      });
    }
    return await tool.execute(input);
  }
  /**
   * Get all registered tools
   *
   * @returns Array of registered tools
   */
  getRegisteredTools() {
    return Array.from(this.tools.values());
  }
  /**
   * Get a tool by name
   *
   * @param name Tool name
   * @returns MCP tool or undefined if not found
   */
  getTool(name) {
    return this.tools.get(name);
  }
  /**
   * Clear all caches
   *
   * Removes all cached data from the server.
   */
  clearCache() {
    this.cache.clear();
  }
  /**
   * Get cached value
   *
   * @param key Cache key
   * @returns Cached value or undefined
   */
  getCachedValue(key) {
    return this.cache.get(key);
  }
  /**
   * Set cached value
   *
   * @param key Cache key
   * @param value Value to cache
   */
  setCachedValue(key, value) {
    this.cache.set(key, value);
  }
  /**
   * Execute with cache
   *
   * Executes a function and caches the result.
   * Returns cached value if available.
   *
   * @param cacheKey Cache key
   * @param fn Function to execute
   * @returns Function result (from cache or fresh execution)
   */
  async executeWithCache(cacheKey, fn) {
    const cached = this.cache.get(cacheKey);
    if (cached !== void 0) {
      return cached;
    }
    const result = await fn();
    this.cache.set(cacheKey, result);
    return result;
  }
  /**
   * Get component catalog (with caching)
   *
   * Fetches component catalog and caches the result.
   *
   * @returns Array of component types
   */
  async getComponentCatalog() {
    return await this.executeTool(
      "get_component_catalog",
      {}
    );
  }
  /**
   * Validate flow
   *
   * Validates a flow configuration.
   *
   * @param flowId Flow ID
   * @param flow Flow configuration
   * @returns Validation result
   */
  async validateFlow(flowId, flow) {
    return await this.executeTool("validate_flow", { flowId, flow });
  }
}
function createMCPServer(config) {
  const server = new MCPServer(config);
  server.registerTools();
  return server;
}
class ClaudeApiError extends Error {
  constructor(message, statusCode, isRetryable = false, originalError) {
    super(message);
    this.statusCode = statusCode;
    this.isRetryable = isRetryable;
    this.originalError = originalError;
    this.name = "ClaudeApiError";
  }
}
class ClaudeClient {
  client;
  defaultModel = "claude-3-5-sonnet-20241022";
  defaultMaxTokens = 4096;
  timeout;
  maxRetries;
  retryDelayMs;
  /**
   * Create a new Claude client
   *
   * @param config Client configuration or API key string (for backward compatibility)
   * @throws Error if instantiated in browser context
   */
  constructor(config) {
    if (typeof window !== "undefined") {
      throw new Error(
        "ClaudeClient cannot be instantiated in browser context. Use server-side API routes instead."
      );
    }
    const normalizedConfig = typeof config === "string" ? { apiKey: config } : config || {};
    this.timeout = normalizedConfig.timeout || 3e4;
    this.maxRetries = normalizedConfig.maxRetries || 3;
    this.retryDelayMs = normalizedConfig.retryDelayMs || 1e3;
    this.client = new Anthropic({
      apiKey: normalizedConfig.apiKey || process.env.ANTHROPIC_API_KEY,
      timeout: this.timeout,
      maxRetries: 0
      // We handle retries ourselves for better control
    });
  }
  /**
   * Send a message to Claude
   *
   * @param prompt User prompt
   * @param options Optional message parameters
   * @param requestOptions Optional request options (e.g., AbortSignal)
   * @returns Claude's response
   * @throws ClaudeApiError if request fails or is aborted
   */
  async sendMessage(prompt, options, requestOptions) {
    const params = {
      model: options?.model || this.defaultModel,
      max_tokens: options?.maxTokens || this.defaultMaxTokens,
      messages: [{ role: "user", content: prompt }]
    };
    if (options?.systemPrompt) {
      params.system = options.systemPrompt;
    }
    return this.executeWithRetry(
      () => this.createMessage(params, requestOptions?.signal),
      requestOptions?.signal
    );
  }
  /**
   * Send a message with tools
   *
   * @param prompt User prompt
   * @param tools Available tools
   * @param options Optional message parameters
   * @param requestOptions Optional request options (e.g., AbortSignal)
   * @returns Claude's response
   * @throws ClaudeApiError if request fails or is aborted
   */
  async sendMessageWithTools(prompt, tools, options, requestOptions) {
    const params = {
      model: options?.model || this.defaultModel,
      max_tokens: options?.maxTokens || this.defaultMaxTokens,
      messages: [{ role: "user", content: prompt }],
      tools
    };
    if (options?.systemPrompt) {
      params.system = options.systemPrompt;
    }
    return this.executeWithRetry(
      () => this.createMessage(params, requestOptions?.signal),
      requestOptions?.signal
    );
  }
  /**
   * Send messages (multi-turn conversation)
   *
   * @param params Message parameters
   * @param requestOptions Optional request options (e.g., AbortSignal)
   * @returns Claude's response
   * @throws ClaudeApiError if request fails or is aborted
   */
  async sendMessages(params, requestOptions) {
    const createParams = {
      model: params.model || this.defaultModel,
      max_tokens: params.max_tokens || this.defaultMaxTokens,
      messages: params.messages
    };
    if (params.system) {
      createParams.system = params.system;
    }
    if (params.tools) {
      createParams.tools = params.tools;
    }
    return this.executeWithRetry(
      () => this.createMessage(createParams, requestOptions?.signal),
      requestOptions?.signal
    );
  }
  /**
   * Parse tool use from response
   *
   * Extracts tool use blocks from Claude's response.
   *
   * @param response Claude message response
   * @returns Array of tool use content blocks
   */
  parseToolUse(response) {
    return response.content.filter(
      (block) => block.type === "tool_use"
    );
  }
  /**
   * Send tool result back to Claude
   *
   * @param toolUseId Tool use ID from Claude's response
   * @param result Tool execution result
   * @param isError Whether the result is an error
   * @param conversationHistory Previous conversation history
   * @param tools Available tools (for continued tool use)
   * @param requestOptions Optional request options (e.g., AbortSignal)
   * @returns Claude's response
   * @throws ClaudeApiError if request fails or is aborted
   */
  async sendToolResult(toolUseId, result, isError = false, conversationHistory = [], tools, requestOptions) {
    const toolResultMessage = {
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: toolUseId,
          content: typeof result === "string" ? result : JSON.stringify(result),
          is_error: isError
        }
      ]
    };
    const params = {
      model: this.defaultModel,
      max_tokens: this.defaultMaxTokens,
      messages: [
        ...conversationHistory,
        toolResultMessage
      ]
    };
    if (tools) {
      params.tools = tools;
    }
    return this.executeWithRetry(
      () => this.createMessage(params, requestOptions?.signal),
      requestOptions?.signal
    );
  }
  /**
   * Stream a message response
   *
   * @param prompt User prompt
   * @param options Optional message parameters
   * @param requestOptions Optional request options (e.g., AbortSignal)
   * @returns Async iterator of message chunks
   * @throws ClaudeApiError if request fails or is aborted
   */
  async *streamMessage(prompt, options, requestOptions) {
    if (requestOptions?.signal?.aborted) {
      throw new ClaudeApiError("Request was cancelled", void 0, false);
    }
    const params = {
      model: options?.model || this.defaultModel,
      max_tokens: options?.maxTokens || this.defaultMaxTokens,
      messages: [{ role: "user", content: prompt }]
    };
    if (options?.systemPrompt) {
      params.system = options.systemPrompt;
    }
    if (options?.tools) {
      params.tools = options.tools;
    }
    const stream = await this.client.messages.stream(params, {
      signal: requestOptions?.signal
    });
    for await (const event of stream) {
      if (requestOptions?.signal?.aborted) {
        throw new ClaudeApiError("Request was cancelled", void 0, false);
      }
      yield event;
    }
  }
  /**
   * Execute API call with retry logic using exponential backoff
   *
   * @param fn Function to execute
   * @param signal Optional AbortSignal for cancellation
   * @returns Result of the function
   * @throws ClaudeApiError after all retries exhausted or if aborted
   */
  async executeWithRetry(fn, signal) {
    let lastError;
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      if (signal?.aborted) {
        throw new ClaudeApiError("Request was cancelled", void 0, false);
      }
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (this.isAbortError(error)) {
          throw new ClaudeApiError("Request was cancelled", void 0, false);
        }
        if (!this.isRetryableError(error) || attempt === this.maxRetries - 1) {
          throw this.wrapError(error);
        }
        if (signal?.aborted) {
          throw new ClaudeApiError("Request was cancelled", void 0, false);
        }
        const delay = this.calculateBackoffDelay(attempt);
        await this.sleep(delay);
      }
    }
    throw this.wrapError(lastError || new Error("Unknown error after retries"));
  }
  /**
   * Create a message via Anthropic API
   *
   * @param params Message creation parameters
   * @param signal Optional AbortSignal for cancellation
   */
  async createMessage(params, signal) {
    const response = await this.client.messages.create(
      {
        ...params,
        stream: false
      },
      {
        signal
      }
    );
    return this.formatResponse(response);
  }
  /**
   * Check if an error is an abort error
   */
  isAbortError(error) {
    if (error instanceof Error) {
      return error.name === "AbortError" || error.message.includes("abort") || error.message.includes("cancel");
    }
    return false;
  }
  /**
   * Check if an error is retryable
   *
   * Retryable errors include:
   * - 429 Rate Limit
   * - 500 Internal Server Error
   * - 502 Bad Gateway
   * - 503 Service Unavailable
   * - 504 Gateway Timeout
   * - Network errors
   */
  isRetryableError(error) {
    if (error instanceof Anthropic.APIError) {
      const status = error.status;
      return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
    }
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return message.includes("network") || message.includes("timeout") || message.includes("econnreset") || message.includes("econnrefused");
    }
    return false;
  }
  /**
   * Calculate backoff delay with exponential growth and jitter
   */
  calculateBackoffDelay(attempt) {
    const exponentialDelay = this.retryDelayMs * Math.pow(2, attempt);
    const jitter = exponentialDelay * Math.random() * 0.25;
    return Math.min(exponentialDelay + jitter, 3e4);
  }
  /**
   * Wrap error in ClaudeApiError with proper context
   */
  wrapError(error) {
    if (error instanceof ClaudeApiError) {
      return error;
    }
    if (error instanceof Anthropic.APIError) {
      return new ClaudeApiError(
        error.message,
        error.status,
        this.isRetryableError(error),
        error
      );
    }
    if (error instanceof Error) {
      return new ClaudeApiError(
        error.message,
        void 0,
        this.isRetryableError(error),
        error
      );
    }
    return new ClaudeApiError(String(error));
  }
  /**
   * Sleep for specified duration
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  /**
   * Format Anthropic SDK response to our ClaudeMessage format
   *
   * @param response Anthropic SDK message response
   * @returns Formatted Claude message
   */
  formatResponse(response) {
    return {
      id: response.id,
      type: "message",
      role: "assistant",
      content: response.content,
      model: response.model,
      stop_reason: response.stop_reason
    };
  }
}
function createClaudeClient(config) {
  return new ClaudeClient(config);
}
const store = /* @__PURE__ */ new Map();
let cleanupInterval = null;
function ensureCleanupRunning(windowMs) {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(
    () => {
      const now = Date.now();
      for (const [key, record] of store.entries()) {
        record.timestamps = record.timestamps.filter(
          (ts) => now - ts < windowMs
        );
        if (record.timestamps.length === 0) {
          store.delete(key);
        }
      }
    },
    6e4
    // 1 minute
  );
}
function checkRateLimit(clientId, config) {
  const now = Date.now();
  const { maxRequests, windowMs } = config;
  ensureCleanupRunning(windowMs);
  let record = store.get(clientId);
  if (!record) {
    record = { timestamps: [] };
    store.set(clientId, record);
  }
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);
  if (record.timestamps.length >= maxRequests) {
    const oldestTimestamp = record.timestamps[0];
    const retryAfter = Math.ceil((oldestTimestamp + windowMs - now) / 1e3);
    return {
      allowed: false,
      remaining: 0,
      retryAfter,
      limit: maxRequests
    };
  }
  record.timestamps.push(now);
  return {
    allowed: true,
    remaining: maxRequests - record.timestamps.length,
    limit: maxRequests
  };
}
const AI_RATE_LIMIT_CONFIG = {
  maxRequests: 10,
  windowMs: 6e4
  // 1 minute
};
const PROMPT_CONFIG = {
  /** Minimum prompt length in characters */
  minLength: 10,
  /** Maximum prompt length in characters */
  maxLength: 2e3
};
const CLAUDE_CONFIG = {
  /** Default model to use */
  defaultModel: "claude-sonnet-4-20250514",
  /** Maximum tokens for response */
  maxTokens: 4096,
  /** Request timeout in milliseconds */
  timeout: 3e4,
  /** Maximum retry attempts */
  maxRetries: 3,
  /** Base delay for retry backoff in milliseconds */
  retryDelayMs: 1e3
};
function validatePrompt(prompt) {
  if (!prompt || typeof prompt !== "string") {
    return {
      valid: false,
      error: "Prompt is required and must be a string"
    };
  }
  const trimmedPrompt = prompt.trim();
  if (trimmedPrompt.length === 0) {
    return {
      valid: false,
      error: "Prompt cannot be empty"
    };
  }
  if (trimmedPrompt.length < PROMPT_CONFIG.minLength) {
    return {
      valid: false,
      error: `Prompt is too short. Minimum ${PROMPT_CONFIG.minLength} characters required. Try being more specific about the flow you want to create.`
    };
  }
  if (trimmedPrompt.length > PROMPT_CONFIG.maxLength) {
    return {
      valid: false,
      error: `Prompt is too long. Maximum ${PROMPT_CONFIG.maxLength} characters allowed. Try breaking down your request into smaller, more focused prompts.`
    };
  }
  return {
    valid: true,
    trimmedPrompt
  };
}
const ERROR_MESSAGES = {
  rateLimitExceeded: (retryAfter) => `Too many requests. Please wait ${retryAfter} seconds before trying again.`,
  promptTooShort: `Your prompt is too short. Please provide more details about the flow you want to create. For example: "Create a flow that receives UDP data on port 5000, transforms it to JSON, and publishes to NATS."`,
  promptTooLong: `Your prompt is too long. Please try to be more concise or break down your request into smaller steps.`,
  invalidPrompt: `Invalid prompt. Please describe the flow you want to create using natural language.`,
  componentCatalogFailed: "Unable to fetch available components. Please check if the backend is running and try again.",
  claudeApiFailed: "AI generation failed. This might be a temporary issue. Please try again in a moment.",
  claudeRateLimited: "AI service is currently busy. Please wait a moment and try again.",
  validationFailed: "Flow validation failed. The generated flow may have issues. Please review and try again with a modified prompt.",
  noFlowGenerated: "The AI could not generate a flow from your prompt. Please try rephrasing your request with more specific details.",
  internalError: "An unexpected error occurred. Please try again. If the problem persists, contact support.",
  requestTimeout: "The request took too long to complete. Please try again with a simpler prompt.",
  requestCancelled: "The request was cancelled."
};
function getClientId(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
  return "default-client";
}
const POST = async ({ request }) => {
  const clientId = getClientId(request);
  const rateLimitResult = checkRateLimit(clientId, AI_RATE_LIMIT_CONFIG);
  if (!rateLimitResult.allowed) {
    return json(
      {
        error: ERROR_MESSAGES.rateLimitExceeded(rateLimitResult.retryAfter),
        code: "RATE_LIMITED",
        retryAfter: rateLimitResult.retryAfter
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimitResult.retryAfter),
          "X-RateLimit-Limit": String(rateLimitResult.limit),
          "X-RateLimit-Remaining": "0"
        }
      }
    );
  }
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return json(
        {
          error: "Invalid JSON in request body",
          code: "INVALID_JSON"
        },
        { status: 400 }
      );
    }
    const promptValidation = validatePrompt(body.prompt);
    if (!promptValidation.valid) {
      return json(
        {
          error: promptValidation.error,
          code: "INVALID_PROMPT"
        },
        { status: 400 }
      );
    }
    const { existingFlow } = body;
    const prompt = promptValidation.trimmedPrompt;
    const mcpServer = createMCPServer({
      backendUrl: private_env.BACKEND_URL || "http://localhost:8080"
    });
    const claude = createClaudeClient({
      apiKey: private_env.ANTHROPIC_API_KEY,
      timeout: CLAUDE_CONFIG.timeout,
      maxRetries: CLAUDE_CONFIG.maxRetries,
      retryDelayMs: CLAUDE_CONFIG.retryDelayMs
    });
    let componentCatalog;
    try {
      componentCatalog = await mcpServer.getComponentCatalog();
    } catch (err) {
      console.error("Failed to fetch component catalog:", err);
      return json(
        {
          error: ERROR_MESSAGES.componentCatalogFailed,
          code: "COMPONENT_CATALOG_FAILED",
          details: err instanceof Error ? err.message : void 0
        },
        { status: 503 }
      );
    }
    const systemPrompt = buildSystemPrompt(componentCatalog, existingFlow);
    const tools = [
      {
        name: "create_flow",
        description: "Creates a new flow with nodes and connections based on the user prompt.",
        input_schema: {
          type: "object",
          properties: {
            nodes: {
              type: "array",
              description: "Array of flow nodes (components)",
              items: {
                type: "object",
                properties: {
                  id: { type: "string", description: "Unique node identifier" },
                  type: {
                    type: "string",
                    description: "Component type ID from catalog"
                  },
                  name: {
                    type: "string",
                    description: "Human-readable node name"
                  },
                  position: {
                    type: "object",
                    properties: {
                      x: { type: "number" },
                      y: { type: "number" }
                    },
                    required: ["x", "y"]
                  },
                  config: {
                    type: "object",
                    description: "Component-specific configuration"
                  }
                },
                required: ["id", "type", "name", "position", "config"]
              }
            },
            connections: {
              type: "array",
              description: "Array of connections between nodes",
              items: {
                type: "object",
                properties: {
                  id: { type: "string", description: "Connection identifier" },
                  source_node_id: { type: "string" },
                  source_port: { type: "string" },
                  target_node_id: { type: "string" },
                  target_port: { type: "string" }
                },
                required: [
                  "id",
                  "source_node_id",
                  "source_port",
                  "target_node_id",
                  "target_port"
                ]
              }
            }
          },
          required: ["nodes", "connections"]
        }
      }
    ];
    let claudeResponse;
    try {
      claudeResponse = await claude.sendMessageWithTools(prompt, tools, {
        model: private_env.ANTHROPIC_MODEL || CLAUDE_CONFIG.defaultModel,
        systemPrompt,
        maxTokens: CLAUDE_CONFIG.maxTokens
      });
    } catch (err) {
      console.error("Claude API request failed:", err);
      if (err instanceof ClaudeApiError) {
        if (err.statusCode === 429) {
          return json(
            {
              error: ERROR_MESSAGES.claudeRateLimited,
              code: "CLAUDE_RATE_LIMITED"
            },
            { status: 503 }
          );
        }
      }
      return json(
        {
          error: ERROR_MESSAGES.claudeApiFailed,
          code: "CLAUDE_API_FAILED",
          details: err instanceof Error ? err.message : void 0
        },
        { status: 503 }
      );
    }
    const toolUses = claude.parseToolUse(claudeResponse);
    const createFlowTool = toolUses.find((tool) => tool.name === "create_flow");
    if (!createFlowTool) {
      return json(
        {
          error: ERROR_MESSAGES.noFlowGenerated,
          code: "NO_FLOW_GENERATED"
        },
        { status: 422 }
      );
    }
    const toolInput = createFlowTool.input;
    const generatedFlow = {
      nodes: toolInput.nodes || [],
      connections: toolInput.connections || []
    };
    let validationResult;
    try {
      const tempFlowId = `temp_${Date.now()}`;
      validationResult = await mcpServer.validateFlow(
        tempFlowId,
        generatedFlow
      );
    } catch (err) {
      console.error("Flow validation failed:", err);
      return json(
        {
          error: ERROR_MESSAGES.validationFailed,
          code: "VALIDATION_FAILED",
          details: err instanceof Error ? err.message : void 0
        },
        { status: 500 }
      );
    }
    return json(
      {
        flow: generatedFlow,
        validationResult
      },
      {
        status: 200,
        headers: {
          "X-RateLimit-Limit": String(rateLimitResult.limit),
          "X-RateLimit-Remaining": String(rateLimitResult.remaining)
        }
      }
    );
  } catch (err) {
    console.error("Unexpected error in AI flow generation:", err);
    return json(
      {
        error: ERROR_MESSAGES.internalError,
        code: "INTERNAL_ERROR",
        details: process.env.NODE_ENV === "development" && err instanceof Error ? err.message : void 0
      },
      { status: 500 }
    );
  }
};
function buildSystemPrompt(catalog, existingFlow) {
  const catalogDescription = catalog.map((comp) => {
    const inputPorts = comp.ports?.filter((p) => p.direction === "input").length || 0;
    const outputPorts = comp.ports?.filter((p) => p.direction === "output").length || 0;
    return `- ${comp.id} (${comp.category}): ${comp.description}
  Ports: ${inputPorts} inputs, ${outputPorts} outputs`;
  }).join("\n");
  let prompt = `You are a flow generation assistant for SemStreams, a semantic stream processing platform.

Your task is to generate flows (directed graphs of components) based on user prompts.

Available component catalog:
${catalogDescription}

Guidelines:
1. Use only component types from the catalog above
2. Create meaningful component names that describe their purpose
3. Position nodes in a left-to-right flow layout (x: 0-1000, y: 0-600)
4. Connect components using their input/output ports
5. Ensure all connections reference valid node IDs and port names
6. Use connection IDs in format: conn_<source>_<target>_<port>
7. Configure components with sensible default values
8. Consider data flow patterns: sources → processors → sinks

When creating flows:
- Sources (HTTP, Kafka) go on the left
- Processors (transformers, filters) go in the middle
- Sinks (HTTP, Kafka) go on the right
- Space nodes evenly for readability`;
  if (existingFlow) {
    prompt += `

Existing flow context:
Nodes: ${existingFlow.nodes?.length || 0}
Connections: ${existingFlow.connections?.length || 0}

When modifying, preserve existing nodes unless explicitly asked to remove them.`;
  }
  return prompt;
}
export {
  POST
};
