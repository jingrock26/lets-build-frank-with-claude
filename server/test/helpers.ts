import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createApp } from "../src/app.js";
import type { Config } from "../src/config.js";
import type { ToolContext } from "../src/tools/define.js";

export const startedAt = new Date("2026-09-01T09:00:00.000Z");

export function testContext(now = new Date("2026-09-01T10:02:03.000Z")): ToolContext {
  return { version: "9.9.9", startedAt, now: () => now };
}

/** A real Frank on an ephemeral port, torn down with `close()`. */
export async function startFrank(overrides: Partial<Config> = {}): Promise<{ url: string; close: () => Promise<void> }> {
  const config: Config = { port: 0, publicDir: "/nonexistent-console", version: "9.9.9", ...overrides };
  const app = createApp(config, testContext());
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve()))),
  };
}

export async function connectClient(baseUrl: string): Promise<Client> {
  const client = new Client({ name: "frank-tests", version: "0.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL("/mcp", baseUrl)));
  return client;
}
