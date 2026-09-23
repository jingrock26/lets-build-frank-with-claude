import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// All settings come from environment variables (ADR-001). Nothing here reads a
// config file with values in it.

// `<package root>` is server/ in development and /app in the container. Both
// src/config.ts and dist/config.js sit one level below it, so this resolves the
// same way whether Frank runs under tsx or from the build.
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export interface Config {
  /** Port to listen on. Must match the Dockerfile and deploy.yml --target-port. */
  port: number;
  /** Where the built console lives (ADR-006). May not exist — see app.ts. */
  publicDir: string;
  /** Frank's version, from package.json. */
  version: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    port: parsePort(env.PORT),
    publicDir: path.join(packageRoot, "public"),
    version: readVersion(),
  };
}

function parsePort(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === "") return 3000;
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`PORT must be a whole number between 1 and 65535, but it is "${raw}".`);
  }
  return port;
}

function readVersion(): string {
  const pkg = JSON.parse(readFileSync(path.join(packageRoot, "package.json"), "utf8")) as {
    version?: string;
  };
  return pkg.version ?? "0.0.0";
}
