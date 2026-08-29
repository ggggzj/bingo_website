/**
 * The one module that holds the shared secret. Everything here is about it not
 * leaking and not being sent to the wrong place.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createUpstreamStats } from "./upstream";

const BASE = "https://h1bchecker-production.up.railway.app";

// Typed with the arguments a fetcher really takes, so the assertions below can read
// the recorded url and init instead of casting an empty tuple.
function okFetch(body: unknown = { total: 1 }) {
  return vi.fn(
    async (_url: string, _init: RequestInit) =>
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  );
}

describe("asking the extension's API", () => {
  beforeEach(() => {
    process.env["STATS_API_BASE_URL"] = BASE;
    process.env["STATS_TOKEN"] = "the-shared-secret";
  });

  afterEach(() => {
    delete process.env["STATS_API_BASE_URL"];
    delete process.env["STATS_TOKEN"];
  });

  it("sends the secret as a header, and returns what came back", async () => {
    // A header rather than a query parameter, so the secret never lands in the other
    // service's access logs.
    const fetcher = okFetch({ total_clients: 79 });

    const body = await createUpstreamStats(fetcher)("/stats");

    expect(body).toEqual({ total_clients: 79 });
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe(`${BASE}/stats`);
    expect(new Headers(init.headers).get("x-stats-token")).toBe("the-shared-secret");
  });

  it("trims a trailing slash off the configured base rather than doubling it", async () => {
    process.env["STATS_API_BASE_URL"] = `${BASE}/`;
    const fetcher = okFetch();

    await createUpstreamStats(fetcher)("/stats");

    expect(fetcher.mock.calls[0]![0]).toBe(`${BASE}/stats`);
  });

  it("refuses to call anything when the service is not configured", async () => {
    // Without a base URL a relative fetch would resolve against this server, so an
    // unconfigured deploy would quietly ask itself for /stats and 404 forever.
    delete process.env["STATS_API_BASE_URL"];
    const fetcher = okFetch();

    await expect(createUpstreamStats(fetcher)("/stats")).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("refuses to call without a token rather than sending an empty one", async () => {
    delete process.env["STATS_TOKEN"];
    const fetcher = okFetch();

    await expect(createUpstreamStats(fetcher)("/stats")).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("treats anything but a 2xx as a failure", async () => {
    // The other service answers 404 for a wrong token exactly as for a wrong path,
    // so a bad token must not be reported to the owner as an empty dashboard.
    const fetcher = vi.fn(
      async (_url: string, _init: RequestInit) =>
        new Response("Not Found", { status: 404 }),
    );

    await expect(createUpstreamStats(fetcher)("/stats")).rejects.toThrow();
  });

  it("keeps the secret out of the error it throws", async () => {
    // Errors get logged, and a logged token is a leaked token.
    const fetcher = vi.fn(
      async (_url: string, _init: RequestInit) =>
        new Response("nope", { status: 500 }),
    );

    const err = await createUpstreamStats(fetcher)("/stats").catch((e: Error) => e);

    expect(String(err)).not.toContain("the-shared-secret");
  });
});
