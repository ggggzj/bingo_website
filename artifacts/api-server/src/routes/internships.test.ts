/**
 * The front page's list: the narrowing, the preview cut, and the two answers.
 *
 * The fake upstream answers the way the real one does — a substring match over titles,
 * one term per request — because that is what makes this route non-trivial: `ilike` has
 * no word boundary and cannot intersect two conditions, so it is asked coarse questions
 * and the precise answer is assembled here.
 *
 * The difference from `new-grad.test.ts` is the gate. This route is **public**, and a
 * session changes the *size* of the answer rather than the existence of the route. Both
 * answers carry the same `total`, and neither writes anything.
 */

import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { InMemoryAuthStore } from "../lib/auth/memory-store";
import { hashPassword } from "../lib/auth/password";
import type { UpstreamJobs } from "../lib/jobs/upstream";
import { INTERN_TERMS } from "../lib/internships/titles";
import { createAuthRouter } from "./auth";
import {
  PREVIEW_MAX_PER_EMPLOYER,
  PREVIEW_ROWS,
  createInternshipsRouter,
  forgetCachedInternships,
} from "./internships";

beforeEach(() => forgetCachedInternships());

const PASSWORD = "correct horse battery staple";
const VISITOR = "student@example.com";

type Row = {
  job_id: number;
  employer_name: string;
  title: string;
  location?: string | null;
  posted_at?: string | null;
};

const row = (r: Row) => ({
  url: null,
  location: "San Francisco, CA",
  posted_at: null,
  is_remote: false,
  tier: "strong",
  total_h1b_certified: 12,
  last_active_year: 2026,
  no_sponsor: null,
  ...r,
});

/** Answers each `title=` query the way `ilike '%term%'` would. */
function fakeUpstream(rows: Row[]): UpstreamJobs & { calls: string[] } {
  const calls: string[] = [];
  const fn = async (path: string) => {
    calls.push(path);
    const term = decodeURIComponent(
      new URL(path, "http://x").searchParams.get("title") ?? "",
    ).toLowerCase();
    const hits = rows.filter((r) => r.title.toLowerCase().includes(term));
    return { total: hits.length, postings: hits.map(row) };
  };
  return Object.assign(fn, { calls });
}

function appWith(upstream: UpstreamJobs): { app: Express; store: InMemoryAuthStore } {
  const store = new InMemoryAuthStore();
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/auth", createAuthRouter(store));
  app.use("/internships", createInternshipsRouter(store, upstream));
  return { app, store };
}

/** A session cookie for an ordinary visitor — not the owner; this route has no owner. */
async function signIn(app: Express, store: InMemoryAuthStore): Promise<string> {
  await store.createUser(VISITOR, await hashPassword(PASSWORD));
  const answer = await request(app)
    .post("/auth/login")
    .send({ email: VISITOR, password: PASSWORD });
  const cookies = answer.headers["set-cookie"] as unknown as string[];
  return cookies.map((c) => c.split(";")[0]).join("; ");
}

/** Eleven real software-internship titles, so the preview of 8 actually cuts. */
const MANY = Array.from({ length: 11 }, (_, i) => ({
  job_id: i + 1,
  employer_name: `Employer ${i + 1}`,
  title: "Software Engineer Intern",
  posted_at: `2026-09-${String(10 + i).padStart(2, "0")}`,
}));

describe("GET /internships without a session", () => {
  it("answers a preview and the true total", async () => {
    const upstream = fakeUpstream(MANY);
    const { app } = appWith(upstream);

    const answer = await request(app).get("/internships");

    expect(answer.status).toBe(200);
    expect(answer.body.preview).toBe(true);
    expect(answer.body.postings).toHaveLength(PREVIEW_ROWS);
    // The count before the cut, so the page's "N more" line has something true to say.
    expect(answer.body.total).toBe(MANY.length);
    expect(PREVIEW_ROWS).toBeLessThan(MANY.length);
    expect(PREVIEW_MAX_PER_EMPLOYER).toBeGreaterThan(0);
    expect(INTERN_TERMS.length).toBeGreaterThan(0);
  });
});

describe("GET /internships with a session", () => {
  it("answers every row, and the same total as the preview did", async () => {
    const upstream = fakeUpstream(MANY);
    const { app, store } = appWith(upstream);
    const cookie = await signIn(app, store);

    const stranger = await request(app).get("/internships");
    const member = await request(app).get("/internships").set("Cookie", cookie);

    expect(member.body.preview).toBe(false);
    expect(member.body.postings).toHaveLength(MANY.length);
    expect(member.body.total).toBe(stranger.body.total);
  });
});

describe("what the narrowing removes, from both answers", () => {
  const rows = [
    { job_id: 1, employer_name: "Atlassian", title: "Software Engineer Intern", location: "Sydney, Australia" },
    { job_id: 2, employer_name: "Stripe", title: "International Program Manager", location: "San Francisco, CA" },
    { job_id: 3, employer_name: "Palantir", title: "Senior Software Engineer Intern", location: "Denver, CO" },
    { job_id: 4, employer_name: "Coinbase", title: "Marketing Intern", location: "New York, NY" },
    { job_id: 5, employer_name: "Lyft", title: "Software Engineer Intern", location: "Hybrid" },
  ];

  it("drops postings outside the United States, a title that matched on a boundary, a seniority and a non-software role", async () => {
    const upstream = fakeUpstream(rows);
    const { app, store } = appWith(upstream);
    const cookie = await signIn(app, store);

    for (const answer of [
      await request(app).get("/internships"),
      await request(app).get("/internships").set("Cookie", cookie),
    ]) {
      const ids = answer.body.postings.map((p: { job_id: number }) => p.job_id);
      expect(ids).not.toContain(1); // Sydney
      expect(ids).not.toContain(2); // International
      expect(ids).not.toContain(3); // Senior
      expect(ids).not.toContain(4); // Marketing
      expect(ids).toContain(5); // unreadable location, kept
      // Narrowed by absence: no row anywhere carries a seniority or category label.
      for (const posting of answer.body.postings) {
        expect(posting).not.toHaveProperty("seniority");
        expect(posting).not.toHaveProperty("category");
      }
    }
  });

  it("marks a location it could not read rather than assuming it is American", async () => {
    const upstream = fakeUpstream([rows[4]!]);
    const { app } = appWith(upstream);

    const answer = await request(app).get("/internships");

    expect(answer.body.postings).toHaveLength(1);
    expect(answer.body.postings[0].location_read).toBe("unknown");
  });
});

describe("the preview's per-employer cap", () => {
  const sixFromOne = [
    ...Array.from({ length: 6 }, (_, i) => ({
      job_id: 100 + i,
      employer_name: "Stripe",
      title: "Software Engineer Intern",
      posted_at: `2026-09-2${i}`,
    })),
    { job_id: 200, employer_name: "Figma", title: "Software Engineer Intern", posted_at: "2026-09-01" },
  ];

  it("takes at most two of one employer into the preview and all six into the whole list", async () => {
    const upstream = fakeUpstream(sixFromOne);
    const { app, store } = appWith(upstream);
    const cookie = await signIn(app, store);

    const stranger = await request(app).get("/internships");
    const member = await request(app).get("/internships").set("Cookie", cookie);

    const stripeInPreview = stranger.body.postings.filter(
      (p: { employer_name: string }) => p.employer_name === "Stripe",
    );
    const stripeSignedIn = member.body.postings.filter(
      (p: { employer_name: string }) => p.employer_name === "Stripe",
    );

    expect(stripeInPreview).toHaveLength(PREVIEW_MAX_PER_EMPLOYER);
    expect(stripeSignedIn).toHaveLength(6);
    // The cap skips rows, it does not re-rank them: Figma is still last by date.
    expect(stranger.body.total).toBe(7);
  });
});

describe("what the page is allowed to say", () => {
  it("dates the block from a row it actually returned", async () => {
    // The newest row overall is Stripe's, and the preview carries it.
    const upstream = fakeUpstream(MANY);
    const { app } = appWith(upstream);

    const answer = await request(app).get("/internships");
    const dates = answer.body.postings.map((p: { posted_at: string }) => p.posted_at);

    expect(answer.body.newest_posted_at).toBe(dates.sort().at(-1));
  });

  it("dates the block from the rows it returned even when the newest one was cut", async () => {
    /*
     * The case the other date test cannot reach, and the one that matters. Season-first
     * sorting puts Stripe's two Summer rows ahead of its newest-dated row, the
     * per-employer cap is then full, and the newest posting in the whole list never
     * reaches the page. A block headed with 09-30 while showing nothing newer than 09-05
     * is precisely how a stopped feed reads as a running one.
     */
    const upstream = fakeUpstream([
      { job_id: 1, employer_name: "Stripe", title: "Software Engineer Intern (Summer 2027)", posted_at: "2026-09-01" },
      { job_id: 2, employer_name: "Stripe", title: "Software Engineer Intern (Summer 2027)", posted_at: "2026-09-02" },
      { job_id: 3, employer_name: "Stripe", title: "Software Engineer Intern", posted_at: "2026-09-30" },
      { job_id: 4, employer_name: "Figma", title: "Software Engineer Intern", posted_at: "2026-09-05" },
    ]);
    const { app } = appWith(upstream);

    const answer = await request(app).get("/internships");
    const ids = answer.body.postings.map((p: { job_id: number }) => p.job_id);

    expect(ids).not.toContain(3);
    expect(answer.body.newest_posted_at).toBe("2026-09-05");
    // The whole list still knows about it — only the preview does not show it.
    expect(answer.body.total).toBe(4);
  });

  it("returns null for the date when it returned no rows, and still says what it cannot see", async () => {
    const upstream = fakeUpstream([]);
    const { app } = appWith(upstream);

    const answer = await request(app).get("/internships");

    expect(answer.body.postings).toEqual([]);
    expect(answer.body.total).toBe(0);
    expect(answer.body.newest_posted_at).toBeNull();
    expect(answer.body.board_note).toMatch(/not all of the market/);
  });

  it("sorts a posting naming the season ahead of one that does not, without excluding either", async () => {
    const upstream = fakeUpstream([
      { job_id: 1, employer_name: "A", title: "Software Engineer Intern", posted_at: "2026-09-30" },
      { job_id: 2, employer_name: "B", title: "Software Engineer Intern (Summer 2027)", posted_at: "2026-09-01" },
    ]);
    const { app } = appWith(upstream);

    const answer = await request(app).get("/internships");
    const ids = answer.body.postings.map((p: { job_id: number }) => p.job_id);

    // 2 names the season and is older; it still comes first, and 1 is still listed.
    expect(ids).toEqual([2, 1]);
    expect(answer.body.postings[0].names_target_season).toBe(true);
    expect(answer.body.postings[1].names_target_season).toBe(false);
  });
});

describe("what it asks upstream, and what it never writes", () => {
  it("asks one question per intern term and no more", async () => {
    const upstream = fakeUpstream(MANY);
    const { app } = appWith(upstream);

    await request(app).get("/internships");

    expect(upstream.calls).toHaveLength(INTERN_TERMS.length);
    for (const term of INTERN_TERMS) {
      expect(upstream.calls.some((c) => c.includes(encodeURIComponent(term)))).toBe(true);
    }
  });

  it("writes nothing for either visitor", async () => {
    /*
     * Recorded through the interface rather than by comparing a snapshot of the store.
     * `JSON.stringify` on `InMemoryAuthStore` returns `{"lastLoginAt":{}}` whatever it
     * holds — its state is in private Maps — so a snapshot assertion here passes with
     * the route writing freely. This proxy records the method names instead, and the
     * six mutating ones are named rather than inferred.
     */
    const WRITES = [
      "createUser",
      "createPasswordlessUser",
      "clearPassword",
      "createSession",
      "revokeSession",
      "recordLogin",
    ];
    const upstream = fakeUpstream(MANY);
    const real = new InMemoryAuthStore();
    const called: string[] = [];
    const store = new Proxy(real, {
      get(target, prop, receiver) {
        const value = Reflect.get(target, prop, receiver);
        if (typeof value !== "function") return value;
        return (...args: unknown[]) => {
          called.push(String(prop));
          return (value as (...a: unknown[]) => unknown).apply(target, args);
        };
      },
    });

    const app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use("/auth", createAuthRouter(store));
    app.use("/internships", createInternshipsRouter(store, upstream));

    await real.createUser(VISITOR, await hashPassword(PASSWORD));
    const login = await request(app)
      .post("/auth/login")
      .send({ email: VISITOR, password: PASSWORD });
    const cookie = (login.headers["set-cookie"] as unknown as string[])
      .map((c) => c.split(";")[0])
      .join("; ");

    // Everything before this line was setup and is allowed to have written.
    called.length = 0;

    const stranger = await request(app).get("/internships");
    const member = await request(app).get("/internships").set("Cookie", cookie);

    expect(called.filter((name) => WRITES.includes(name))).toEqual([]);
    // No cookie set on either path — the session is read, never issued or refreshed.
    expect(stranger.headers["set-cookie"]).toBeUndefined();
    expect(member.headers["set-cookie"]).toBeUndefined();
    // Reading twice returns the same answer, so nothing was spent.
    const again = await request(app).get("/internships");
    expect(again.body).toEqual(stranger.body);
  });
});

describe("when the upstream is unreachable", () => {
  it("answers 502 in the shared error shape and never leaks the token", async () => {
    /*
     * The fake throws an error that *does* carry the token. That is the point: a route
     * that forwarded `err.message` into the body would leak it, and an error built
     * without the secret could never catch that. `lib/jobs/upstream.ts` is careful not
     * to put it in the message; this asserts the route is careful even when something
     * upstream of it was not.
     */
    const secret = "postings-token-hunter2";
    const failing: UpstreamJobs = async (path: string) => {
      throw new Error(`fetch ${path} failed with X-Postings-Token: ${secret}`);
    };
    const { app } = appWith(failing);

    const answer = await request(app).get("/internships");

    expect(answer.status).toBe(502);
    expect(answer.body).toEqual({ error: "Could not reach the job feed" });
    expect(JSON.stringify(answer.body)).not.toContain(secret);
    expect(JSON.stringify(answer.body)).not.toMatch(/token/i);
  });
});

describe("the upstream budget", () => {
  /**
   * The front page is the busiest address this site has, and every load used to reach the
   * upstream synchronously. The upstream's own limit is `60/minute;1000/hour`
   * (`../h1_checker/main.py`) keyed by **client IP** — and this server has one, so every
   * visitor shares a single budget. Past it the upstream answers 429, this route turns
   * that into 502, and the front page tells everybody the list could not be loaded.
   *
   * A short cache makes the upstream cost a function of time instead of traffic.
   */
  it("asks the upstream once however many visitors arrive inside the window", async () => {
    const upstream = fakeUpstream(MANY);
    const { app, store } = appWith(upstream);
    const cookie = await signIn(app, store);

    const first = await request(app).get("/internships");
    await request(app).get("/internships");
    await request(app).get("/internships").set("Cookie", cookie);
    const last = await request(app).get("/internships");

    expect(upstream.calls).toHaveLength(INTERN_TERMS.length);
    // And the answers are still right — a cache that served stale shapes would be worse
    // than the problem. The signed-in one is still whole, the anonymous ones still cut.
    expect(first.body.postings).toHaveLength(PREVIEW_ROWS);
    expect(last.body.postings).toHaveLength(PREVIEW_ROWS);
    expect(first.body.total).toBe(MANY.length);
  });

  it("does not cache a failure", async () => {
    let fail = true;
    const calls: string[] = [];
    const flaky: UpstreamJobs = async (path: string) => {
      calls.push(path);
      if (fail) throw new Error(`Job feed answered 502 for ${path}`);
      return { total: 1, postings: [row(MANY[0]!)] };
    };
    const { app } = appWith(flaky);

    expect((await request(app).get("/internships")).status).toBe(502);
    fail = false;
    // The next visitor must get a real answer rather than the cached disaster.
    const recovered = await request(app).get("/internships");

    expect(recovered.status).toBe(200);
    expect(recovered.body.postings).toHaveLength(1);
    expect(calls.length).toBeGreaterThan(1);
  });
});
