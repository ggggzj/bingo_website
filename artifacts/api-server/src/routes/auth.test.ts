/**
 * Sign-up and sign-in for the website.
 *
 * The routes take an `AuthStore` rather than reaching for the database directly,
 * so these run against an in-memory one — no Postgres, no fixtures to reset. What
 * they exercise is the real thing otherwise: the real Express app, the real
 * scrypt hashing, the real cookie.
 */

import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { hashPassword } from "../lib/auth/password";
import { InMemoryAuthStore } from "../lib/auth/memory-store";
import { createAuthRouter } from "./auth";

const PASSWORD = "correct horse battery staple";

function testApp(store: InMemoryAuthStore): Express {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api/auth", createAuthRouter(store));
  return app;
}

describe("registering and being recognised", () => {
  let store: InMemoryAuthStore;

  beforeEach(() => {
    store = new InMemoryAuthStore();
  });

  it("signs a new person up, and then knows who they are", async () => {
    const agent = request.agent(testApp(store));

    const created = await agent
      .post("/api/auth/register")
      .send({ email: "me@example.com", password: PASSWORD });
    expect(created.status).toBe(201);

    const me = await agent.get("/api/auth/me");

    expect(me.status).toBe(200);
    expect(me.body).toEqual({ email: "me@example.com", isOwner: false });
  });
});

describe("signing in", () => {
  let store: InMemoryAuthStore;

  beforeEach(() => {
    store = new InMemoryAuthStore();
  });

  async function signUp(app: Express, email: string) {
    await request(app).post("/api/auth/register").send({ email, password: PASSWORD });
  }

  it("lets someone who already has an account back in", async () => {
    const app = testApp(store);
    await signUp(app, "me@example.com");
    const agent = request.agent(app);

    const login = await agent
      .post("/api/auth/login")
      .send({ email: "me@example.com", password: PASSWORD });

    expect(login.status).toBe(200);
    expect((await agent.get("/api/auth/me")).body.email).toBe("me@example.com");
  });

  it("refuses a wrong password, and leaves no session behind", async () => {
    const app = testApp(store);
    await signUp(app, "me@example.com");
    const agent = request.agent(app);

    const login = await agent
      .post("/api/auth/login")
      .send({ email: "me@example.com", password: "not the password" });

    expect(login.status).toBe(401);
    expect((await agent.get("/api/auth/me")).status).toBe(401);
  });

  it("answers an unknown address exactly as it answers a wrong password", async () => {
    /* Otherwise the login box becomes a way to ask "does this person have an account
       here" — one request per address, for any address you care to try. */
    const app = testApp(store);
    await signUp(app, "me@example.com");

    const wrongPassword = await request(app)
      .post("/api/auth/login")
      .send({ email: "me@example.com", password: "not the password" });
    const noSuchPerson = await request(app)
      .post("/api/auth/login")
      .send({ email: "stranger@example.com", password: PASSWORD });

    expect(noSuchPerson.status).toBe(wrongPassword.status);
    expect(noSuchPerson.body).toEqual(wrongPassword.body);
  });
});

describe("signing out, and sessions that should not work", () => {
  let store: InMemoryAuthStore;

  beforeEach(() => {
    store = new InMemoryAuthStore();
  });

  async function signedIn(app: Express, email = "me@example.com") {
    const agent = request.agent(app);
    await agent.post("/api/auth/register").send({ email, password: PASSWORD });
    return agent;
  }

  it("ends the session, and the same cookie stops working", async () => {
    /* Replaying the cookie by hand is the point: a browser throwing it away proves
       nothing about whether the server would still have honoured it. */
    const app = testApp(store);
    const agent = await signedIn(app);
    expect((await agent.get("/api/auth/me")).status).toBe(200);

    expect((await agent.post("/api/auth/logout")).status).toBe(200);

    expect((await agent.get("/api/auth/me")).status).toBe(401);
  });

  it("says it signed you out even when you were never signed in", async () => {
    // A caller asking to be signed out should never be told they were not.
    expect((await request(testApp(store)).post("/api/auth/logout")).status).toBe(200);
  });

  it("stops honouring a session once it has expired", async () => {
    const app = testApp(store);
    const agent = await signedIn(app);

    store.expireSessionsBefore(new Date());

    expect((await agent.get("/api/auth/me")).status).toBe(401);
  });

  it("treats a made-up cookie as nobody", async () => {
    const answer = await request(testApp(store))
      .get("/api/auth/me")
      .set("Cookie", "bingo_session=not-a-real-token");

    expect(answer.status).toBe(401);
  });
});

describe("the address is the account", () => {
  let store: InMemoryAuthStore;

  beforeEach(() => {
    store = new InMemoryAuthStore();
  });

  it("does not care how you capitalised it, then or now", async () => {
    /* People type their own address differently on different days. Two accounts for
       one person is the bug; being locked out by a capital letter is the worse one. */
    const app = testApp(store);
    await request(app)
      .post("/api/auth/register")
      .send({ email: "  Me@Example.COM ", password: PASSWORD });

    const agent = request.agent(app);
    const login = await agent
      .post("/api/auth/login")
      .send({ email: "me@example.com", password: PASSWORD });

    expect(login.status).toBe(200);
    expect(login.body.email).toBe("me@example.com");
  });

  it("refuses a second account on an address that already has one", async () => {
    const app = testApp(store);
    await request(app)
      .post("/api/auth/register")
      .send({ email: "me@example.com", password: PASSWORD });

    const again = await request(app)
      .post("/api/auth/register")
      .send({ email: "ME@example.com", password: "a different password" });

    expect(again.status).toBe(409);
  });

  it("will not take a password too short to be worth hashing", async () => {
    const answer = await request(testApp(store))
      .post("/api/auth/register")
      .send({ email: "me@example.com", password: "short" });

    expect(answer.status).toBe(422);
  });
});

describe("who counts as the owner", () => {
  let store: InMemoryAuthStore;

  beforeEach(() => {
    store = new InMemoryAuthStore();
    delete process.env["OWNER_EMAIL"];
  });

  /**
   * Signs in rather than signs up, because the owner's own address cannot be
   * registered through the form — see the group below. Everything here is about what
   * the answer says once you are in.
   */
  async function signedInAs(email: string) {
    store.seedUser(email.trim().toLowerCase(), await hashPassword(PASSWORD));
    return request(testApp(store))
      .post("/api/auth/login")
      .send({ email, password: PASSWORD });
  }

  it("marks the configured address as the owner", async () => {
    process.env["OWNER_EMAIL"] = "boss@example.com";

    expect((await signedInAs("boss@example.com")).body.isOwner).toBe(true);
  });

  it("marks everyone else as not the owner", async () => {
    process.env["OWNER_EMAIL"] = "boss@example.com";

    expect((await signedInAs("someone@example.com")).body.isOwner).toBe(false);
  });

  it("reads the configured address ignoring case and stray spaces", async () => {
    // It is typed by hand into a deploy console; a capital letter must not lock the
    // owner out of their own dashboard.
    process.env["OWNER_EMAIL"] = "  Boss@Example.COM ";

    expect((await signedInAs("boss@example.com")).body.isOwner).toBe(true);
  });

  it("makes nobody the owner when the setting is missing or blank", async () => {
    // Fail closed: an unset variable is a deploy that forgot, not an open door.
    expect((await signedInAs("first@example.com")).body.isOwner).toBe(false);

    process.env["OWNER_EMAIL"] = " , ";
    expect((await signedInAs("second@example.com")).body.isOwner).toBe(false);
  });
});

describe("guessing at a password", () => {
  let store: InMemoryAuthStore;

  beforeEach(() => {
    store = new InMemoryAuthStore();
  });

  it("stops answering a caller who keeps getting it wrong", async () => {
    /* A password is only as good as the number of tries someone gets. Each test app
       builds its own router, so the counter here belongs to this test alone. */
    const app = testApp(store);
    await request(app)
      .post("/api/auth/register")
      .send({ email: "me@example.com", password: PASSWORD });

    let last = await request(app).post("/api/auth/login").send({});
    for (let attempt = 0; attempt < 20 && last.status !== 429; attempt++) {
      last = await request(app)
        .post("/api/auth/login")
        .send({ email: "me@example.com", password: `guess-${attempt}` });
    }

    expect(last.status).toBe(429);
  });

  it("still lets the real password through before the limit is reached", async () => {
    const app = testApp(store);
    await request(app)
      .post("/api/auth/register")
      .send({ email: "me@example.com", password: PASSWORD });

    await request(app)
      .post("/api/auth/login")
      .send({ email: "me@example.com", password: "one wrong go" });
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: "me@example.com", password: PASSWORD });

    expect(login.status).toBe(200);
  });
});

describe("the owner's account cannot be claimed by a stranger", () => {
  let store: InMemoryAuthStore;

  beforeEach(() => {
    store = new InMemoryAuthStore();
    process.env["OWNER_EMAIL"] = "boss@example.com";
  });

  it("refuses to create the owner's account through the public form", async () => {
    /* Sign-up is open and an address is not verified, so without this the first
       stranger to guess OWNER_EMAIL — a published, guessable address — would hold
       the account the dashboard is keyed to. The owner's account is made out of
       band instead, by scripts/set-owner-password. */
    const answer = await request(testApp(store))
      .post("/api/auth/register")
      .send({ email: "boss@example.com", password: PASSWORD });

    expect(answer.status).toBe(409);
    expect(await store.findUserByEmail("boss@example.com")).toBeNull();
  });

  it("refuses it however the address is capitalised or padded", async () => {
    const answer = await request(testApp(store))
      .post("/api/auth/register")
      .send({ email: " Boss@Example.COM ", password: PASSWORD });

    expect(answer.status).toBe(409);
  });

  it("says exactly what it says for an address that is simply taken", async () => {
    // Otherwise the sign-up form becomes a way to ask which address owns the site.
    const app = testApp(store);
    await request(app)
      .post("/api/auth/register")
      .send({ email: "someone@example.com", password: PASSWORD });

    const taken = await request(app)
      .post("/api/auth/register")
      .send({ email: "someone@example.com", password: PASSWORD });
    const reserved = await request(app)
      .post("/api/auth/register")
      .send({ email: "boss@example.com", password: PASSWORD });

    expect(reserved.status).toBe(taken.status);
    expect(reserved.body).toEqual(taken.body);
  });

  it("still signs the owner in once their account exists", async () => {
    // Reserved from sign-up, not from signing in — the account is real, it is just
    // created elsewhere.
    store.seedUser("boss@example.com", await hashPassword(PASSWORD));

    const login = await request(testApp(store))
      .post("/api/auth/login")
      .send({ email: "boss@example.com", password: PASSWORD });

    expect(login.status).toBe(200);
    expect(login.body.isOwner).toBe(true);
  });
});

describe("what a wrong address gives away", () => {
  let store: InMemoryAuthStore;

  beforeEach(() => {
    store = new InMemoryAuthStore();
  });

  it("spends the same work on an address it has never seen", async () => {
    /* Checking a password costs about a tenth of a second; answering "no such
       person" costs nothing. That difference is readable over the network and turns
       the login box back into the account-enumeration tool the uniform 401 was meant
       to close. The floor is far under one hash and far over a short circuit. */
    const app = testApp(store);
    await request(app)
      .post("/api/auth/register")
      .send({ email: "me@example.com", password: PASSWORD });

    const started = performance.now();
    await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: PASSWORD });

    expect(performance.now() - started).toBeGreaterThan(20);
  });
});
