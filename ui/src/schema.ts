// Turns a tool's JSON Schema (from MCP discovery) into form fields, and form
// values back into tool arguments. This is why a new tool appears in the
// console with zero UI work (ADR-003, ADR-002).

export type FieldKind = "string" | "enum" | "number" | "integer" | "boolean" | "list" | "json";

export interface Field {
  name: string;
  label: string;
  description?: string;
  required: boolean;
  kind: FieldKind;
  options?: string[];
  defaultValue?: unknown;
}

export type FormValues = Record<string, string | boolean>;

interface JsonSchema {
  type?: string | string[];
  title?: string;
  description?: string;
  enum?: unknown[];
  default?: unknown;
  items?: JsonSchema;
  properties?: Record<string, JsonSchema>;
  required?: string[];
}

export function fieldsFromSchema(schema: unknown): Field[] {
  const s = (schema ?? {}) as JsonSchema;
  const required = new Set(s.required ?? []);
  return Object.entries(s.properties ?? {}).map(([name, prop]) => ({
    name,
    label: prop.title ?? name,
    description: prop.description,
    required: required.has(name),
    ...kindOf(prop),
    defaultValue: prop.default,
  }));
}

function kindOf(prop: JsonSchema): Pick<Field, "kind" | "options"> {
  const type = Array.isArray(prop.type) ? prop.type.find((t) => t !== "null") : prop.type;
  if (prop.enum && prop.enum.every((v) => typeof v === "string")) return { kind: "enum", options: prop.enum as string[] };
  if (type === "string") return { kind: "string" };
  if (type === "integer") return { kind: "integer" };
  if (type === "number") return { kind: "number" };
  if (type === "boolean") return { kind: "boolean" };
  if (type === "array" && prop.items?.type === "string") return { kind: "list" };
  return { kind: "json" };
}

export function initialValues(fields: Field[]): FormValues {
  const values: FormValues = {};
  for (const f of fields) {
    if (f.kind === "boolean") values[f.name] = f.defaultValue === true;
    else if (f.defaultValue === undefined) values[f.name] = "";
    else if (f.kind === "list" && Array.isArray(f.defaultValue)) values[f.name] = f.defaultValue.join("\n");
    else if (f.kind === "json") values[f.name] = JSON.stringify(f.defaultValue, null, 2);
    else values[f.name] = String(f.defaultValue);
  }
  return values;
}

export type BuildResult = { ok: true; args: Record<string, unknown> } | { ok: false; errors: Record<string, string> };

/** Empty optional fields are omitted, so Frank's strict schemas see only what the user filled in. */
export function buildArguments(fields: Field[], values: FormValues): BuildResult {
  const args: Record<string, unknown> = {};
  const errors: Record<string, string> = {};
  for (const f of fields) {
    const raw = values[f.name];
    if (f.kind === "boolean") {
      if (raw === true || f.required) args[f.name] = raw === true;
      continue;
    }
    const text = typeof raw === "string" ? raw.trim() : "";
    if (text === "") {
      if (f.required) errors[f.name] = "Required.";
      continue;
    }
    switch (f.kind) {
      case "number":
      case "integer": {
        const n = Number(text);
        if (!Number.isFinite(n)) errors[f.name] = "Enter a number.";
        else if (f.kind === "integer" && !Number.isInteger(n)) errors[f.name] = "Enter a whole number.";
        else args[f.name] = n;
        break;
      }
      case "list":
        args[f.name] = text.split("\n").map((l) => l.trim()).filter(Boolean);
        break;
      case "json":
        try {
          args[f.name] = JSON.parse(text);
        } catch {
          errors[f.name] = "Enter valid JSON.";
        }
        break;
      default:
        args[f.name] = text;
    }
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, args };
}
