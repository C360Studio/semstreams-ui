import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

interface ProxyConfigCase {
  file: string;
  backendTarget: string;
  graphqlTarget: string;
  graphqlPath: string;
}

const proxyConfigs: ProxyConfigCase[] = [
  {
    file: "Caddyfile",
    backendTarget: "{$BACKEND_HOST:backend:8080}",
    graphqlTarget: "{$GRAPHQL_HOST:backend:8080}",
    graphqlPath: "{$GRAPHQL_PATH:/graphql}",
  },
  {
    file: "Caddyfile.dev",
    backendTarget: "{$BACKEND_HOST:backend:8080}",
    graphqlTarget: "{$GRAPHQL_HOST:backend:8080}",
    graphqlPath: "{$GRAPHQL_PATH:/graphql}",
  },
  {
    file: "Caddyfile.e2e",
    backendTarget: "{$BACKEND_HOST:backend:8080}",
    graphqlTarget: "{$GRAPHQL_HOST:backend:8080}",
    graphqlPath: "{$GRAPHQL_PATH:/graphql}",
  },
];

function readConfig(file: string): string {
  return readFileSync(join(process.cwd(), file), "utf8");
}

function extractHandleBlock(config: string, matcher: string): string {
  const marker = `handle ${matcher} {`;
  const markerIndex = config.indexOf(marker);

  expect(markerIndex, `${matcher} handle should exist`).toBeGreaterThanOrEqual(
    0,
  );

  const blockStart = config.indexOf("{", markerIndex);
  let depth = 0;

  for (let index = blockStart; index < config.length; index += 1) {
    const char = config[index];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;

    if (depth === 0) {
      return config.slice(blockStart + 1, index);
    }
  }

  throw new Error(`Unclosed handle block for ${matcher}`);
}

function extractReverseProxyTarget(block: string): string {
  const match = block.match(/^\s*reverse_proxy\s+([^\n#]+)/m);
  expect(match, "handle block should contain reverse_proxy").not.toBeNull();
  return match?.[1].trim() ?? "";
}

function extractRewriteTarget(block: string): string {
  const match = block.match(/^\s*rewrite\s+\*\s+([^\n#]+)/m);
  expect(match, "handle block should contain rewrite").not.toBeNull();
  return match?.[1].trim() ?? "";
}

function indexOfHandle(config: string, matcher: string): number {
  return config.indexOf(matcher === "" ? "handle {" : `handle ${matcher} {`);
}

describe("Caddy proxy contract", () => {
  it.each(proxyConfigs)(
    "$file routes flow runtime calls through the backend proxy namespace",
    ({ file, backendTarget }) => {
      const config = readConfig(file);
      const block = extractHandleBlock(config, "/flowbuilder/*");

      expect(extractReverseProxyTarget(block)).toBe(backendTarget);
      expect(indexOfHandle(config, "/flowbuilder/*")).toBeLessThan(
        indexOfHandle(config, ""),
      );
    },
  );

  it.each(proxyConfigs)(
    "$file routes GraphQL through GRAPHQL_HOST with configurable upstream path",
    ({ file, graphqlTarget, graphqlPath }) => {
      const config = readConfig(file);
      const block = extractHandleBlock(config, "/graphql");

      expect(extractRewriteTarget(block)).toBe(graphqlPath);
      expect(extractReverseProxyTarget(block)).toBe(graphqlTarget);
      expect(indexOfHandle(config, "/graphql")).toBeLessThan(
        indexOfHandle(config, ""),
      );
    },
  );

  it.each(proxyConfigs)(
    "$file routes trajectory reads through the backend proxy namespace",
    ({ file, backendTarget }) => {
      const config = readConfig(file);
      const collectionBlock = extractHandleBlock(config, "/trajectories");
      const itemBlock = extractHandleBlock(config, "/trajectories/*");

      expect(extractReverseProxyTarget(collectionBlock)).toBe(backendTarget);
      expect(extractReverseProxyTarget(itemBlock)).toBe(backendTarget);
      expect(indexOfHandle(config, "/trajectories")).toBeLessThan(
        indexOfHandle(config, ""),
      );
      expect(indexOfHandle(config, "/trajectories/*")).toBeLessThan(
        indexOfHandle(config, ""),
      );
    },
  );

  it("keeps /flows reserved for SvelteKit pages instead of backend flow APIs", () => {
    for (const { file } of proxyConfigs) {
      const config = readConfig(file);

      expect(config).not.toContain("handle /flows");
      expect(config).not.toContain("handle /flows/*");
    }
  });

  it("sets GRAPHQL_HOST from BACKEND_HOST in run modes that do not pin a separate graph gateway", () => {
    const composeConfig = readConfig("docker-compose.yml");
    const devComposeConfig = readConfig("docker-compose.dev.yml");
    const e2eComposeConfig = readConfig("docker-compose.e2e.yml");
    const taskfileConfig = readConfig("Taskfile.yml");

    expect(composeConfig).toContain(
      "GRAPHQL_HOST=${GRAPHQL_HOST:-${BACKEND_HOST:-host.docker.internal:8080}}",
    );
    expect(devComposeConfig).toContain(
      "GRAPHQL_HOST=${GRAPHQL_HOST:-${BACKEND_HOST:-backend:8080}}",
    );
    expect(e2eComposeConfig).toContain(
      "GRAPHQL_HOST=${GRAPHQL_HOST:-backend:8080}",
    );
    expect(taskfileConfig).toContain(
      "GRAPHQL_HOST: '{{.GRAPHQL_HOST | default .BACKEND_HOST | default \"localhost:8080\"}}'",
    );
  });

  it("keeps the browser GraphQL route stable while allowing upstream path overrides", () => {
    const composeConfig = readConfig("docker-compose.yml");
    const devComposeConfig = readConfig("docker-compose.dev.yml");
    const e2eComposeConfig = readConfig("docker-compose.e2e.yml");
    const taskfileConfig = readConfig("Taskfile.yml");

    expect(composeConfig).toContain("GRAPHQL_PATH=${GRAPHQL_PATH:-/graphql}");
    expect(devComposeConfig).toContain(
      "GRAPHQL_PATH=${GRAPHQL_PATH:-/graphql}",
    );
    expect(e2eComposeConfig).toContain(
      "GRAPHQL_PATH=${GRAPHQL_PATH:-/graph-gateway/graphql}",
    );
    expect(taskfileConfig).toContain(
      "GRAPHQL_PATH: '{{.GRAPHQL_PATH | default \"/graphql\"}}'",
    );
  });
});
