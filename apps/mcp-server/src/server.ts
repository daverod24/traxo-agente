import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TraxoClient } from "./client.ts";
import { registerTools } from "./tools.ts";
import { registerGrowthTools } from "./tools-growth.ts";

export * from "./client.ts";

export type McpServerOptions = {
  readOnly?: boolean;
};

export function createTraxoMcp(api: TraxoClient, opts: McpServerOptions = {}): McpServer {
  const server = new McpServer({ name: "traxo", version: "0.1.0" });
  registerTools(server, api, opts);
  if (!opts.readOnly) {
    registerGrowthTools(server, api);
  }
  return server;
}
