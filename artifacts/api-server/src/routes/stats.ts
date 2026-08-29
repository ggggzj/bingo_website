import { Router, type IRouter } from "express";

import { isOwner } from "../lib/auth/owner";
import type { AuthStore } from "../lib/auth/store";
import { currentUser } from "./auth";

/**
 * Fetches one path from the extension's API. A seam so the tests can run the real
 * gate against a fake service — and so the only code holding the shared secret is
 * one small module with no routing in it.
 */
export type UpstreamStats = (path: string) => Promise<unknown>;

/**
 * The two numeric parameters the dashboard sends, with the bounds the other service
 * already enforces. Nothing else is forwarded: this route builds the upstream path
 * itself out of values it has checked, so it can never be steered into asking that
 * service for something the dashboard did not ask for.
 */
const FORWARDED: Record<string, { param: string; min: number; max: number }> = {
  "/daily": { param: "days", min: 1, max: 365 },
  "/registrations": { param: "limit", min: 1, max: 1000 },
};

function upstreamPath(route: string, query: unknown): string {
  const base = `/stats${route === "/" ? "" : route}`;
  const rule = FORWARDED[route];
  if (!rule) return base;

  const raw = (query as Record<string, unknown> | undefined)?.[rule.param];
  if (typeof raw !== "string") return base;

  const value = Number(raw);
  if (!Number.isInteger(value) || value < rule.min || value > rule.max) {
    // Dropped rather than rejected: a nonsense window should still draw the
    // dashboard, on the other service's default.
    return base;
  }
  return `${base}?${rule.param}=${value}`;
}

export function createStatsRouter(
  store: AuthStore,
  upstream: UpstreamStats,
): IRouter {
  const router: IRouter = Router();

  for (const route of ["/", "/daily", "/registrations"]) {
    router.get(route, async (req, res) => {
      // Uniform 404 for everyone who is not the owner — no session, an expired one,
      // or somebody else's perfectly good account. A 401 here would confirm to a
      // prober that the route exists and what it wants.
      const notFound = () => res.status(404).json({ error: "Not found" });

      let signedIn;
      try {
        signedIn = await currentUser(store, req);
      } catch (err) {
        req.log?.error({ err }, "Failed to read session");
        res.status(500).json({ error: "Internal server error" });
        return;
      }

      if (!signedIn || !isOwner(signedIn.email)) {
        notFound();
        return;
      }

      try {
        res.json(await upstream(upstreamPath(route, req.query)));
      } catch (err) {
        // Only the owner ever gets here, so this can say what went wrong instead of
        // leaving them unable to tell a locked door from a broken one.
        req.log?.error({ err }, "Failed to reach the stats service");
        res.status(502).json({ error: "Could not reach the stats service" });
      }
    });
  }

  return router;
}
