/**
 * Who is calling a coach route. Two credentials are accepted — the browser
 * session cookie, or a personal bearer token (the local grill bridge) — and
 * both then pass the COACH_EMAILS allowlist. Everyone else gets the same
 * uniform 404 the stats routes use, so probing never confirms the feature
 * exists. Removal from the allowlist wins over any credential: a still-live
 * token stops working the moment the email leaves COACH_EMAILS.
 */

import type { NextFunction, Request, Response } from "express";

import { isCoachUser } from "../auth/coach";
import { hashToken } from "../auth/session";
import type { AuthStore } from "../auth/store";
import { currentUser } from "../../routes/auth";
import type { CoachStore, CoachUser } from "./store";

function bearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (typeof header !== "string") return null;
  const [scheme, value] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !value) return null;
  return value;
}

/** The calling coach user via session or bearer token, or null. Never throws. */
export async function currentCoachUser(
  authStore: AuthStore,
  coachStore: CoachStore,
  req: Request,
): Promise<CoachUser | null> {
  const viaSession = await currentUser(authStore, req);
  if (viaSession) return { id: viaSession.id, email: viaSession.email };

  const token = bearerToken(req);
  if (!token) return null;
  return coachStore.findUserByLiveToken(hashToken(token), new Date());
}

export const COACH_USER = "coachUser";

/**
 * Gate middleware: resolves the caller, applies the allowlist, and answers
 * a uniform 404 otherwise. Handlers behind it read the user from
 * `res.locals[COACH_USER]`.
 */
export function coachGate(authStore: AuthStore, coachStore: CoachStore) {
  return async (req: Request, res: Response, next: NextFunction) => {
    let user: CoachUser | null;
    try {
      user = await currentCoachUser(authStore, coachStore, req);
    } catch (err) {
      req.log?.error({ err }, "Failed to resolve coach caller");
      res.status(500).json({ error: "Internal server error" });
      return;
    }
    if (!user || !isCoachUser(user.email)) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.locals[COACH_USER] = user;
    next();
  };
}
