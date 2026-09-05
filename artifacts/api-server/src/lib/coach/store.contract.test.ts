/**
 * One behavioral contract, two implementations. The memory store always
 * runs; the drizzle store runs when COACH_TEST_DATABASE_URL points at a
 * scratch Postgres with the schema pushed (it seeds and cleans up its own
 * rows). A distinct variable on purpose — vitest pins DATABASE_URL to a
 * dummy so the db package can load without a server.
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { inArray } from "drizzle-orm";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { applyGrade, freshReviewState } from "@workspace/coach-engine";
import type { DayLogEntry, Problem } from "@workspace/coach-engine";
import * as schema from "@workspace/db/schema";
import { DrizzleCoachStore } from "./drizzle-store";
import { InMemoryCoachStore } from "./memory-store";
import type { CoachStore } from "./store";

const DAY = "2026-09-04";

function entry(over: Partial<DayLogEntry> = {}): DayLogEntry {
  return {
    assigned_new: [],
    assigned_reviews: [],
    planned_minutes: 0,
    solved: [],
    done: [],
    ...over,
  };
}

function problem(id: string, num: number): Problem {
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
  };
}

const P1 = "lc-9001";
const P2 = "lc-9002";

interface Harness {
  store: CoachStore;
  userId: number;
  otherUserId: number;
}

function runContract(name: string, setup: () => Promise<Harness>) {
  describe(name, () => {
    let h: Harness;

    beforeAll(async () => {
      h = await setup();
    });

    it("creates config defaults on first read and round-trips updates", async () => {
      const cfg = await h.store.getConfig(h.userId);
      expect(cfg).toEqual({
        daily_minutes: 60,
        new_per_day: 2,
        sprint_window_days: 14,
        interview_date: null,
        target_companies: [],
      });
      const next = { ...cfg, daily_minutes: 90, interview_date: "2026-12-01" };
      await h.store.putConfig(h.userId, next);
      expect(await h.store.getConfig(h.userId)).toEqual(next);
    });

    it("freezeDay is first-writer-wins", async () => {
      const first = await h.store.freezeDay(
        h.userId,
        DAY,
        entry({ assigned_new: [P1], planned_minutes: 20 }),
      );
      const second = await h.store.freezeDay(
        h.userId,
        DAY,
        entry({ assigned_new: [P2], planned_minutes: 38 }),
      );
      expect(first.assigned_new).toEqual([P1]);
      expect(second.assigned_new).toEqual([P1]);
      expect((await h.store.getDayEntry(h.userId, DAY))?.assigned_new).toEqual([
        P1,
      ]);
    });

    it("saveGrade lands review, event and day entry together", async () => {
      const { next, event } = applyGrade(freshReviewState(P1), "partial", {
        on: DAY,
        weakPoints: ["invariant"],
      });
      const day = entry({
        assigned_new: [P1],
        solved: [P1],
        done: [{ id: P1, grade: "partial", mode: "grill" }],
      });
      await h.store.saveGrade(h.userId, next, event, DAY, day);

      expect(await h.store.getReview(h.userId, P1)).toEqual(next);
      expect(await h.store.loadReviews(h.userId)).toEqual({ [P1]: next });
      expect((await h.store.getDayEntry(h.userId, DAY))?.done).toEqual(
        day.done,
      );
      // The other user sees none of it.
      expect(await h.store.loadReviews(h.otherUserId)).toEqual({});
    });

    it("putDayEntry upserts in place", async () => {
      await h.store.putDayEntry(h.userId, DAY, entry({ solved: [P1, P2] }));
      expect((await h.store.getDayEntry(h.userId, DAY))?.solved).toEqual([
        P1,
        P2,
      ]);
    });

    it("loadDayLog respects the trailing window", async () => {
      await h.store.putDayEntry(h.userId, "2026-08-01", entry({ solved: [P2] }));
      const wide = await h.store.loadDayLog(h.userId, DAY, 60);
      const narrow = await h.store.loadDayLog(h.userId, DAY, 7);
      expect(Object.keys(wide)).toContain("2026-08-01");
      expect(Object.keys(narrow)).not.toContain("2026-08-01");
      expect(Object.keys(narrow)).toContain(DAY);
    });

    it("token lifecycle: live lookup, rotation revokes, revoke kills", async () => {
      const now = new Date();
      await h.store.createToken(h.userId, "hash-one");
      expect(await h.store.findUserByLiveToken("hash-one", now)).toMatchObject({
        id: h.userId,
      });
      expect(await h.store.findUserByLiveToken("hash-unknown", now)).toBeNull();

      await h.store.createToken(h.userId, "hash-two");
      expect(await h.store.findUserByLiveToken("hash-one", now)).toBeNull();
      expect(await h.store.findUserByLiveToken("hash-two", now)).toMatchObject({
        id: h.userId,
      });

      await h.store.revokeTokens(h.userId);
      expect(await h.store.findUserByLiveToken("hash-two", now)).toBeNull();
      // Idempotent on an empty slate.
      await h.store.revokeTokens(h.userId);
    });
  });
}

runContract("InMemoryCoachStore", async () => {
  const store = new InMemoryCoachStore({
    [P1]: problem(P1, 9001),
    [P2]: problem(P2, 9002),
  });
  store.seedUser({ id: 1, email: "me@example.com" });
  store.seedUser({ id: 2, email: "other@example.com" });
  return { store, userId: 1, otherUserId: 2 };
});

const PG_URL = process.env["COACH_TEST_DATABASE_URL"];

describe.skipIf(!PG_URL)("DrizzleCoachStore (Postgres)", () => {
  const pool = PG_URL ? new pg.Pool({ connectionString: PG_URL }) : null;

  afterAll(async () => {
    if (!pool) return;
    const database = drizzle(pool, { schema });
    await database
      .delete(schema.usersTable)
      .where(
        inArray(schema.usersTable.email, [
          "coach-contract-a@test.local",
          "coach-contract-b@test.local",
        ]),
      );
    await database
      .delete(schema.coachProblemsTable)
      .where(inArray(schema.coachProblemsTable.id, [P1, P2]));
    await pool.end();
  });

  runContract("contract", async () => {
    const database = drizzle(pool!, { schema });
    // Clean any leftovers from an aborted previous run, then seed.
    await database
      .delete(schema.usersTable)
      .where(
        inArray(schema.usersTable.email, [
          "coach-contract-a@test.local",
          "coach-contract-b@test.local",
        ]),
      );
    const [a] = await database
      .insert(schema.usersTable)
      .values({ email: "coach-contract-a@test.local", passwordHash: "x" })
      .returning();
    const [b] = await database
      .insert(schema.usersTable)
      .values({ email: "coach-contract-b@test.local", passwordHash: "x" })
      .returning();
    for (const p of [problem(P1, 9001), problem(P2, 9002)]) {
      await database
        .insert(schema.coachProblemsTable)
        .values({
          id: p.id,
          num: p.num,
          title: p.title,
          slug: p.slug,
          difficulty: p.difficulty,
          neetcodeGroup: p.neetcode_group,
          patterns: p.patterns,
          companyFreq: p.company_freq,
          followups: p.followups,
          siblings: p.siblings,
        })
        .onConflictDoNothing();
    }
    const store = new DrizzleCoachStore(
      database as unknown as ConstructorParameters<typeof DrizzleCoachStore>[0],
    );
    return { store, userId: a!.id, otherUserId: b!.id };
  });
});
