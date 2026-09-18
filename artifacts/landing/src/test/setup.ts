import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";

import { server } from "./server";

/**
 * jsdom has no ResizeObserver, and recharts' ResponsiveContainer constructs
 * one on mount — so without this any page carrying a chart throws before it
 * renders a single tile. A stub, not a polyfill: nothing here measures, and a
 * chart with no dimensions draws nothing, which is fine because these tests
 * assert on the numbers and the frame rather than on plotted bars.
 */
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

/**
 * `onUnhandledRequest: "error"` is the load-bearing setting. Without it a
 * component that quietly fires a request nobody planned for looks like a
 * passing test with an empty panel — which is exactly the failure these tests
 * exist to catch.
 */
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => server.close());
