import { Router, type IRouter, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { randomBytes } from "node:crypto";
import { z } from "zod";

import { isOwner } from "../lib/auth/owner";
import { hashPassword, verifyPassword } from "../lib/auth/password";
import {
  SESSION_COOKIE,
  hashToken,
  newSessionToken,
  sessionCookieOptions,
  sessionExpiry,
} from "../lib/auth/session";
import type { AuthStore, UserRecord } from "../lib/auth/store";

// Long rather than fussy: length is the only password rule that reliably buys
// anything, and character-class rules mostly buy "Password1!".
const MIN_PASSWORD_LENGTH = 10;

const credentials = z.object({
  email: z.string().trim().email().max(320),
  // Capped because the whole string is fed to scrypt, and an unbounded one turns a
  // login into as much work as the sender cares to ask for.
  password: z.string().min(MIN_PASSWORD_LENGTH).max(200),
});

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * A real hash of a value nobody knows, so an address with no account still costs a
 * full scrypt to refuse. Built once at startup rather than per request — the point
 * is to spend the time verifying, not to spend twice as much.
 */
const DECOY_HASH = await hashPassword(randomBytes(32).toString("base64"));

/** What every authenticated route answers with. `isOwner` is read from config, never stored. */
function describe(user: UserRecord) {
  return { email: user.email, isOwner: isOwner(user.email) };
}

async function startSession(
  store: AuthStore,
  res: Response,
  user: UserRecord,
  now: Date,
): Promise<void> {
  const token = newSessionToken();
  await store.createSession(user.id, hashToken(token), sessionExpiry(now));
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions());
}

/** The signed-in user, or null. Never throws — callers decide what "nobody" means. */
export async function currentUser(
  store: AuthStore,
  req: Request,
): Promise<UserRecord | null> {
  const token = req.cookies?.[SESSION_COOKIE];
  if (typeof token !== "string" || token.length === 0) return null;
  return store.findUserByLiveSession(hashToken(token), new Date());
}

/**
 * A password is only as strong as the number of guesses someone gets, and scrypt
 * slows an attacker down far more per guess than it slows this server down per
 * login — but only up to the rate at which guesses can be sent. Counted per IP
 * rather than per account, so nobody can lock a real person out by guessing at them.
 */
function attemptLimiter(max: number, windowMinutes: number) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit: max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Too many attempts. Try again in a few minutes." },
  });
}

export function createAuthRouter(store: AuthStore): IRouter {
  const router: IRouter = Router();

  // Signing up is rarer than signing in and costs a row, so it gets the tighter one.
  const signUpLimiter = attemptLimiter(10, 60);
  const signInLimiter = attemptLimiter(10, 15);

  router.post("/register", signUpLimiter, async (req, res) => {
    const parsed = credentials.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({
        error: `Enter a valid email and a password of at least ${MIN_PASSWORD_LENGTH} characters`,
      });
      return;
    }

    const email = normalizeEmail(parsed.data.email);

    try {
      /* The owner's account is never created here. Sign-up is open and an address is
         not verified, so otherwise the first stranger to guess OWNER_EMAIL — a real,
         published address — would hold the account the dashboard is keyed to. It is
         created out of band instead: `pnpm --filter @workspace/api-server run
         set-owner-password`. The answer is the same one a taken address gets, so the
         form does not double as a way to ask which address owns the site. */
      if (isOwner(email) || (await store.findUserByEmail(email))) {
        res.status(409).json({ error: "That email already has an account" });
        return;
      }

      const user = await store.createUser(
        email,
        await hashPassword(parsed.data.password),
      );
      await startSession(store, res, user, new Date());
      res.status(201).json(describe(user));
    } catch (err) {
      req.log?.error({ err }, "Failed to register");
      res.status(500).json({ error: "Internal server error" });
    }
  });

  router.post("/login", signInLimiter, async (req, res) => {
    const parsed = credentials.safeParse(req.body);
    // One answer for a malformed body, an unknown address and a wrong password.
    // Anything more specific turns this endpoint into a way to ask whether a given
    // person has an account here.
    const refuse = () =>
      res.status(401).json({ error: "Wrong email or password" });

    if (!parsed.success) {
      refuse();
      return;
    }

    try {
      const user = await store.findUserByEmail(normalizeEmail(parsed.data.email));
      /* Hash even when there is nobody to compare against. Checking a password costs
         about a tenth of a second and saying "no such person" costs nothing, and that
         difference is readable over the network — it would turn this endpoint back
         into the account-enumeration tool the single 401 above is meant to close. */
      const matched = await verifyPassword(
        parsed.data.password,
        user?.passwordHash ?? DECOY_HASH,
      );
      if (!user || !matched) {
        refuse();
        return;
      }

      const now = new Date();
      await startSession(store, res, user, now);
      await store.recordLogin(user.id, now);
      res.json(describe(user));
    } catch (err) {
      req.log?.error({ err }, "Failed to sign in");
      res.status(500).json({ error: "Internal server error" });
    }
  });

  router.post("/logout", async (req, res) => {
    const token = req.cookies?.[SESSION_COOKIE];
    try {
      if (typeof token === "string" && token.length > 0) {
        await store.revokeSession(hashToken(token));
      }
      // Cleared with the same attributes it was set with — a mismatched path or
      // sameSite leaves the old cookie in place and the browser still sends it.
      const { maxAge: _ignored, ...attributes } = sessionCookieOptions();
      res.clearCookie(SESSION_COOKIE, attributes);
      // Answers the same whether or not there was a session to end: a caller asking
      // to be signed out should never be told they were not signed in.
      res.json({ ok: true });
    } catch (err) {
      req.log?.error({ err }, "Failed to sign out");
      res.status(500).json({ error: "Internal server error" });
    }
  });

  router.get("/me", async (req, res) => {
    try {
      const user = await currentUser(store, req);
      if (!user) {
        res.status(401).json({ error: "Not signed in" });
        return;
      }
      res.json(describe(user));
    } catch (err) {
      req.log?.error({ err }, "Failed to read session");
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}
