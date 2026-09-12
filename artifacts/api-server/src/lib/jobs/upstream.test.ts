/**
 * The one module that holds the job feed's shared secret. Everything here is about
 * it not leaking and not being sent to the wrong place.
 *
 * Deliberately a second secret rather than reusing STATS_TOKEN. That one opens the
 * owner's own numbers; this one opens open postings. Rotating the job feed's access
 * must not lock the owner out of their dashboard.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createUpstreamJobs } from "./upstream";

const BASE = "https://h1bchecker-production.up.railway.app";

function okFetch(body: unknown = { total: 0, postings: [] }) {
  return vi.fn(
    async (_url: string, _init: RequestInit) =>
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  );
}

describe("asking the extension's API for postings", () => {
  beforeEach(() => {
    process.env["JOBS_API_BASE_URL"] = BASE;
    process.env["POSTINGS_TOKEN"] = "the-websites-key";
  });

  afterEach(() => {
    delete process.env["JOBS_API_BASE_URL"];
    delete process.env["POSTINGS_TOKEN"];
    delete process.env["STATS_TOKEN"];
  });

  it("sends the secret as a header, and returns what came back", async () => {
    // A header rather than a query parameter, because the value is a password and
    // query strings land in access logs and browser history.
    const fetcher = okFetch({ total: 2, postings: [{ job_id: 1 }] });

    const body = await createUpstreamJobs(fetcher)("/api/postings?limit=20");

    expect(body).toEqual({ total: 2, postings: [{ job_id: 1 }] });
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe(`${BASE}/api/postings?limit=20`);
    expect(new Headers(init.headers).get("x-postings-token")).toBe("the-websites-key");
  });

  it("trims a trailing slash off the configured base rather than doubling it", async () => {
    process.env["JOBS_API_BASE_URL"] = `${BASE}/`;
    const fetcher = okFetch();

    await createUpstreamJobs(fetcher)("/api/postings");

    expect(fetcher.mock.calls[0]![0]).toBe(`${BASE}/api/postings`);
  });

  it("refuses to call anything when the base url is not configured", async () => {
    // A relative fetch would resolve against this server, so an unconfigured deploy
    // would quietly ask itself for postings and 404 forever.
    delete process.env["JOBS_API_BASE_URL"];
    const fetcher = okFetch();

    await expect(createUpstreamJobs(fetcher)("/api/postings")).rejects.toThrow(
      /JOBS_API_BASE_URL/,
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("throws when the secret is unset rather than sending an empty one", async () => {
    // An empty token is not a smaller credential, it is a request that will 404 in a
    // way that looks exactly like a locked door.
    delete process.env["POSTINGS_TOKEN"];
    const fetcher = okFetch();

    await expect(createUpstreamJobs(fetcher)("/api/postings")).rejects.toThrow(
      /POSTINGS_TOKEN/,
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("does not accept the stats secret as a substitute", async () => {
    // Three doors, three keys. If this module ever fell back to STATS_TOKEN, a
    // rotation of one would silently change who can read the other.
    delete process.env["POSTINGS_TOKEN"];
    process.env["STATS_TOKEN"] = "the-owners-key";
    const fetcher = okFetch();

    await expect(createUpstreamJobs(fetcher)("/api/postings")).rejects.toThrow(
      /POSTINGS_TOKEN/,
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("never puts the token in an error", async () => {
    // Errors get logged. The one thing that must never reach a log is the secret.
    const fetcher = vi.fn(
      async () => new Response("nope", { status: 503 }),
    ) as unknown as (url: string, init: RequestInit) => Promise<Response>;

    let failure: Error | undefined;
    try {
      await createUpstreamJobs(fetcher)("/api/postings");
    } catch (err) {
      failure = err as Error;
    }

    expect(failure).toBeDefined();
    expect(failure!.message).toContain("503");
    expect(failure!.message).toContain("/api/postings");
    expect(failure!.message).not.toContain("the-websites-key");
  });
});
