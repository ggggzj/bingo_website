/**
 * What the assembled server mounts, and what it does not.
 *
 * Every other suite in this package builds a small express app around one
 * router, which is the right shape for testing a route's behaviour but cannot
 * see whether the real server mounts it. This file imports the aggregate
 * router — the same module `app.ts` mounts under `/api` — so that a path
 * answering 404 here is answering 404 for the reason the deployment would.
 *
 * The healthz assertion is not decoration. A test that only checked that
 * `/api/waitlist` answers 404 passes just as well on an app that failed to
 * mount anything at all, which is the way this exact test is usually wrong.
 * The control says the router is really there before the absence means
 * anything.
 */

import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import router from "./index";

function app() {
  const server = express();
  server.use(express.json());
  server.use("/api", router);
  return server;
}

describe("the assembled router", () => {
  it("still answers the health check", async () => {
    const res = await request(app()).get("/api/healthz");
    expect(res.status).toBe(200);
  });

  it("no longer offers the waitlist", async () => {
    const res = await request(app())
      .post("/api/waitlist")
      .send({ email: "someone@example.com" });

    expect(res.status).toBe(404);
  });
});
