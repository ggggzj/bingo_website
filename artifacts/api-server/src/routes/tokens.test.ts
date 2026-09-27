/**
 * Issuing a personal token.
 *
 * Three properties are worth a test here and the rest is the store's: that a bearer cannot
 * mint a token, that a scope outside the two is refused rather than stored, and that issuing
 * one scope leaves the other alone.
 *
 * Real hashing and a real session, against the in-memory stores — the same shape every other
 * route test in this directory uses.
 */

import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { InMemoryAuthStore } from "../lib/auth/memory-store";
import { hashPassword } from "../lib/auth/password";
import { hashToken } from "../lib/auth/session";
import { InMemoryTokenStore } from "../lib/tokens/store";
import { createAuthRouter } from "./auth";
import { createTokensRouter } from "./tokens";

const PASSWORD = "correct horse battery staple";
const OWNER = "boss@example.com";
const STRANGER = "student@example.com";

function testApp(store: InMemoryAuthStore, tokens: InMemoryTokenStore): Express {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api/auth", createAuthRouter(store));
  app.use("/api/tokens", createTokensRouter(store, tokens));
  return app;
}

async function signedIn(app: Express, store: InMemoryAuthStore, email: string) {
  store.seedUser(email, await hashPassword(PASSWORD));
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ email, password: PASSWORD });
  return agent;
}

describe("POST /tokens", () => {
  let store: InMemoryAuthStore;
  let tokens: InMemoryTokenStore;

  beforeEach(() => {
    process.env["OWNER_EMAIL"] = OWNER;
    store = new InMemoryAuthStore();
    tokens = new InMemoryTokenStore();
  });

  it("issues a token to the owner, once, and stores only its hash", async () => {
    const app = testApp(store, tokens);

    const owner = await signedIn(app, store, OWNER);
    const res = await owner.post("/api/tokens").send({ scope: "applications" });

    expect(res.status).toBe(201);
    expect(res.body.scope).toBe("applications");
    expect(res.body.token.length).toBeGreaterThan(20);

    // The plaintext is in the response and nowhere else; the store holds the hash.
    const user = await store.findUserByEmail(OWNER);
    tokens.seedUser({ id: user!.id, email: OWNER });
    expect(
      await tokens.findUserByLiveToken(hashToken(res.body.token), "applications", new Date()),
    ).toMatchObject({ id: user!.id });
  });

  /**
   * The rule this route exists to hold. If a token could mint its successor, a leaked one
   * could ask for a wider scope and the scope would stop meaning anything.
   */
  it("refuses a bearer token: a token cannot mint its successor", async () => {
    const app = testApp(store, tokens);

    const owner = await signedIn(app, store, OWNER);
    const issued = await owner.post("/api/tokens").send({ scope: "applications" });

    const withBearer = await request(app)
      .post("/api/tokens")
      .set("Authorization", `Bearer ${issued.body.token}`)
      .send({ scope: "applications" });

    expect(withBearer.status).toBe(404);
  });

  it("refuses a scope it does not issue, rather than storing it", async () => {
    const app = testApp(store, tokens);

    const owner = await signedIn(app, store, OWNER);
    const res = await owner.post("/api/tokens").send({ scope: "everything" });

    expect(res.status).toBe(400);
  });

  it("answers 404 to a signed-in stranger and to nobody alike", async () => {
    const app = testApp(store, tokens);

    const stranger = await signedIn(app, store, STRANGER);
    const asStranger = await stranger.post("/api/tokens").send({ scope: "applications" });
    const anonymous = await request(app).post("/api/tokens").send({ scope: "applications" });

    expect(asStranger.status).toBe(404);
    expect(anonymous.status).toBe(404);
    expect(asStranger.body).toEqual(anonymous.body);
  });

  it("issuing one scope leaves the other scope's token alive", async () => {
    const app = testApp(store, tokens);

    const owner = await signedIn(app, store, OWNER);
    const user = await store.findUserByEmail(OWNER);
    tokens.seedUser({ id: user!.id, email: OWNER });

    const practice = (await owner.post("/api/tokens").send({ scope: "coach" })).body
      .token as string;
    await owner.post("/api/tokens").send({ scope: "applications" });

    // Asking for a folder token must not sign the practice bridge out.
    expect(
      await tokens.findUserByLiveToken(hashToken(practice), "coach", new Date()),
    ).toMatchObject({ id: user!.id });
  });
});

describe("DELETE /tokens", () => {
  let store: InMemoryAuthStore;
  let tokens: InMemoryTokenStore;

  beforeEach(() => {
    process.env["OWNER_EMAIL"] = OWNER;
    store = new InMemoryAuthStore();
    tokens = new InMemoryTokenStore();
  });

  it("revokes one scope and is idempotent", async () => {
    const app = testApp(store, tokens);

    const owner = await signedIn(app, store, OWNER);
    const user = await store.findUserByEmail(OWNER);
    tokens.seedUser({ id: user!.id, email: OWNER });

    const issued = (await owner.post("/api/tokens").send({ scope: "applications" })).body
      .token as string;

    expect((await owner.delete("/api/tokens").send({ scope: "applications" })).status).toBe(200);
    expect(
      await tokens.findUserByLiveToken(hashToken(issued), "applications", new Date()),
    ).toBeNull();
    // Again, on an empty slate.
    expect((await owner.delete("/api/tokens").send({ scope: "applications" })).status).toBe(200);
  });

  it("answers 404 to anyone who is not the owner", async () => {
    const app = testApp(store, tokens);

    const stranger = await signedIn(app, store, STRANGER);
    const res = await stranger.delete("/api/tokens").send({ scope: "applications" });

    expect(res.status).toBe(404);
  });
});
