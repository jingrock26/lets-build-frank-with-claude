import { existsSync } from "node:fs";
import path from "node:path";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { type Express, type Request, type Response } from "express";
import type { Config } from "./config.js";
import { createFrankServer } from "./mcp.js";
import type { ToolContext } from "./tools/define.js";

// One Express app, one container (ADR-006):
//   POST /mcp     MCP over Streamable HTTP (ADR-001)
//   GET  /healthz liveness for probes (ADR-001, ADR-004)
//   GET  /        the Cloudscape console, if it has been built (ADR-003)
// There is no CORS configuration: the console is same-origin.
export function createApp(config: Config, ctx: ToolContext): Express {
  const app = express();
  app.disable("x-powered-by");

  app.get("/healthz", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  // Stateless Streamable HTTP: a fresh server and transport per request, so any
  // number of clients can share one Frank and a scale-to-zero restart loses
  // nothing. Frank's tools hold no per-session state to lose.
  app.post("/mcp", express.json({ limit: "1mb" }), async (req: Request, res: Response) => {
    const server = createFrankServer(ctx);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      console.error("[mcp] request failed", err);
      if (!res.headersSent) {
        res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null });
      }
    }
  });

  // Stateless mode has no standalone SSE stream and no session to delete.
  app.all("/mcp", (_req, res) => {
    res
      .status(405)
      .set("Allow", "POST")
      .json({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed. Send MCP requests with POST." }, id: null });
  });

  // The console is optional: it is built late in the class, and Frank must
  // serve MCP long before it exists (see the Dockerfile).
  if (existsSync(path.join(config.publicDir, "index.html"))) {
    app.use(express.static(config.publicDir, { index: "index.html" }));
  } else {
    app.get("/", (_req, res) => {
      res.status(200).type("html").send(noConsolePage(config.version));
    });
  }

  return app;
}

function noConsolePage(version: string): string {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Frank</title></head>
<body style="font-family: system-ui, sans-serif; max-width: 40rem; margin: 3rem auto; padding: 0 1rem; line-height: 1.5">
  <h1>Frank v${version} is running</h1>
  <p>The console has not been built yet (ADR-003). Frank serves MCP without it.</p>
  <ul>
    <li>MCP endpoint: <code>POST /mcp</code></li>
    <li>Health: <a href="/healthz"><code>GET /healthz</code></a></li>
  </ul>
</body>
</html>`;
}
