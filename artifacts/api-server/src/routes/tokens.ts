import { Router, type IRouter } from "express";

import { isOwner } from "../lib/auth/owner";
import { hashToken, newSessionToken } from "../lib/auth/session";
import type { AuthStore } from "../lib/auth/store";
import type { TokenScope, TokenStore } from "../lib/tokens/store";
import { currentUser } from "./auth";

/**
 * Issuing and revoking the credential a tool on the owner's machine uses to act as them.
 *
 * **Session-only, and that is the rule this file exists to hold.** A bearer token may not mint
 * its successor: if it could, a leaked token could ask for a wider scope and the scope would
 * stop meaning anything. `coach.ts` states the same rule at its own issuing route, which is
 * where this one was learned.
 *
 * Owner-only for now. Per-user tokens are not a feature this offers — they bring storage,
 * rotation, abuse and support with them, and `.harness/backlogs/017` is where that decision
 * belongs.
 */

const SCOPES: readonly TokenScope[] = ["coach", "applications"];

function readScope(body: unknown): TokenScope | null {
  if (typeof body !== "object" || body === null) return null;
  const scope = (body as Record<string, unknown>)["scope"];
  return typeof scope === "string" && (SCOPES as readonly string[]).includes(scope)
    ? (scope as TokenScope)
    : null;
}

export function createTokensRouter(store: AuthStore, tokens: TokenStore): IRouter {
  const router: IRouter = Router();

  /**
   * Deliberately `currentUser` and not any bearer-aware resolver — the session cookie is the
   * only credential accepted here, and reading this file should make that obvious rather than
   * requiring a reader to trace what a gate accepts.
   */
  async function owner(req: Parameters<Parameters<IRouter["post"]>[1]>[0]) {
    const signedIn = await currentUser(store, req);
    return signedIn && isOwner(signedIn.email) ? signedIn : null;
  }

  router.post("/", async (req, res) => {
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

    const scope = readScope(req.body);
    if (!scope) {
      res.status(400).json({ error: `Scope must be one of: ${SCOPES.join(", ")}` });
      return;
    }

    try {
      const token = newSessionToken();
      // Only the hash is stored; the plaintext exists in this response and nowhere else.
      await tokens.createToken(signedIn.id, hashToken(token), scope);
      res.status(201).json({ token, scope });
    } catch (err) {
      req.log?.error({ err }, "Failed to issue a token");
      res.status(500).json({ error: "Internal server error" });
    }
  });

  router.delete("/", async (req, res) => {
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

    const scope = readScope(req.body);
    if (!scope) {
      res.status(400).json({ error: `Scope must be one of: ${SCOPES.join(", ")}` });
      return;
    }

    try {
      await tokens.revokeTokens(signedIn.id, scope);
      res.json({ ok: true });
    } catch (err) {
      req.log?.error({ err }, "Failed to revoke tokens");
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}
