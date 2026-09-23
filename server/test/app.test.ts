import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connectClient, startFrank } from "./helpers.js";

describe("Frank over HTTP (no console built)", () => {
  let frank: Awaited<ReturnType<typeof startFrank>>;
  beforeAll(async () => {
    frank = await startFrank();
  });
  afterAll(() => frank.close());

  it("answers GET /healthz with 200", async () => {
    const res = await fetch(`${frank.url}/healthz`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });

  it("says at / that the console has not been built", async () => {
    const res = await fetch(`${frank.url}/`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("console has not been built yet");
  });

  it("rejects GET /mcp with 405", async () => {
    const res = await fetch(`${frank.url}/mcp`);
    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("POST");
  });

  it("lists get_status as a read-only tool over MCP", async () => {
    const client = await connectClient(frank.url);
    try {
      const { tools } = await client.listTools();
      const status = tools.find((t) => t.name === "get_status");
      expect(status).toBeDefined();
      expect(status?.annotations?.readOnlyHint).toBe(true);
      expect(status?.annotations?.destructiveHint).toBe(false);
      expect(status?.inputSchema.type).toBe("object");
    } finally {
      await client.close();
    }
  });

  it("calls get_status and returns structured content with a summary", async () => {
    const client = await connectClient(frank.url);
    try {
      const result = await client.callTool({ name: "get_status", arguments: {} });
      expect(result.isError).toBeFalsy();
      expect(result.structuredContent).toMatchObject({ name: "Frank", version: "9.9.9" });
      expect((result.structuredContent as { summary: string }).summary).toMatch(/^Frank v9\.9\.9 is up/);
    } finally {
      await client.close();
    }
  });

  it("returns a plain-language error, not a stack trace, for bad arguments", async () => {
    const client = await connectClient(frank.url);
    try {
      const result = await client.callTool({ name: "get_status", arguments: { nope: 1 } });
      expect(result.isError).toBe(true);
      expect(JSON.stringify(result.content)).not.toMatch(/\bat .+\.(ts|js):\d+/);
    } finally {
      await client.close();
    }
  });

  it("serves many clients from one Frank", async () => {
    const clients = await Promise.all([1, 2, 3].map(() => connectClient(frank.url)));
    try {
      const results = await Promise.all(clients.map((c) => c.callTool({ name: "get_status", arguments: {} })));
      for (const r of results) expect(r.isError).toBeFalsy();
    } finally {
      await Promise.all(clients.map((c) => c.close()));
    }
  });
});

describe("Frank over HTTP (console built)", () => {
  let frank: Awaited<ReturnType<typeof startFrank>>;
  let publicDir: string;
  beforeAll(async () => {
    publicDir = mkdtempSync(path.join(tmpdir(), "frank-console-"));
    writeFileSync(path.join(publicDir, "index.html"), "<!doctype html><title>console</title>");
    frank = await startFrank({ publicDir });
  });
  afterAll(async () => {
    await frank.close();
    rmSync(publicDir, { recursive: true, force: true });
  });

  it("serves the console at /", async () => {
    const res = await fetch(`${frank.url}/`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("<title>console</title>");
  });
});
