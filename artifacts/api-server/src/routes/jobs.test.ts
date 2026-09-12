/**
 * The route between a public page and a secret-bearing request.
 *
 * `stats.ts` set this repo's rule: the route does not forward the caller's query, it
 * holds an allowlist and builds the upstream path itself, "so it can never be steered
 * into asking that service for something the dashboard did not ask for". That rule is
 * what these tests hold down, widened here because three of the parameters are free
 * text typed by strangers.
 *
 * The real route and the real allowlist, against a fake upstream — never a mock of
 * the thing under test.
 */

import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createJobsRouter } from "./jobs";

const EMPTY = { total: 0, postings: [] };

/** Records the upstream path it was asked for, so the assertions read what the route
 * actually built rather than what it claims to build. */
function spyUpstream(body: unknown = EMPTY) {
  return vi.fn(async (_path: string) => body);
}

function appWith(upstream: ReturnType<typeof spyUpstream>) {
  const app = express();
  app.use("/api/jobs", createJobsRouter(upstream));
  return app;
}

function queryOf(path: string): URLSearchParams {
  return new URL(path, "https://example.test").searchParams;
}

describe("building the upstream request", () => {
  it("serves a page through the mounted route", async () => {
    const upstream = spyUpstream({ total: 1, postings: [{ job_id: 7 }] });

    const response = await request(appWith(upstream)).get("/api/jobs");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ total: 1, postings: [{ job_id: 7 }] });
    expect(upstream.mock.calls[0]![0]).toMatch(/^\/api\/postings/);
  });

  it("forwards only allowlisted parameters", async () => {
    const upstream = spyUpstream();

    await request(appWith(upstream)).get(
      "/api/jobs?employer=STRIPE&title=engineer&location=austin" +
        "&remote_only=true&posted_within_days=7&include_refusals=true" +
        "&limit=25&offset=50",
    );

    const query = queryOf(upstream.mock.calls[0]![0]);
    expect(Object.fromEntries(query)).toEqual({
      employer: "STRIPE",
      title: "engineer",
      location: "austin",
      remote_only: "true",
      posted_within_days: "7",
      include_refusals: "true",
      limit: "25",
      offset: "50",
    });
  });

  it("drops an unknown parameter", async () => {
    // The failure this prevents: a caller appending something the page never offers
    // and having it reach a service that trusts this one.
    const upstream = spyUpstream();

    await request(appWith(upstream)).get("/api/jobs?email=someone@example.com&admin=1");

    expect(queryOf(upstream.mock.calls[0]![0]).toString()).toBe("");
  });

  it("cannot be steered to another upstream path", async () => {
    // The route builds the path itself. Nothing a caller sends may change which
    // upstream endpoint is asked.
    const upstream = spyUpstream();

    await request(appWith(upstream)).get(
      "/api/jobs?title=" + encodeURIComponent("x#/stats?days=1"),
    );

    const path = upstream.mock.calls[0]![0];
    expect(path.startsWith("/api/postings?")).toBe(true);
    expect(path).not.toContain("/stats");
    expect(queryOf(path).get("title")).toBe("x#/stats?days=1");
  });

  it("drops an out-of-range limit rather than refusing the request", async () => {
    // The stats precedent: a nonsense window should still draw the page, on the
    // other service's default.
    const upstream = spyUpstream();

    const response = await request(appWith(upstream)).get("/api/jobs?limit=5000");

    expect(response.status).toBe(200);
    expect(queryOf(upstream.mock.calls[0]![0]).has("limit")).toBe(false);
  });

  it("drops an out-of-range offset and a nonsense window", async () => {
    const upstream = spyUpstream();

    await request(appWith(upstream)).get(
      "/api/jobs?offset=99999999&posted_within_days=0",
    );

    const query = queryOf(upstream.mock.calls[0]![0]);
    expect(query.has("offset")).toBe(false);
    expect(query.has("posted_within_days")).toBe(false);
  });

  it("drops a boolean that is not true or false", async () => {
    const upstream = spyUpstream();

    await request(appWith(upstream)).get("/api/jobs?remote_only=maybe&include_refusals=1");

    const query = queryOf(upstream.mock.calls[0]![0]);
    expect(query.has("remote_only")).toBe(false);
    expect(query.has("include_refusals")).toBe(false);
  });

  it("drops a repeated parameter instead of forwarding an array", async () => {
    // Express parses ?title=a&title=b into an array. Forwarding that would send a
    // shape the upstream route's validator has never seen.
    const upstream = spyUpstream();

    await request(appWith(upstream)).get("/api/jobs?title=a&title=b");

    expect(queryOf(upstream.mock.calls[0]![0]).has("title")).toBe(false);
  });
});

describe("text parameters", () => {
  it("encodes text so it stays a value", async () => {
    const upstream = spyUpstream();

    await request(appWith(upstream)).get(
      "/api/jobs?location=" + encodeURIComponent("Irving Texas & Raleigh"),
    );

    const path = upstream.mock.calls[0]![0];
    expect(path).toContain("location=Irving+Texas+%26+Raleigh");
    expect(queryOf(path).get("location")).toBe("Irving Texas & Raleigh");
  });

  it("keeps a quote as data, not as syntax", async () => {
    const upstream = spyUpstream();

    await request(appWith(upstream)).get(
      "/api/jobs?title=" + encodeURIComponent("' OR 1=1 --"),
    );

    expect(queryOf(upstream.mock.calls[0]![0]).get("title")).toBe("' OR 1=1 --");
  });

  it("drops oversized text rather than sending it on", async () => {
    const upstream = spyUpstream();

    const response = await request(appWith(upstream)).get(
      "/api/jobs?title=" + "x".repeat(500),
    );

    expect(response.status).toBe(200);
    expect(queryOf(upstream.mock.calls[0]![0]).has("title")).toBe(false);
  });

  it("drops empty and whitespace-only text", async () => {
    const upstream = spyUpstream();

    await request(appWith(upstream)).get("/api/jobs?title=&location=%20%20");

    const query = queryOf(upstream.mock.calls[0]![0]);
    expect(query.has("title")).toBe(false);
    expect(query.has("location")).toBe(false);
  });
});

describe("when the job feed cannot be reached", () => {
  it("answers 502 and does not leak the reason", async () => {
    const upstream = vi.fn(async () => {
      throw new Error("Job feed answered 503 for /api/postings");
    });

    const response = await request(appWith(upstream)).get("/api/jobs");

    expect(response.status).toBe(502);
    expect(JSON.stringify(response.body)).not.toContain("503");
  });
});
