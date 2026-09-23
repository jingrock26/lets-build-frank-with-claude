import { z } from "zod";
import { defineTool } from "./define.js";

// Frank's first tool (ADR-002): proves the pipeline, client wiring and console
// work before any Azure integration exists.
export const getStatus = defineTool({
  name: "get_status",
  title: "Get Frank's status",
  description:
    "Returns Frank's version, how long he has been running, and a greeting. Use it to check that Frank is reachable and which build is deployed; it says nothing about Azure.",
  inputSchema: z.object({}).strict(),
  outputSchema: z.object({
    summary: z.string().describe("One-line, human-readable status."),
    name: z.string().describe("Always \"Frank\"."),
    version: z.string().describe("Frank's version from package.json."),
    startedAt: z.string().describe("When this Frank process started, ISO 8601."),
    uptimeSeconds: z.number().int().nonnegative().describe("Seconds since startedAt."),
    greeting: z.string().describe("A hello from Frank."),
  }),
  openWorld: false,
  handler: (_args, ctx) => {
    const uptimeSeconds = Math.max(0, Math.floor((ctx.now().getTime() - ctx.startedAt.getTime()) / 1000));
    return {
      summary: `Frank v${ctx.version} is up and has been running for ${formatDuration(uptimeSeconds)}.`,
      name: "Frank",
      version: ctx.version,
      startedAt: ctx.startedAt.toISOString(),
      uptimeSeconds,
      greeting: "Hi, I'm Frank. I can look, but I don't touch — ask me what I can see.",
    };
  },
});

export function formatDuration(totalSeconds: number): string {
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const parts = [d && `${d}d`, h && `${h}h`, m && `${m}m`].filter(Boolean) as string[];
  if (s || parts.length === 0) parts.push(`${s}s`);
  return parts.join(" ");
}
