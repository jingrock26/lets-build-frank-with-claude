import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { CallToolResult, Tool } from "@modelcontextprotocol/sdk/types.js";

// The console's only way to reach Frank: MCP at /mcp and health at /healthz,
// both RELATIVE to the page, because Frank serves the console (ADR-006).
// The console holds no secrets and sends none (ADR-003).

export type { CallToolResult, Tool };

export interface ToolCallOutcome {
  isError: boolean;
  /** Frank's `summary` when he returned one, else the text content. */
  summary: string;
  /** structuredContent when present, else whatever content came back. */
  data: unknown;
}

export interface FrankApi {
  health: () => Promise<boolean>;
  listTools: () => Promise<Tool[]>;
  callTool: (name: string, args: Record<string, unknown>) => Promise<ToolCallOutcome>;
}

function mcpUrl(): URL {
  return new URL("mcp", new URL(".", window.location.href));
}

// Frank is stateless (one server per request), so a fresh client per operation
// costs one extra round trip and never trips over a scale-to-zero restart.
async function withClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ name: "frank-console", version: "0.1.0" });
  await client.connect(new StreamableHTTPClientTransport(mcpUrl()));
  try {
    return await fn(client);
  } finally {
    await client.close();
  }
}

export function toOutcome(result: CallToolResult): ToolCallOutcome {
  const text = result.content
    .filter((c): c is { type: "text"; text: string } => c.type === "text")
    .map((c) => c.text)
    .join("\n");
  const structured = result.structuredContent;
  const summary =
    structured && typeof structured.summary === "string" ? structured.summary : text || "(no content returned)";
  return { isError: result.isError === true, summary, data: structured ?? result.content };
}

export const frank: FrankApi = {
  async health() {
    try {
      const res = await fetch(new URL("healthz", new URL(".", window.location.href)));
      return res.ok;
    } catch {
      return false;
    }
  },
  listTools: () =>
    withClient(async (client) => {
      const tools: Tool[] = [];
      let cursor: string | undefined;
      do {
        const page = await client.listTools(cursor ? { cursor } : undefined);
        tools.push(...page.tools);
        cursor = page.nextCursor;
      } while (cursor);
      return tools;
    }),
  callTool: (name, args) =>
    withClient(async (client) => toOutcome((await client.callTool({ name, arguments: args })) as CallToolResult)),
};

/** Turn any thrown value into something a person can read. */
export function describeError(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return "Something went wrong talking to Frank.";
}
