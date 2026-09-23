import { createApp } from "./app.js";
import { loadConfig } from "./config.js";

// Frank's entry point: read the environment, build the app, listen (ADR-001).
const config = loadConfig();
const startedAt = new Date();
const app = createApp(config, { version: config.version, startedAt, now: () => new Date() });

const server = app.listen(config.port, () => {
  console.log(`Frank v${config.version} listening on port ${config.port} — MCP at POST /mcp, health at GET /healthz`);
});

// Container Apps stops a replica with SIGTERM; finish in-flight requests first.
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    console.log(`[frank] ${signal} received, shutting down`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 10_000).unref();
  });
}
