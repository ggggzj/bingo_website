import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";

import { server } from "./server";

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
