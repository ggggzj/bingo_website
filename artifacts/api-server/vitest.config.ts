import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    // The db package throws at import time when DATABASE_URL is missing. Nothing
    // under test talks to Postgres — the auth routes take a store — but the value
    // has to exist for the module graph to load.
    env: { DATABASE_URL: "postgres://unused-in-tests" },
  },
});
