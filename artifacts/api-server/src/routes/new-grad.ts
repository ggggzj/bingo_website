import { Router, type IRouter } from "express";

import { isOwner } from "../lib/auth/owner";
import type { AuthStore } from "../lib/auth/store";
import type { UpstreamJobs } from "../lib/jobs/upstream";
import {
  EARLY_CAREER_TERMS,
  TARGET_CLASS_YEAR,
  isEarlyCareerSoftware,
  namesTargetClass,
} from "../lib/new-grad/titles";
import { readLocation } from "../lib/new-grad/location";
import { currentUser } from "./auth";

/**
 * The owner's own list of US early-career software postings.
 *
 * `/jobs` is the public surface and stays identity-free. This is a second surface for
 * one reader, and the difference that justifies it is not the filter — it is that this
 * one remembers. What arrived since the last look and what closed since it are the two
 * facts a re-run spreadsheet cannot hold, and they are the reason this exists.
 *
 * **Why several upstream requests.** `/api/postings` takes one `title` and matches it
 * as `ilike`. This list needs (software AND early-career MINUS seniority), which one
 * substring cannot express — so each early-career term goes out as its own question and
 * the precise test runs here. That fan-out is deliberate and temporary: when
 * `.harness/backlogs/016` opens this to every user the query belongs upstream, and this
 * is what gets deleted.
 *
 * Nothing here spends anything. The upstream's browse route writes no delivery row, and
 * reading this list does not advance the marker — that is `POST /ack`, on purpose, so a
 * reload or a second tab cannot consume the one answer the page is for.
 */

/** Enough of a posting to show the owner a row that has since closed. */
export type ListedPosting = {
  job_id: number;
  employer_name: string;
  title: string;
  url: string | null;
};

export type ListMarker = {
  /** False until the owner has acknowledged once. Before that, nothing is "new". */
  acknowledged: boolean;
  listed: ListedPosting[];
};

/**
 * Where the marker lives. A seam for the same reason `AuthStore` is one: the route's
 * tests run the real gate and the real narrowing against memory, and the drizzle
 * implementation is swapped in at wiring.
 */
export type MarkerStore = {
  read(userId: number): Promise<ListMarker>;
  write(userId: number, listed: ListedPosting[]): Promise<void>;
};

/**
 * Said on the page, verbatim, with and without postings.
 *
 * 164 of the owner's own 376 US rows sit on employer-run careers sites — 77 of them
 * TikTok and ByteDance alone — and `ROADMAP.md` 第一步 defers those as a compliance
 * question. A reader who does not know that reads an absence as an answer.
 */
const BOARD_NOTE =
  "Built from the employer job boards we poll. Employers running their own careers " +
  "site — TikTok, ByteDance, Amazon, Apple, Google and others — are not among them, " +
  "so this list is not all of the market.";

/** One page is plenty per term: these are the selective half of the filter. */
const PER_TERM_LIMIT = 100;

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

/** Newest first, undated last, ties by id — the rule the upstream already sorts by. */
function newestFirst(a: UpstreamPosting, b: UpstreamPosting): number {
  const left = typeof a["posted_at"] === "string" ? (a["posted_at"] as string) : "";
  const right = typeof b["posted_at"] === "string" ? (b["posted_at"] as string) : "";
  if (left !== right) return right.localeCompare(left);
  return a.job_id - b.job_id;
}

async function gather(upstream: UpstreamJobs): Promise<UpstreamPosting[]> {
  const byId = new Map<number, UpstreamPosting>();

  // Sequential rather than parallel: one reader is asking, and the upstream's rate
  // limit is per calling server rather than per browser. `022` next door was made to
  // state its request count for the same reason — a courtesy endpoint is a courtesy.
  for (const term of EARLY_CAREER_TERMS) {
    const path =
      `/api/postings?title=${encodeURIComponent(term)}&limit=${PER_TERM_LIMIT}`;
    for (const posting of postingsOf(await upstream(path))) {
      // A posting several terms match is one posting. Merged here or the owner reads
      // the same req once per term that happened to hit it.
      byId.set(posting.job_id, posting);
    }
  }

  return [...byId.values()];
}

export function createNewGradRouter(
  store: AuthStore,
  upstream: UpstreamJobs,
  markers: MarkerStore,
): IRouter {
  const router: IRouter = Router();

  /**
   * Uniform 404 for everyone who is not the owner — no session, an expired one, or
   * somebody else's perfectly good account. Returned before the upstream is touched,
   * so a stranger cannot make this server spend its shared secret.
   */
  async function owner(req: Parameters<Parameters<IRouter["get"]>[1]>[0]) {
    const signedIn = await currentUser(store, req);
    return signedIn && isOwner(signedIn.email) ? signedIn : null;
  }

  async function build(userId: number, upstreamJobs: UpstreamJobs) {
    const raw = await gather(upstreamJobs);

    const kept = raw
      .filter((p) => isEarlyCareerSoftware(p.title))
      // `other` is absent rather than ranked low: a req for the class before this one
      // is not a worse match, it is somebody else's.
      .filter((p) => namesTargetClass(p.title) !== "other")
      .filter(
        (p) =>
          readLocation(typeof p["location"] === "string" ? (p["location"] as string) : null) !==
          "elsewhere",
      );

    const marker = await markers.read(userId);
    const seen = new Set(marker.listed.map((p) => p.job_id));

    const postings = kept
      .sort((a, b) => {
        const byClass =
          Number(namesTargetClass(b.title) === "target") -
          Number(namesTargetClass(a.title) === "target");
        return byClass !== 0 ? byClass : newestFirst(a, b);
      })
      .map((p) => ({
        ...p,
        class_year: namesTargetClass(p.title),
        location_read: readLocation(
          typeof p["location"] === "string" ? (p["location"] as string) : null,
        ),
        // Nothing is new to somebody who has never acknowledged: calling the whole
        // list new on first contact is noise, and the first ack sets the baseline.
        is_new: marker.acknowledged && !seen.has(p.job_id),
      }));

    const open = new Set(kept.map((p) => p.job_id));
    const closed = marker.listed.filter((p) => !open.has(p.job_id));

    return { postings, closed, listed: kept };
  }

  router.get("/", async (req, res) => {
    let signedIn;
    try {
      signedIn = await owner(req);
    } catch (err) {
      req.log?.error({ err }, "Failed to read session");
      res.status(500).json({ error: "Internal server error" });
      return;
    }
    if (!signedIn) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    try {
      const { postings, closed } = await build(signedIn.id, upstream);
      res.json({
        target_class_year: TARGET_CLASS_YEAR,
        postings,
        closed,
        board_note: BOARD_NOTE,
      });
    } catch (err) {
      // Only the owner reaches this, so it can say what broke rather than leave them
      // unable to tell a locked door from a broken one.
      req.log?.error({ err }, "Failed to reach the job feed");
      res.status(502).json({ error: "Could not reach the job feed" });
    }
  });

  router.post("/ack", async (req, res) => {
    let signedIn;
    try {
      signedIn = await owner(req);
    } catch (err) {
      req.log?.error({ err }, "Failed to read session");
      res.status(500).json({ error: "Internal server error" });
      return;
    }
    if (!signedIn) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    try {
      // Recomputed rather than taken from the request: an acknowledgement the caller
      // supplies the contents of is one that can be made to say anything.
      const { listed } = await build(signedIn.id, upstream);
      await markers.write(
        signedIn.id,
        listed.map((p) => ({
          job_id: p.job_id,
          employer_name: p.employer_name,
          title: p.title,
          url: typeof p["url"] === "string" ? (p["url"] as string) : null,
        })),
      );
      res.status(204).end();
    } catch (err) {
      req.log?.error({ err }, "Failed to record the acknowledgement");
      res.status(502).json({ error: "Could not reach the job feed" });
    }
  });

  return router;
}
