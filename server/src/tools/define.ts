import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// The shared shape of every Frank tool, and the one place that turns a tool's
// return value into an MCP result. Conventions are ADR-002; the frank-tools
// skill restates them for agents.

/** `verb_noun`, lower snake_case, verb from the closed set. No create/update/delete/run. */
export const TOOL_VERBS = ["get", "list", "search", "summarize"] as const;
export const TOOL_NAME_PATTERN = new RegExp(`^(${TOOL_VERBS.join("|")})_[a-z]+(_[a-z]+)*$`);

/** What every tool can know about the Frank it runs inside. */
export interface ToolContext {
  version: string;
  startedAt: Date;
  now: () => Date;
}

/** Throw this for failures the caller should read. Its message is returned as-is. */
export class ToolError extends Error {}

type SummaryShape = { summary: z.ZodString };

export interface ToolDefinition<
  I extends z.ZodObject = z.ZodObject,
  O extends z.ZodObject<SummaryShape & z.ZodRawShape> = z.ZodObject<SummaryShape & z.ZodRawShape>,
> {
  name: string;
  title: string;
  /** One or two sentences for a model deciding whether to call this tool. */
  description: string;
  /** Must be `.strict()`: unknown fields are rejected. */
  inputSchema: I;
  /** A top-level `summary` string plus typed detail fields. */
  outputSchema: O;
  /** True if the tool reaches outside Frank (Azure, GitHub, the web). */
  openWorld: boolean;
  handler: (args: z.infer<I>, ctx: ToolContext) => Promise<z.infer<O>> | z.infer<O>;
}

export function defineTool<I extends z.ZodObject, O extends z.ZodObject<SummaryShape & z.ZodRawShape>>(
  tool: ToolDefinition<I, O>,
): ToolDefinition<I, O> {
  if (!TOOL_NAME_PATTERN.test(tool.name)) {
    throw new Error(
      `Tool name "${tool.name}" is out of policy: names are verb_noun with a verb from ${TOOL_VERBS.join(", ")} (ADR-002).`,
    );
  }
  return tool;
}

export function registerTool(server: McpServer, tool: ToolDefinition, ctx: ToolContext): void {
  server.registerTool(
    tool.name,
    {
      title: tool.title,
      description: tool.description,
      inputSchema: tool.inputSchema,
      outputSchema: tool.outputSchema,
      // Frank observes; he does not act (ADR-002).
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: tool.openWorld },
    },
    async (args: unknown): Promise<CallToolResult> => {
      try {
        const result = await tool.handler(args as z.infer<typeof tool.inputSchema>, ctx);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          structuredContent: result,
        };
      } catch (err) {
        if (err instanceof ToolError) return toolError(err.message);
        // Log the detail for whoever runs Frank; never hand a stack trace to the caller.
        console.error(`[${tool.name}] unexpected error`, err);
        return toolError(`Frank hit an unexpected problem running ${tool.name}. Try again; if it keeps happening, check Frank's logs.`);
      }
    },
  );
}

function toolError(message: string): CallToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}
