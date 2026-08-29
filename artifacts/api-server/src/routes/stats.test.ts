/**
 * The growth dashboard's data, which lives in a different service.
 *
 * The numbers come from the extension's API on Railway, behind a shared secret. That
 * secret stays on this server: the browser asks this server, this server asks the
 * other one. So there are two things to pin — that only the owner gets an answer,
 * and that nobody else can tell there was anything here to ask for.
 */

import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { InMemoryAuthStore } from "../lib/auth/memory-store";
import { hashPassword } from "../lib/auth/password";
import { createAuthRouter } from "./auth";
import { createStatsRouter, type UpstreamStats } from "./stats";

const PASSWORD = "correct horse battery staple";
const OWNER = "boss@example.com";
const STRANGER = "student@example.com";

const GATED = ["/api/stats", "/api/stats/daily", "/api/stats/registrations"];

function testApp(store: InMemoryAuthStore, upstream: UpstreamStats): Express {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api/auth", createAuthRouter(store));
  app.use("/api/stats", createStatsRouter(store, upstream));
  return app;
}

/** An upstream that answers everything with the same recognisable payload. */
function fakeUpstream() {
  return vi.fn(async (path: string) => ({ ok: true, path })) as UpstreamStats &
    ReturnType<typeof vi.fn>;
}

/**
 * Plant the account and sign in, rather than going through the sign-up form: the
 * owner's address is reserved there on purpose, and a stranger's account is not the
 * thing under test here.
 */
async function signedIn(
  app: Express,
  store: InMemoryAuthStore,
  email: string,
) {
  store.seedUser(email, await hashPassword(PASSWORD));
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ email, password: PASSWORD });
  return agent;
}

describe("only the owner sees the numbers", () => {
  let store: InMemoryAuthStore;
  let upstream: ReturnType<typeof fakeUpstream>;

  beforeEach(() => {
    store = new InMemoryAuthStore();
    upstream = fakeUpstream();
    process.env["OWNER_EMAIL"] = OWNER;
  });

  it.each(GATED)("answers %s for the owner", async (path) => {
    const agent = await signedIn(testApp(store, upstream), store, OWNER);

    const answer = await agent.get(path);

    expect(answer.status).toBe(200);
    expect(answer.body.ok).toBe(true);
  });

  it.each(GATED)("answers 404 at %s for a signed-in stranger", async (path) => {
    /* A real account is not a key. Everyone who signs up has a valid session, and it
       must buy them nothing here — not even the knowledge that the route exists. */
    const agent = await signedIn(testApp(store, upstream), store, STRANGER);

    expect((await agent.get(path)).status).toBe(404);
  });

  it.each(GATED)("answers 404 at %s for nobody at all", async (path) => {
    expect((await request(testApp(store, upstream)).get(path)).status).toBe(404);
  });

  it("never asks the other service on behalf of a stranger", async () => {
    // Not just "no answer": no request either. A gate that refuses the response but
    // still makes the upstream call has already spent the secret.
    const agent = await signedIn(testApp(store, upstream), store, STRANGER);

    await agent.get("/api/stats");

    expect(upstream).not.toHaveBeenCalled();
  });

  it("lets nobody in while OWNER_EMAIL is unset", async () => {
    delete process.env["OWNER_EMAIL"];
    const agent = await signedIn(testApp(store, upstream), store, OWNER);

    expect((await agent.get("/api/stats")).status).toBe(404);
  });

  it("closes the dashboard again when the owner signs out", async () => {
    const app = testApp(store, upstream);
    const agent = await signedIn(app, store, OWNER);
    expect((await agent.get("/api/stats")).status).toBe(200);

    await agent.post("/api/auth/logout");

    expect((await agent.get("/api/stats")).status).toBe(404);
  });
});

describe("what gets forwarded", () => {
  let store: InMemoryAuthStore;
  let upstream: ReturnType<typeof fakeUpstream>;

  beforeEach(() => {
    store = new InMemoryAuthStore();
    upstream = fakeUpstream();
    process.env["OWNER_EMAIL"] = OWNER;
  });

  it("passes the window the dashboard asked for", async () => {
    const agent = await signedIn(testApp(store, upstream), store, OWNER);

    await agent.get("/api/stats/daily?days=7");

    expect(upstream).toHaveBeenCalledWith("/stats/daily?days=7");
  });

  it("drops a window that is not a sensible number of days", async () => {
    /* The only two values this proxy forwards are numbers with known bounds. Anything
       else is dropped rather than passed on, so this route can never be used to shape
       a request to the other service. */
    const agent = await signedIn(testApp(store, upstream), store, OWNER);

    await agent.get("/api/stats/daily?days=99999");
    await agent.get("/api/stats/daily?days=../../secret");

    expect(upstream).toHaveBeenNthCalledWith(1, "/stats/daily");
    expect(upstream).toHaveBeenNthCalledWith(2, "/stats/daily");
  });

  it("says the other service failed, rather than pretending there is no dashboard", async () => {
    /* Only the owner ever reaches this branch, so a real error message costs nothing
       and saves them guessing whether they are locked out or the server is down. */
    const broken: UpstreamStats = async () => {
      throw new Error("upstream is down");
    };
    const agent = await signedIn(testApp(store, broken), store, OWNER);

    const answer = await agent.get("/api/stats");

    expect(answer.status).toBe(502);
  });

  it("keeps the shared secret out of everything the browser can see", async () => {
    process.env["STATS_TOKEN"] = "the-shared-secret";
    const agent = await signedIn(testApp(store, upstream), store, OWNER);

    const answer = await agent.get("/api/stats");

    const visible = JSON.stringify(answer.body) + JSON.stringify(answer.headers);
    expect(visible).not.toContain("the-shared-secret");
  });
});
