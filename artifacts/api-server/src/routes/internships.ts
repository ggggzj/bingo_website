import { Router, type IRouter } from "express";

import type { AuthStore } from "../lib/auth/store";
import type { UpstreamJobs } from "../lib/jobs/upstream";
import {
  INTERN_TERMS,
  isSoftwareInternship,
  namesTargetSeason,
} from "../lib/internships/titles";
import { readLocation } from "../lib/new-grad/location";
import { currentUser } from "./auth";

/**
 * The US software internships the front page shows.
 *
 * **The gate is the unusual thing here.** Every other narrowed route in this server
 * answers a stranger with 404 — the coach, the new-grad list, the applications — so that
 * probing cannot confirm the route exists. This one is public, and the session changes
 * the *size* of the answer rather than its existence. That is deliberate: the page it
 * feeds is the front door, and a front door that 404s at strangers is not a door.
 *
 * **Why several upstream requests.** `/api/postings` takes one `title` and matches it as
 * `ilike`, which has no word boundary and cannot intersect two conditions. This list
 * needs (software AND intern MINUS seniority MINUS outside the US), so the terms go out
 * as a coarse net and the precise test runs here — the same division of labour
 * `new-grad.ts` uses and for the same reason.
 *
 * **It writes nothing, on either path.** No row, no cookie, nothing recorded about who
 * asked. The session is read to size the answer and for nothing else.
 */

/**
 * How much of the list a visitor with no session sees.
 *
 * Eight rather than all of it because the owner's answer on 2026-09-29 was 先放一部分,
 * 其余登录后看 — the shape `ROADMAP.md` already chose for the GitHub list. `total` is
 * always the count before this cut, so the page can say how many more there are without
 * the number being a guess.
 */
export const PREVIEW_ROWS = 8;

/**
 * And no more than this many from one employer in that preview.
 *
 * Measured, not chosen: sorted by date, the newest twenty rows of the live feed on
 * 2026-09-29 were 1 OpenAI, 3 Twilio and **16 Stripe**. Without a cap the eight rows a
 * stranger sees are one company's, and the page's first impression is an advert.
 * The cap applies to the preview only — a signed-in visitor asked for the whole list.
 */
export const PREVIEW_MAX_PER_EMPLOYER = 2;

/**
 * Said on the page, verbatim, with and without postings. The same note the new-grad list
 * carries, for the same reason: a reader who does not know what the boards cannot see
 * reads an absence as an answer.
 */
const BOARD_NOTE =
  "Built from the employer job boards we poll. Employers running their own careers " +
  "site — TikTok, ByteDance, Amazon, Apple, Google and others — are not among them, " +
  "so this list is not all of the market.";

/** One page is plenty per term: the precise test here is the selective half. */
const PER_TERM_LIMIT = 100;

/**
 * How long a gathered-and-narrowed list is reused before the upstream is asked again.
 *
 * This is a budget, not a performance tweak. `../h1_checker`'s `/api/postings` is limited
 * to `60/minute;1000/hour` **keyed by client IP**, and this server has one IP — so without
 * a cache every visitor to the busiest page on the site draws from a single shared
 * allowance, and past it the upstream 429s, this route 502s, and the front page tells
 * everybody the list could not be loaded. Sixty seconds makes the upstream cost a function
 * of time rather than of traffic: at most 60 calls an hour no matter how many people
 * arrive.
 *
 * Sixty seconds is also honest about the data. The feed is rebuilt by a daily sync; on
 * 2026-09-30 its newest posting was twelve days old. Nobody is served a meaningfully
 * staler list than they would have been without this.
 */
const CACHE_MS = 60_000;

/**
 * The narrowed list, shared by everyone. Safe to share precisely because it is identity-free:
 * the session changes only how much of it is handed over, and that cut happens per request,
 * below. Nothing derived from a session is ever stored here.
 */
let cached: { at: number; postings: UpstreamPosting[] } | null = null;

/** Exported for the tests, which must not depend on wall-clock timing to be repeatable. */
export function forgetCachedInternships(): void {
  cached = null;
}

type UpstreamPosting = Record<string, unknown> & {
  job_id: number;
  employer_name: string;
  title: string;
};

function isPosting(value: unknown): value is UpstreamPosting {
  const row = value as Partial<UpstreamPosting> | null;
  return (
    typeof row === "object" &&
    row !== null &&
    typeof row.job_id === "number" &&
    typeof row.employer_name === "string" &&
    typeof row.title === "string"
  );
}

function postingsOf(answer: unknown): UpstreamPosting[] {
  const list = (answer as { postings?: unknown } | null)?.postings;
  return Array.isArray(list) ? list.filter(isPosting) : [];
}

const locationOf = (p: UpstreamPosting): string | null =>
  typeof p["location"] === "string" ? (p["location"] as string) : null;

const postedAtOf = (p: UpstreamPosting): string =>
  typeof p["posted_at"] === "string" ? (p["posted_at"] as string) : "";

/** Newest first, undated last, ties by id — the rule the upstream already sorts by. */
function newestFirst(a: UpstreamPosting, b: UpstreamPosting): number {
  const left = postedAtOf(a);
  const right = postedAtOf(b);
  if (left !== right) return right.localeCompare(left);
  return a.job_id - b.job_id;
}

async function gather(upstream: UpstreamJobs): Promise<UpstreamPosting[]> {
  const byId = new Map<number, UpstreamPosting>();

  // Sequential rather than parallel, as next door: the upstream's rate limit is per
  // calling server rather than per browser, and this route is on the front page.
  for (const term of INTERN_TERMS) {
    const path = `/api/postings?title=${encodeURIComponent(term)}&limit=${PER_TERM_LIMIT}`;
    for (const posting of postingsOf(await upstream(path))) {
      // A posting several terms match is one posting.
      byId.set(posting.job_id, posting);
    }
  }

  return [...byId.values()];
}

/**
 * The preview cut: the first `PREVIEW_ROWS` of an already-sorted list, taking no more
 * than `PREVIEW_MAX_PER_EMPLOYER` from any one employer. Order is preserved — this
 * skips rows, it never re-ranks them.
 */
function preview(postings: UpstreamPosting[]): UpstreamPosting[] {
  const taken = new Map<string, number>();
  const out: UpstreamPosting[] = [];
  for (const posting of postings) {
    if (out.length >= PREVIEW_ROWS) break;
    const already = taken.get(posting.employer_name) ?? 0;
    if (already >= PREVIEW_MAX_PER_EMPLOYER) continue;
    taken.set(posting.employer_name, already + 1);
    out.push(posting);
  }
  return out;
}

export function createInternshipsRouter(
  store: AuthStore,
  upstream: UpstreamJobs,
): IRouter {
  const router: IRouter = Router();

  router.get("/", async (req, res) => {
    /*
     * A session is read to size the answer and for nothing else. A failure to read one
     * is therefore not a failure of this route: the page still has an answer, which is
     * the preview. Treating an unreadable cookie as 500 would take the front page down
     * over something only the signed-in half needs.
     */
    let signedIn = null;
    try {
      signedIn = await currentUser(store, req);
    } catch (err) {
      req.log?.error({ err }, "Failed to read session on the front page");
    }

    let raw: UpstreamPosting[];
    try {
      const fresh = cached !== null && Date.now() - cached.at < CACHE_MS;
      if (fresh) {
        raw = cached!.postings;
      } else {
        raw = await gather(upstream);
        // Only a success is remembered. Caching a failure would turn one bad minute
        // upstream into a bad minute for everyone who arrives during it.
        cached = { at: Date.now(), postings: raw };
      }
    } catch (err) {
      // The message is ours and says the path and the status; the token never reaches
      // a log or a body — the rule `lib/jobs/upstream.ts` already holds.
      req.log?.error({ err }, "Failed to reach the job feed");
      res.status(502).json({ error: "Could not reach the job feed" });
      return;
    }

    const kept = raw
      .filter((p) => isSoftwareInternship(p.title))
      .filter((p) => readLocation(locationOf(p)) !== "elsewhere")
      .sort((a, b) => {
        // Naming the season sorts ahead; it is never the condition for appearing.
        const bySeason =
          Number(namesTargetSeason(b.title)) - Number(namesTargetSeason(a.title));
        return bySeason !== 0 ? bySeason : newestFirst(a, b);
      });

    const shown = signedIn ? kept : preview(kept);

    res.json({
      // Before the cut, in both answers.
      total: kept.length,
      postings: shown.map((p) => ({
        ...p,
        location_read: readLocation(locationOf(p)),
        names_target_season: namesTargetSeason(p.title),
      })),
      // Of the rows actually returned, so the page never states a date it does not show.
      newest_posted_at: shown.map(postedAtOf).filter(Boolean).sort().at(-1) ?? null,
      board_note: BOARD_NOTE,
      preview: signedIn === null,
    });
  });

  return router;
}
