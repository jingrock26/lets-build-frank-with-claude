import { describe, expect, it } from "vitest";
import { buildArguments, fieldsFromSchema, initialValues } from "../src/schema";

const schema = {
  type: "object",
  properties: {
    query: { type: "string", description: "What to look for." },
    limit: { type: "integer", default: 10 },
    ratio: { type: "number" },
    verbose: { type: "boolean" },
    region: { type: "string", enum: ["eastus", "westeurope"] },
    tags: { type: "array", items: { type: "string" } },
    filter: { type: "object" },
  },
  required: ["query"],
  additionalProperties: false,
};

describe("fieldsFromSchema", () => {
  it("maps each JSON Schema property to a field kind", () => {
    const fields = fieldsFromSchema(schema);
    expect(fields.map((f) => [f.name, f.kind, f.required])).toEqual([
      ["query", "string", true],
      ["limit", "integer", false],
      ["ratio", "number", false],
      ["verbose", "boolean", false],
      ["region", "enum", false],
      ["tags", "list", false],
      ["filter", "json", false],
    ]);
    expect(fields[0]?.description).toBe("What to look for.");
    expect(fields[4]?.options).toEqual(["eastus", "westeurope"]);
  });

  it("returns no fields for a tool with no input, like get_status", () => {
    expect(fieldsFromSchema({ type: "object", properties: {}, additionalProperties: false })).toEqual([]);
    expect(fieldsFromSchema(undefined)).toEqual([]);
  });
});

describe("buildArguments", () => {
  const fields = fieldsFromSchema(schema);

  it("uses defaults as initial values", () => {
    expect(initialValues(fields)).toMatchObject({ query: "", limit: "10", verbose: false });
  });

  it("converts form values to typed arguments and omits empty optional fields", () => {
    const result = buildArguments(fields, {
      ...initialValues(fields),
      query: " vms ",
      limit: "5",
      tags: "a\n\n b ",
      filter: '{"x":1}',
    });
    expect(result).toEqual({ ok: true, args: { query: "vms", limit: 5, tags: ["a", "b"], filter: { x: 1 } } });
  });

  it("reports missing required fields and bad values", () => {
    const result = buildArguments(fields, { ...initialValues(fields), limit: "2.5", ratio: "abc", filter: "{" });
    expect(result).toEqual({
      ok: false,
      errors: { query: "Required.", limit: "Enter a whole number.", ratio: "Enter a number.", filter: "Enter valid JSON." },
    });
  });

  it("builds empty arguments for a tool with no input", () => {
    expect(buildArguments([], {})).toEqual({ ok: true, args: {} });
  });
});
