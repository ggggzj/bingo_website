import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * Separate from `vite.config.ts` on purpose. That file carries the dev server,
 * the `/api` proxy and the Replit plugins, none of which a test run wants, and
 * it reads `PORT` at module scope. This config is the app's module graph and
 * nothing else — the same aliases, so an import resolves in a test exactly as
 * it does in the browser.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(
        import.meta.dirname,
        "..",
        "..",
        "attached_assets",
      ),
    },
    dedupe: ["react", "react-dom"],
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    restoreMocks: true,
  },
});
