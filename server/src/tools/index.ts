import type { ToolDefinition } from "./define.js";
import { getStatus } from "./get-status.js";

// Every tool Frank exposes. Add new ones here, one module each (ADR-001).
export const tools = [getStatus] as unknown as ToolDefinition[];
