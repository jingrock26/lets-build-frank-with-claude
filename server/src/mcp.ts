import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTool, type ToolContext } from "./tools/define.js";
import { tools } from "./tools/index.js";

export function createFrankServer(ctx: ToolContext): McpServer {
  const server = new McpServer(
    { name: "frank", title: "Frank", version: ctx.version },
    {
      instructions:
        "Frank is a read-only observer. His tools report on his own status and environment; none of them change anything.",
    },
  );
  for (const tool of tools) registerTool(server, tool, ctx);
  return server;
}
