import { Router, type IRouter } from "express";

import type { UpstreamJobs } from "../lib/jobs/upstream";

/**
 * The public job feed, proxied from the extension's API.
 *
 * Read-only and identity-free: no session is read, nothing is written, and calling it
 * twice returns the same page. That is the whole difference from the feed's own
 * `/api/my/*` routes over there, which belong to one signed-in person and spend what
 * they hand out.
 *
 * This route does **not** forward the caller's query. It holds the allowlist below
 * and builds the upstream path itself, which is `stats.ts`'s rule and the reason a
 * caller can never steer this server into asking the job feed for something the page
 * did not ask for. Three of these parameters are free text typed by strangers, so
 * each is bounded and re-encoded here even though the upstream route bounds them
 * again — a bound checked in one place is a bound that moves when someone edits the
 * other.
 */

const UPSTREAM_PATH = "/api/postings";

/** Longest search string the page can send. Upstream caps it too. */
const TEXT_MAX = 100;

type Rule =
  | { kind: "text"; max: number }
  | { kind: "int"; min: number; max: number }
  | { kind: "bool" };

const ALLOWED: Record<string, Rule> = {
  employer: { kind: "text", max: TEXT_MAX },
  title: { kind: "text", max: TEXT_MAX },
  location: { kind: "text", max: TEXT_MAX },
  remote_only: { kind: "bool" },
  include_refusals: { kind: "bool" },
  posted_within_days: { kind: "int", min: 1, max: 365 },
  limit: { kind: "int", min: 1, max: 100 },
  offset: { kind: "int", min: 0, max: 10_000 },
};

/**
 * One parameter's value, or undefined to drop it.
 *
 * Dropped rather than rejected, per the stats precedent: a hand-edited URL should
 * degrade to a wider page on the other service's defaults rather than to an error
 * screen. Only a string is ever considered — Express turns `?title=a&title=b` into an
 * array, and forwarding that would send the upstream validator a shape it has never
 * seen.
 */
function checked(rule: Rule, raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;

  if (rule.kind === "text") {
    const value = raw.trim();
    if (!value || value.length > rule.max) return undefined;
    return value;
  }

  if (rule.kind === "bool") {
    return raw === "true" || raw === "false" ? raw : undefined;
  }

  const value = Number(raw);
  if (!Number.isInteger(value) || value < rule.min || value > rule.max) {
    return undefined;
  }
  return String(value);
}

/** The upstream path, built here out of values this server has checked. */
export function upstreamPath(query: unknown): string {
  const source = (query ?? {}) as Record<string, unknown>;
  const params = new URLSearchParams();

  for (const [name, rule] of Object.entries(ALLOWED)) {
    const value = checked(rule, source[name]);
    // URLSearchParams encodes on the way out, so a quote, an ampersand or a `#`
    // stays a value and cannot change which path is requested.
    if (value !== undefined) params.set(name, value);
  }

  const query_string = params.toString();
  return query_string ? `${UPSTREAM_PATH}?${query_string}` : UPSTREAM_PATH;
}

export function createJobsRouter(upstream: UpstreamJobs): IRouter {
  const router: IRouter = Router();

  router.get("/", async (req, res) => {
    try {
      res.json(await upstream(upstreamPath(req.query)));
    } catch (err) {
      // The page is public, so this says nothing about why. The status and the
      // upstream's own message go to the log, where the operator can read them.
      req.log?.error({ err }, "Failed to reach the job feed");
      res.status(502).json({ error: "Could not reach the job feed" });
    }
  });

  return router;
}
