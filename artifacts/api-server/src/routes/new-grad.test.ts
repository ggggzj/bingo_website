/**
 * The owner's own list: the gate, the narrowing, and what counts as new.
 *
 * The fake upstream below answers the way the real one does — a substring match over
 * titles, one term per request — so these tests exercise the thing that actually makes
 * this route non-trivial: the upstream cannot intersect two conditions, so it is asked
 * several coarse questions and the precise answer is assembled here.
 */

import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { InMemoryAuthStore } from "../lib/auth/memory-store";
import { hashPassword } from "../lib/auth/password";
import type { UpstreamJobs } from "../lib/jobs/upstream";
import { EARLY_CAREER_TERMS } from "../lib/new-grad/titles";
import { createAuthRouter } from "./auth";
import {
  createNewGradRouter,
  type ListedPosting,
  type MarkerStore,
} from "./new-grad";

const PASSWORD = "correct horse battery staple";
const OWNER = "boss@example.com";
const STRANGER = "student@example.com";

type Row = {
  job_id: number;
  employer_name: string;
  title: string;
  location?: string | null;
  posted_at?: string | null;
};

const row = (r: Row) => ({
  url: null,
  location: null,
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

/** The marker seam, in memory. The drizzle-backed one lands in group 5. */
function fakeMarkers(): MarkerStore {
  const byUser = new Map<number, ListedPosting[]>();
  return {
    async read(userId) {
      const listed = byUser.get(userId);
      return { acknowledged: listed !== undefined, listed: listed ?? [] };
    },
    async write(userId, listed) {
      byUser.set(userId, listed);
    },
  };
}

function testApp(
  store: InMemoryAuthStore,
  upstream: UpstreamJobs,
  markers: MarkerStore,
): Express {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api/auth", createAuthRouter(store));
  app.use("/api/new-grad-list", createNewGradRouter(store, upstream, markers));
  return app;
}

async function signedIn(app: Express, store: InMemoryAuthStore, email: string) {
  store.seedUser(email, await hashPassword(PASSWORD));
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ email, password: PASSWORD });
  return agent;
}

const GRAD = {
  job_id: 1,
  employer_name: "Notion",
  title: "Software Engineer New Grad",
  location: "San Francisco, CA",
  posted_at: "2026-08-15",
};

describe("the gate", () => {
  let store: InMemoryAuthStore;

  beforeEach(() => {
    store = new InMemoryAuthStore();
    process.env["OWNER_EMAIL"] = OWNER;
  });

  it("answers the owner", async () => {
    const app = testApp(store, fakeUpstream([GRAD]), fakeMarkers());
    const answer = await (await signedIn(app, store, OWNER)).get("/api/new-grad-list");
    expect(answer.status).toBe(200);
  });

  it("answers 404 to a signed-in stranger, on both the list and the acknowledgement", async () => {
    /* A real account is not a key, and a 401 would confirm the route exists. */
    const app = testApp(store, fakeUpstream([GRAD]), fakeMarkers());
    const agent = await signedIn(app, store, STRANGER);
    expect((await agent.get("/api/new-grad-list")).status).toBe(404);
    expect((await agent.post("/api/new-grad-list/ack")).status).toBe(404);
  });

  it("answers 404 to a visitor with no session", async () => {
    const app = testApp(store, fakeUpstream([GRAD]), fakeMarkers());
    expect((await request(app).get("/api/new-grad-list")).status).toBe(404);
  });

  it("asks the upstream nothing at all when the caller is refused", async () => {
    /* The secret is spent per request. A stranger must not be able to make this
       server work, let alone make it call the other one. */
    const upstream = fakeUpstream([GRAD]);
    const app = testApp(store, upstream, fakeMarkers());
    await (await signedIn(app, store, STRANGER)).get("/api/new-grad-list");
    expect(upstream.calls).toHaveLength(0);
  });
});

describe("what reaches the list", () => {
  let store: InMemoryAuthStore;

  beforeEach(() => {
    store = new InMemoryAuthStore();
    process.env["OWNER_EMAIL"] = OWNER;
  });

  const list = async (rows: Row[], markers: MarkerStore = fakeMarkers()) => {
    const app = testApp(store, fakeUpstream(rows), markers);
    const agent = await signedIn(app, store, OWNER);
    const answer = await agent.get("/api/new-grad-list");
    expect(answer.status).toBe(200);
    return answer.body;
  };

  it("returns one row for a posting several terms matched", async () => {
    /* `Associate Software Engineer - New Grad` answers both `associate` and
       `new grad`. Merged by job_id or the owner reads the same req twice. */
    const body = await list([
      { ...GRAD, title: "Associate Software Engineer - New Grad" },
    ]);
    expect(body.postings).toHaveLength(1);
  });

  it("drops what the upstream returned but the title test refuses", async () => {
    const body = await list([
      GRAD,
      { ...GRAD, job_id: 2, title: "Senior Software Engineer I" },
      { ...GRAD, job_id: 3, title: "Software Engineering Intern" },
      { ...GRAD, job_id: 4, title: "New Grad Registered Nurse" },
    ]);
    expect(body.postings.map((p: { job_id: number }) => p.job_id)).toEqual([1]);
  });

  it("drops a posting for another class, and keeps one naming no class", async () => {
    const body = await list([
      { ...GRAD, job_id: 5, title: "Software Engineer New Grad - December 2026" },
      { ...GRAD, job_id: 6, title: "Entry Level Java Developer Associate" },
    ]);
    expect(body.postings.map((p: { job_id: number }) => p.job_id)).toEqual([6]);
    expect(body.postings[0].class_year).toBe("none");
  });

  it("drops a posting abroad, and marks one whose location cannot be read", async () => {
    const body = await list([
      { ...GRAD, job_id: 7, title: "Software Engineer New Grad", location: "London, UK" },
      { ...GRAD, job_id: 8, title: "Software Engineer New Grad", location: "2 Locations" },
    ]);
    expect(body.postings.map((p: { job_id: number }) => p.job_id)).toEqual([8]);
    expect(body.postings[0].location_read).toBe("unknown");
  });

  it("sorts a posting naming the class above a newer one that does not", async () => {
    const body = await list([
      { ...GRAD, job_id: 9, title: "Entry Level Software Developer", posted_at: "2026-09-10" },
      {
        ...GRAD,
        job_id: 10,
        title: "Software Engineer - University Hire 2027",
        posted_at: "2026-06-01",
      },
    ]);
    expect(body.postings.map((p: { job_id: number }) => p.job_id)).toEqual([10, 9]);
    expect(body.postings[0].class_year).toBe("target");
  });

  it("says what it cannot see, with postings and without", async () => {
    const full = await list([GRAD]);
    expect(full.board_note).toMatch(/careers site/i);
    const empty = await list([]);
    expect(empty.postings).toHaveLength(0);
    expect(empty.board_note).toMatch(/careers site/i);
  });

  it("costs one upstream request per term, and the number is stated", async () => {
    /* The cost of not having this filter upstream, pinned rather than estimated.
       `022` next door was made to state its daily request count for the same reason:
       a courtesy endpoint with no key is one you can only keep by not abusing it.

       Fourteen terms, so FOURTEEN upstream requests per page load, sequential, for a
       page with one reader. The upstream's limit is 60/minute for this whole server.
       If this number ever climbs toward that, the filter belongs upstream — which is
       what `.harness/backlogs/016` will do anyway. */
    const upstream = fakeUpstream([GRAD]);
    const app = testApp(store, upstream, fakeMarkers());
    const agent = await signedIn(app, store, OWNER);

    await agent.get("/api/new-grad-list");

    expect(upstream.calls).toHaveLength(EARLY_CAREER_TERMS.length);
    expect(EARLY_CAREER_TERMS.length).toBe(14);
    expect(upstream.calls[0]).toContain("/api/postings?title=");
  });

  it("states the class it is fenced to", async () => {
    const body = await list([GRAD]);
    expect(body.target_class_year).toBe(2027);
  });
});

describe("what is new, and what closed", () => {
  let store: InMemoryAuthStore;
  let markers: MarkerStore;

  beforeEach(() => {
    store = new InMemoryAuthStore();
    markers = fakeMarkers();
    process.env["OWNER_EMAIL"] = OWNER;
  });

  /**
   * Re-signs in against the SAME account, which `signedIn` above does not do:
   * `InMemoryAuthStore.seedUser` hands out a fresh id every call, and the marker is
   * keyed by id. Seeding twice would silently give the second visit a different
   * person's empty marker — and the test would read as "nothing was remembered".
   */
  const agentFor = async (rows: Row[]) => {
    const app = testApp(store, fakeUpstream(rows), markers);
    if (!(await store.findUserByEmail(OWNER))) {
      store.seedUser(OWNER, await hashPassword(PASSWORD));
    }
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: OWNER, password: PASSWORD });
    return agent;
  };

  it("calls nothing new before the first acknowledgement", async () => {
    /* Everything is new to somebody who has never looked, and saying so is noise.
       The first acknowledgement is what establishes the baseline. */
    const body = (await (await agentFor([GRAD])).get("/api/new-grad-list")).body;
    expect(body.postings[0].is_new).toBe(false);
  });

  it("leaves the same postings new when the view is opened twice without acknowledging", async () => {
    const first = await agentFor([GRAD]);
    await first.post("/api/new-grad-list/ack");

    const later = await agentFor([GRAD, { ...GRAD, job_id: 2, title: "New Grad Software Developer" }]);
    const once = (await later.get("/api/new-grad-list")).body;
    const twice = (await later.get("/api/new-grad-list")).body;

    const newIds = (b: { postings: { job_id: number; is_new: boolean }[] }) =>
      b.postings.filter((p) => p.is_new).map((p) => p.job_id);
    expect(newIds(once)).toEqual([2]);
    expect(newIds(twice)).toEqual([2]);
  });

  it("stops calling them new once acknowledged", async () => {
    const first = await agentFor([GRAD]);
    await first.post("/api/new-grad-list/ack");

    const later = await agentFor([GRAD, { ...GRAD, job_id: 2, title: "New Grad Software Developer" }]);
    await later.post("/api/new-grad-list/ack");
    const body = (await later.get("/api/new-grad-list")).body;

    expect(body.postings.every((p: { is_new: boolean }) => !p.is_new)).toBe(true);
  });

  it("reports a posting that has closed rather than dropping it silently", async () => {
    /* The upstream serves open postings only, so a closed one is knowable only from
       what was recorded when it was listed. That is why the marker holds rows and
       not just a timestamp. */
    const first = await agentFor([GRAD]);
    await first.post("/api/new-grad-list/ack");

    const later = await agentFor([]);
    const body = (await later.get("/api/new-grad-list")).body;

    expect(body.postings).toHaveLength(0);
    expect(body.closed).toHaveLength(1);
    expect(body.closed[0]).toMatchObject({ job_id: 1, employer_name: "Notion" });
  });
});
