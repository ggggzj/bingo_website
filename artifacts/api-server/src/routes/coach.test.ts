/**
 * The coach routes, run against the in-memory stores — real Express app,
 * real engine, real gate and token hashing; no Postgres.
 */

import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { applyGrade, freshReviewState } from "@workspace/coach-engine";
import type { Problem } from "@workspace/coach-engine";
import { InMemoryAuthStore } from "../lib/auth/memory-store";
import { InMemoryCoachStore } from "../lib/coach/memory-store";
import { createAuthRouter } from "./auth";
import { createCoachRouter } from "./coach";

const PASSWORD = "correct horse battery staple";
const ME = "me@example.com";
const OTHER = "other@example.com";

function problem(id: string, num: number, over: Partial<Problem> = {}): Problem {
  return {
    id,
    num,
    title: `Problem ${num}`,
    slug: `problem-${num}`,
    difficulty: "easy",
    neetcode_group: "Arrays & Hashing",
    patterns: ["hash-map"],
    company_freq: {},
    followups: [],
    siblings: [],
    ...over,
  };
}

const BANK = Object.fromEntries(
  [problem("lc-0001", 1), problem("lc-0002", 2), problem("lc-0003", 3), problem("lc-0004", 4)].map(
    (p) => [p.id, p],
  ),
);

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

const originalCoachEmails = process.env["COACH_EMAILS"];

function testApp(auth: InMemoryAuthStore, coach: InMemoryCoachStore): Express {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api/auth", createAuthRouter(auth));
  app.use("/api/coach", createCoachRouter(auth, coach));
  return app;
}

describe("coach routes", () => {
  let auth: InMemoryAuthStore;
  let coach: InMemoryCoachStore;
  let app: Express;

  beforeEach(() => {
    process.env["COACH_EMAILS"] = `${ME}, ${OTHER}`;
    auth = new InMemoryAuthStore();
    coach = new InMemoryCoachStore(BANK);
    app = testApp(auth, coach);
  });

  afterEach(() => {
    if (originalCoachEmails === undefined) delete process.env["COACH_EMAILS"];
    else process.env["COACH_EMAILS"] = originalCoachEmails;
  });

  /** Register through the real route and mirror the user into the coach
   * store (the bearer lookup needs it, the way the DB join does). */
  async function signIn(email: string = ME) {
    const agent = request.agent(app);
    const res = await agent
      .post("/api/auth/register")
      .send({ email, password: PASSWORD });
    expect(res.status).toBe(201);
    const user = await auth.findUserByEmail(email);
    coach.seedUser({ id: user!.id, email: user!.email });
    return { agent, userId: user!.id };
  }

  describe("gate", () => {
    it("signed-out and non-allowlisted get the identical 404", async () => {
      const signedOut = await request(app).get("/api/coach/plan");
      expect(signedOut.status).toBe(404);

      process.env["COACH_EMAILS"] = "someoneelse@example.com";
      const { agent } = await signIn(ME);
      const gated = await agent.get("/api/coach/plan");
      expect(gated.status).toBe(404);
      expect(gated.body).toEqual(signedOut.body);
    });

    it("unset allowlist closes the feature for everyone", async () => {
      const { agent } = await signIn(ME);
      delete process.env["COACH_EMAILS"];
      const res = await agent.get("/api/coach/plan");
      expect(res.status).toBe(404);
    });
  });

  describe("personal tokens", () => {
    it("issues via session, then the bearer token works alone", async () => {
      const { agent } = await signIn();
      const issued = await agent.post("/api/coach/token");
      expect(issued.status).toBe(201);
      const token = issued.body.token as string;
      expect(token.length).toBeGreaterThan(20);

      const plan = await request(app)
        .get("/api/coach/plan")
        .set("Authorization", `Bearer ${token}`);
      expect(plan.status).toBe(200);
      expect(plan.body.new.length).toBeGreaterThan(0);
    });

    it("a bearer token cannot mint its own successor", async () => {
      const { agent } = await signIn();
      const token = (await agent.post("/api/coach/token")).body.token as string;
      const minted = await request(app)
        .post("/api/coach/token")
        .set("Authorization", `Bearer ${token}`);
      expect(minted.status).toBe(404);
    });

    it("rotation revokes the predecessor; delete revokes the current", async () => {
      const { agent } = await signIn();
      const first = (await agent.post("/api/coach/token")).body.token as string;
      const second = (await agent.post("/api/coach/token")).body
        .token as string;

      const withFirst = await request(app)
        .get("/api/coach/plan")
        .set("Authorization", `Bearer ${first}`);
      expect(withFirst.status).toBe(404);

      const revoked = await request(app)
        .delete("/api/coach/token")
        .set("Authorization", `Bearer ${second}`);
      expect(revoked.status).toBe(200);
      const after = await request(app)
        .get("/api/coach/plan")
        .set("Authorization", `Bearer ${second}`);
      expect(after.status).toBe(404);
    });

    it("a live token stops working when the email leaves the allowlist", async () => {
      const { agent } = await signIn();
      const token = (await agent.post("/api/coach/token")).body.token as string;
      process.env["COACH_EMAILS"] = "someoneelse@example.com";
      const res = await request(app)
        .get("/api/coach/plan")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  describe("plan", () => {
    it("freezes on first call and returns the same list with marks after", async () => {
      const { agent } = await signIn();
      const first = await agent.get("/api/coach/plan");
      expect(first.status).toBe(200);
      const ids = first.body.new.map(
        (i: { problem: { id: string } }) => i.problem.id,
      );
      expect(ids.length).toBe(2); // default new_per_day

      const graded = await agent
        .post("/api/coach/grade")
        .send({ problemId: ids[0], grade: "pass" });
      expect(graded.status).toBe(200);

      const second = await agent.get("/api/coach/plan");
      const again = second.body.new.map(
        (i: { problem: { id: string } }) => i.problem.id,
      );
      expect(again).toEqual(ids);
      const done = second.body.new.find(
        (i: { problem: { id: string } }) => i.problem.id === ids[0],
      );
      expect(done.done).toBe(true);
      expect(done.grade).toBe("pass");
      expect(second.body.doneToday).toBe(1);
    });

    it("gives distinct users distinct state", async () => {
      const a = await signIn(ME);
      const b = await signIn(OTHER);
      const planA = await a.agent.get("/api/coach/plan");
      await a.agent
        .post("/api/coach/grade")
        .send({ problemId: planA.body.new[0].problem.id, grade: "pass" });

      const planB = await b.agent.get("/api/coach/plan");
      expect(planB.body.doneToday).toBe(0);
    });
  });

  describe("solved and grade", () => {
    it("grade creates review state, appends one event and stamps the day", async () => {
      const { agent, userId } = await signIn();
      const res = await agent.post("/api/coach/grade").send({
        problemId: "lc-0001",
        grade: "partial",
        weakPoints: ["amortized argument"],
      });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        problemId: "lc-0001",
        state: "learning",
        intervalDays: 1,
        due: expect.any(String),
        lapses: 0,
        weakPoints: ["amortized argument"],
      });
      const review = await coach.getReview(userId, "lc-0001");
      expect(review?.state).toBe("learning");
      expect(coach.events).toHaveLength(1);
      expect(coach.events[0].event.failed_on).toEqual(["amortized argument"]);
      const entry = await coach.getDayEntry(userId, utcToday());
      expect(entry?.done).toEqual([
        { id: "lc-0001", grade: "partial", mode: "grill" },
      ]);
      expect(entry?.solved).toContain("lc-0001");
    });

    it("same-day re-grade overwrites instead of duplicating", async () => {
      const { agent, userId } = await signIn();
      await agent
        .post("/api/coach/grade")
        .send({ problemId: "lc-0001", grade: "fail" });
      await agent
        .post("/api/coach/grade")
        .send({ problemId: "lc-0001", grade: "pass" });
      const entry = await coach.getDayEntry(userId, utcToday());
      expect(entry?.done).toEqual([
        { id: "lc-0001", grade: "pass", mode: "grill" },
      ]);
    });

    it("refuses to un-solve a problem graded today", async () => {
      const { agent } = await signIn();
      await agent
        .post("/api/coach/grade")
        .send({ problemId: "lc-0001", grade: "pass" });
      const res = await agent
        .post("/api/coach/solved")
        .send({ problemId: "lc-0001", solved: false });
      expect(res.status).toBe(409);
    });

    it("rejects unknown problems with 422", async () => {
      const { agent } = await signIn();
      const solved = await agent
        .post("/api/coach/solved")
        .send({ problemId: "lc-9999", solved: true });
      expect(solved.status).toBe(422);
      const graded = await agent
        .post("/api/coach/grade")
        .send({ problemId: "lc-9999", grade: "pass" });
      expect(graded.status).toBe(422);
    });

    it("a solved tick shows up in the plan", async () => {
      const { agent } = await signIn();
      const plan = await agent.get("/api/coach/plan");
      const pid = plan.body.new[0].problem.id;
      await agent
        .post("/api/coach/solved")
        .send({ problemId: pid, solved: true });
      const after = await agent.get("/api/coach/plan");
      const item = after.body.new.find(
        (i: { problem: { id: string } }) => i.problem.id === pid,
      );
      expect(item.solved).toBe(true);
      expect(item.done).toBe(false);
    });
  });

  describe("forecast", () => {
    it("overdue reviews land on today; future ones on their day", async () => {
      const { agent, userId } = await signIn();
      const today = utcToday();

      // Plant one overdue and one due-tomorrow review directly.
      const overdue = {
        ...applyGrade(freshReviewState("lc-0001"), "pass", {
          on: "2026-01-01",
        }).next,
      };
      const tomorrow = {
        ...applyGrade(freshReviewState("lc-0002"), "pass", { on: today }).next,
      };
      await coach.saveGrade(
        userId,
        overdue,
        { date: "2026-01-01", mode: "grill", grade: "pass", interval_days: 1, failed_on: [], notes: "" },
        "2026-01-01",
        { assigned_new: [], assigned_reviews: [], planned_minutes: 0, solved: [], done: [] },
      );
      await coach.saveGrade(
        userId,
        tomorrow,
        { date: today, mode: "grill", grade: "pass", interval_days: 1, failed_on: [], notes: "" },
        today,
        { assigned_new: [], assigned_reviews: [], planned_minutes: 0, solved: [], done: [] },
      );

      const res = await agent.get("/api/coach/forecast?days=3");
      expect(res.status).toBe(200);
      expect(res.body.days).toHaveLength(3);
      expect(res.body.days[0]).toEqual({ date: today, count: 1, minutes: 4 });
      expect(res.body.days[1].count).toBe(1);
    });
  });

  describe("log", () => {
    it("derives statuses, streak and adherence", async () => {
      const { agent } = await signIn();
      const plan = await agent.get("/api/coach/plan");
      for (const item of plan.body.new) {
        await agent
          .post("/api/coach/grade")
          .send({ problemId: item.problem.id, grade: "pass" });
      }
      const res = await agent.get("/api/coach/log?days=7");
      expect(res.status).toBe(200);
      expect(res.body.days).toHaveLength(7);
      const today = res.body.days[6];
      expect(today.day).toBe(utcToday());
      expect(today.status).toBe("complete");
      expect(res.body.streak).toBe(1);
      expect(res.body.adherence.assignedDays).toBe(1);
      expect(res.body.adherence.finishedDays).toBe(1);
    });
  });

  describe("config", () => {
    it("first read creates defaults", async () => {
      const { agent } = await signIn();
      const res = await agent.get("/api/coach/config");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        dailyMinutes: 60,
        newPerDay: 2,
        sprintWindowDays: 14,
        interviewDate: null,
        targetCompanies: [],
        knownCompanies: [],
      });
    });

    it("serves the company roster derived from the bank", async () => {
      coach.seedProblems({
        "lc-0001": problem("lc-0001", 1, {
          company_freq: { google: 0.5, uber: 0.3 },
        }),
        "lc-0002": problem("lc-0002", 2, {
          company_freq: { snowflake: 0.4, google: 0.2 },
        }),
      });
      const { agent } = await signIn();
      const res = await agent.get("/api/coach/config");
      expect(res.body.knownCompanies).toEqual(["google", "snowflake", "uber"]);

      const updated = await agent
        .put("/api/coach/config")
        .send({ targetCompanies: ["uber", "snowflake"] });
      expect(updated.status).toBe(200);
      expect(updated.body.targetCompanies).toEqual(["uber", "snowflake"]);
      expect(updated.body.knownCompanies).toEqual([
        "google",
        "snowflake",
        "uber",
      ]);
    });

    it("updates a subset and rejects invalid values unchanged", async () => {
      const { agent } = await signIn();
      const updated = await agent
        .put("/api/coach/config")
        .send({ dailyMinutes: 90, interviewDate: "2026-12-01" });
      expect(updated.status).toBe(200);
      expect(updated.body.dailyMinutes).toBe(90);
      expect(updated.body.interviewDate).toBe("2026-12-01");
      expect(updated.body.newPerDay).toBe(2);

      const bad = await agent
        .put("/api/coach/config")
        .send({ dailyMinutes: 5 });
      expect(bad.status).toBe(422);
      const after = await agent.get("/api/coach/config");
      expect(after.body.dailyMinutes).toBe(90);
    });
  });
});
