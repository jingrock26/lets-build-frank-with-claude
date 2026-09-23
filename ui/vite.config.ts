import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// In production Frank serves this build at / and the console calls /mcp
// relatively (ADR-006) — there is no Frank URL to configure and no CORS.
// `npm run dev` keeps that shape by proxying to a Frank running locally
// (`cd server && npm run dev`), so dev is same-origin too.
const frank = process.env.FRANK_DEV_URL ?? "http://localhost:3000";

export default defineConfig({
  plugins: [react()],
  // Cloudscape alone is ~1.2 MB minified (~340 kB gzipped). Splitting a
  // two-page console to hide that number buys nothing.
  build: { chunkSizeWarningLimit: 1500 },
  server: {
    proxy: {
      "/mcp": frank,
      "/healthz": frank,
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    css: false,
  },
});
