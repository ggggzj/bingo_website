/**
 * The owner's sent applications: the gate, and the two honesties the shape owes the reader.
 *
 * The first is `status_source`. Every row has a status, but only some of them have one the
 * owner gave — the rest carry whatever Simplify's export said. Presenting the second as the
 * first would be the route quietly speaking for them.
 *
 * The second is `imported_at`. These rows are a copy of a folder and are exactly as old as the
 * last import, so the age travels with the list rather than being inferred from it.
 */

import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { InMemoryAuthStore } from "../lib/auth/memory-store";
import { hashPassword } from "../lib/auth/password";
import { createAuthRouter } from "./auth";
import {
  createApplicationsRouter,
  type ApplicationRecord,
  type ApplicationStore,
} from "./applications";

const PASSWORD = "correct horse battery staple";
const OWNER = "boss@example.com";
const STRANGER = "student@example.com";

const IMPORTED = new Date("2026-09-24T12:00:00Z");

const record = (over: Partial<ApplicationRecord> = {}): ApplicationRecord => ({
  id: 1,
  company: "Solace Health",
  role: "Associate Software Engineer",
  location: "Redwood City, CA",
  region: "US",
  ats: "Ashby",
  url: "https://jobs.ashbyhq.com/solace/db008474",
  importedStatus: "applied",
  status: null,
  stage: null,
  note: null,
  appliedDate: "2026-09-10",
  savedDate: "2026-09-10",
  hasJd: true,
  importedAt: IMPORTED,
  ...over,
});

/**
 * The store seam, in memory. The drizzle-backed one is `lib/applications/store.ts`, and the
 * trail it appends is proved there — a fake cannot lie convincingly about what a transaction
 * wrote, so it does not try. What is proved here is the gate, the vocabulary and the shape.
 */
function fakeStore(rows: ApplicationRecord[]): ApplicationStore & { edits: unknown[] } {
  const edits: unknown[] = [];
  return {
    edits,
    async list(userId) {
      return userId > 0 ? rows : [];
    },
    async update(userId, id, edit, hand) {
      edits.push({ userId, id, edit, hand });
      const row = rows.find((candidate) => candidate.id === id);
      if (!row || userId <= 0) return null;
      // Absent leaves alone; null clears. The store the real one mirrors does the same.
      if ("status" in edit) row.status = edit.status ?? null;
      if ("stage" in edit) row.stage = edit.stage ?? null;
      if ("note" in edit) row.note = edit.note ?? null;
      return row;
    },
  };
}

function testApp(store: InMemoryAuthStore, applications: ApplicationStore): Express {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api/auth", createAuthRouter(store));
  app.use("/api/applications", createApplicationsRouter(store, applications));
  return app;
}

async function signedIn(app: Express, store: InMemoryAuthStore, email: string) {
  store.seedUser(email, await hashPassword(PASSWORD));
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ email, password: PASSWORD });
  return agent;
}

describe("GET /applications", () => {
  let store: InMemoryAuthStore;

  beforeEach(() => {
    process.env["OWNER_EMAIL"] = OWNER;
    store = new InMemoryAuthStore();
  });

  it("answers 404 to a signed-in stranger, the same answer an anonymous caller gets", async () => {
    const app = testApp(store, fakeStore([record()]));

    const stranger = await signedIn(app, store, STRANGER);
    const asStranger = await stranger.get("/api/applications");
    const anonymous = await request(app).get("/api/applications");

    expect(asStranger.status).toBe(404);
    expect(anonymous.status).toBe(404);
    // Byte-identical, so the route's existence is not readable from the refusal.
    expect(asStranger.body).toEqual(anonymous.body);
  });

  it("lists the owner's applications", async () => {
    const app = testApp(store, fakeStore([record(), record({ id: 2, company: "Notion" })]));

    const owner = await signedIn(app, store, OWNER);
    const res = await owner.get("/api/applications");

    expect(res.status).toBe(200);
    expect(res.body.applications).toHaveLength(2);
    expect(res.body.applications[0]).toMatchObject({
      id: 1,
      company: "Solace Health",
      role: "Associate Software Engineer",
      ats: "Ashby",
    });
  });

  it("says whether a status is the owner's answer or the import's", async () => {
    const app = testApp(
      store,
      fakeStore([
        record({ id: 1, importedStatus: "applied", status: null }),
        record({ id: 2, importedStatus: "applied", status: "closed", stage: "拒信" }),
      ]),
    );

    const owner = await signedIn(app, store, OWNER);
    const res = await owner.get("/api/applications");

    const [imported, mine] = res.body.applications;
    expect(imported).toMatchObject({ status: "applied", status_source: "import" });
    expect(mine).toMatchObject({ status: "closed", status_source: "owner", stage: "拒信" });
  });

  it("counts the days an application has been waiting, and leaves a saved row alone", async () => {
    const app = testApp(
      store,
      fakeStore([
        record({ id: 1, appliedDate: "2026-09-10" }),
        record({ id: 2, appliedDate: null, importedStatus: "saved" }),
      ]),
    );

    const owner = await signedIn(app, store, OWNER);
    const res = await owner.get("/api/applications");

    const [applied, saved] = res.body.applications;
    expect(applied.days_waiting).toBeGreaterThan(0);
    // Never applied, so there is nothing to have been waiting for. Not zero — zero
    // would read as "sent today".
    expect(saved.days_waiting).toBeNull();
  });

  it("carries the age of the imported half rather than letting the page guess it", async () => {
    const older = new Date("2026-09-20T09:00:00Z");
    const app = testApp(
      store,
      fakeStore([record({ id: 1, importedAt: older }), record({ id: 2, importedAt: IMPORTED })]),
    );

    const owner = await signedIn(app, store, OWNER);
    const res = await owner.get("/api/applications");

    expect(res.body.imported_at).toBe(IMPORTED.toISOString());
  });

  it("says nothing has been imported rather than drawing an empty table", async () => {
    const app = testApp(store, fakeStore([]));

    const owner = await signedIn(app, store, OWNER);
    const res = await owner.get("/api/applications");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ applications: [], imported_at: null });
  });

  it("does not put 400 kB of job descriptions in a list of 94", async () => {
    const app = testApp(store, fakeStore([record({ hasJd: true })]));

    const owner = await signedIn(app, store, OWNER);
    const res = await owner.get("/api/applications");

    expect(res.body.applications[0].has_jd).toBe(true);
    expect(JSON.stringify(res.body)).not.toContain("jd_markdown");
  });
});

describe("PATCH /applications/:id", () => {
  let store: InMemoryAuthStore;

  beforeEach(() => {
    process.env["OWNER_EMAIL"] = OWNER;
    store = new InMemoryAuthStore();
  });

  it("writes what the owner says, and says it is theirs afterwards", async () => {
    const app = testApp(store, fakeStore([record({ id: 1 })]));

    const owner = await signedIn(app, store, OWNER);
    const res = await owner
      .patch("/api/applications/1")
      .send({ status: "interview", stage: "OA 09-28" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: "interview",
      status_source: "owner",
      stage: "OA 09-28",
    });
  });

  it("tells the store which hand wrote it", async () => {
    const applications = fakeStore([record({ id: 1 })]);
    const app = testApp(store, applications);

    const owner = await signedIn(app, store, OWNER);
    await owner.patch("/api/applications/1").send({ note: "recruiter emailed" });

    expect(applications.edits).toEqual([
      { userId: expect.any(Number), id: 1, edit: { note: "recruiter emailed" }, hand: "browser" },
    ]);
  });

  /**
   * Absent and null are different instructions. A PATCH that treated them alike would erase
   * a note every time the owner changed a status, which is the one kind of loss this whole
   * change exists to prevent.
   */
  it("leaves out what was left out, and clears what was sent as null", async () => {
    const applications = fakeStore([
      record({ id: 1, status: "applied", stage: "OA", note: "keep me" }),
    ]);
    const app = testApp(store, applications);

    const owner = await signedIn(app, store, OWNER);
    const res = await owner.patch("/api/applications/1").send({ status: "closed", stage: null });

    expect(res.body).toMatchObject({ status: "closed", stage: null, note: "keep me" });
    expect(applications.edits).toEqual([
      expect.objectContaining({ edit: { status: "closed", stage: null } }),
    ]);
  });

  it("refuses a status outside the vocabulary rather than storing it", async () => {
    const applications = fakeStore([record({ id: 1 })]);
    const app = testApp(store, applications);

    const owner = await signedIn(app, store, OWNER);
    const res = await owner.patch("/api/applications/1").send({ status: "ghosted" });

    expect(res.status).toBe(400);
    // Refused before the store is touched: a rejected value never reaches the trail.
    expect(applications.edits).toEqual([]);
  });

  it("answers 404 to a stranger and to nobody, the same as the list does", async () => {
    const applications = fakeStore([record({ id: 1 })]);
    const app = testApp(store, applications);

    const stranger = await signedIn(app, store, STRANGER);
    const asStranger = await stranger.patch("/api/applications/1").send({ status: "closed" });
    const anonymous = await request(app).patch("/api/applications/1").send({ status: "closed" });

    expect(asStranger.status).toBe(404);
    expect(anonymous.status).toBe(404);
    expect(applications.edits).toEqual([]);
  });

  it("answers 404 for an application that is not theirs", async () => {
    const app = testApp(store, fakeStore([record({ id: 1 })]));

    const owner = await signedIn(app, store, OWNER);
    const res = await owner.patch("/api/applications/999").send({ status: "closed" });

    expect(res.status).toBe(404);
  });
});
