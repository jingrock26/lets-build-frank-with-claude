import { describe, expect, it } from "vitest";
import { z } from "zod";
import { defineTool, TOOL_NAME_PATTERN } from "../src/tools/define.js";
import { tools } from "../src/tools/index.js";

// ADR-002 as executable policy. A tool that breaks these rules fails the build.
describe("ADR-002 tool conventions", () => {
  it("registers at least one tool, with unique names", () => {
    const names = tools.map((t) => t.name);
    expect(names.length).toBeGreaterThan(0);
    expect(new Set(names).size).toBe(names.length);
  });

  describe.each(tools.map((t) => [t.name, t] as const))("%s", (_name, tool) => {
    it("is named verb_noun with a verb from the closed set", () => {
      expect(tool.name).toMatch(TOOL_NAME_PATTERN);
    });

    it("has a description written for a model", () => {
      expect(tool.description.trim().length).toBeGreaterThan(20);
    });

    it("rejects unknown input fields", () => {
      expect(tool.inputSchema.safeParse({ __not_a_real_field__: 1 }).success).toBe(false);
    });

    it("describes every input parameter", () => {
      for (const [key, schema] of Object.entries(tool.inputSchema.shape)) {
        expect((schema as z.ZodType).description, `parameter "${key}" needs a description`).toBeTruthy();
      }
    });

    it("returns a top-level summary string", () => {
      expect(tool.outputSchema.shape.summary).toBeInstanceOf(z.ZodString);
    });
  });

  it.each(["create_thing", "update_thing", "delete_thing", "run_thing", "getStatus", "get-status", "get"])(
    "refuses to define a tool named %s",
    (name) => {
      expect(() =>
        defineTool({
          name,
          title: "x",
          description: "x",
          inputSchema: z.object({}).strict(),
          outputSchema: z.object({ summary: z.string() }),
          openWorld: false,
          handler: () => ({ summary: "x" }),
        }),
      ).toThrow(/out of policy/);
    },
  );
});
