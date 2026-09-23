import { describe, expect, it } from "vitest";
import { formatDuration, getStatus } from "../src/tools/get-status.js";
import { testContext } from "./helpers.js";

describe("get_status", () => {
  it("reports version, uptime and a greeting", async () => {
    const result = await getStatus.handler({}, testContext());
    expect(result).toMatchObject({
      name: "Frank",
      version: "9.9.9",
      startedAt: "2026-09-01T09:00:00.000Z",
      uptimeSeconds: 3723,
    });
    expect(result.summary).toBe("Frank v9.9.9 is up and has been running for 1h 2m 3s.");
    expect(result.greeting).not.toBe("");
  });

  it("produces output that matches its own output schema", async () => {
    const result = await getStatus.handler({}, testContext());
    expect(getStatus.outputSchema.safeParse(result).success).toBe(true);
  });

  it("never reports negative uptime if the clock goes backwards", async () => {
    const result = await getStatus.handler({}, testContext(new Date("2026-08-31T00:00:00.000Z")));
    expect(result.uptimeSeconds).toBe(0);
  });

  it("rejects unknown input fields", () => {
    expect(getStatus.inputSchema.safeParse({ unexpected: true }).success).toBe(false);
  });
});

describe("formatDuration", () => {
  it.each([
    [0, "0s"],
    [59, "59s"],
    [60, "1m"],
    [3600, "1h"],
    [90061, "1d 1h 1m 1s"],
  ])("formats %i seconds as %s", (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });
});
