import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    // The db package throws at import time when DATABASE_URL is missing. Nothing
    // under test talks to Postgres — the auth routes take a store — but the value
    // has to exist for the module graph to load.
    env: { DATABASE_URL: "postgres://unused-in-tests" },
    /*
     * Bounded parallelism, because this suite is memory-bound rather than
     * CPU-bound and oversubscribing it thrashes.
     *
     * Auth is tested against real scrypt — deliberately, it is what makes these
     * tests worth having — and `CURRENT` is N=32768, r=8, so every hash asks for
     * 64MB. One worker per core means eight of those allocations racing, and
     * measured on an 8-core machine on 2026-09-18 the result was not slowness
     * but *flakiness*: unbounded runs failed 3 of 6 times, always as a 5s
     * timeout, and always in whichever pre-existing test happened to be running
     * during a spike rather than in anything slow of its own (the slowest test
     * in a good run is 297ms).
     *
     * Capped at half the cores: 6 of 6 runs green, and 3.3s wall clock against
     * 9.2s fully serial and 10-28s unbounded. Faster *and* stable, which is the
     * unusual case where the safe choice costs nothing.
     *
     * A fraction rather than a number so a CI box with a different core count
     * gets the same ratio.
     */
    maxWorkers: "50%",
  },
});
