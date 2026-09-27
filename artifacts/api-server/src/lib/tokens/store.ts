/**
 * Personal API tokens: a credential that authenticates a tool the owner runs, as them.
 *
 * **This used to live on `CoachStore`** and moved here on 2026-09-27, when a second caller
 * needed it. Not copied — moved: two implementations reading one table is how the two drift,
 * and the thing they would drift about is who a credential belongs to.
 *
 * The table behind it is still called `coach_api_tokens`. That name is stale and is kept
 * because three coach routes read it; the column comment in `lib/db/src/schema/coach.ts` says
 * so at the source rather than here.
 *
 * Two rules the callers depend on and must not re-decide:
 *
 * - **Scope is read from the stored row, never from the request.** A caller cannot ask for one.
 * - **A token is issued from a session only.** A bearer token cannot mint its successor, so a
 *   leaked one cannot quietly grow a wider scope. That rule lives at the issuing route.
 */

/** What a token opens. Stored per row; `coach` is the default for everything issued before scopes existed. */
export type TokenScope = "coach" | "applications";

export type TokenUser = { id: number; email: string };

export interface TokenStore {
  /** Store a new token hash for this scope, revoking the user's live tokens **of that scope**. */
  createToken(userId: number, tokenHash: string, scope: TokenScope): Promise<void>;

  /** Idempotent: revoking with no live tokens is a no-op. */
  revokeTokens(userId: number, scope: TokenScope): Promise<void>;

  /**
   * The owner of a live token **of the required scope**, or null; touches last_used_at.
   *
   * Null for a token of another scope, exactly as for one that was never issued — the caller
   * turns both into the same 404, so probing cannot map what a token opens.
   */
  findUserByLiveToken(
    tokenHash: string,
    scope: TokenScope,
    now: Date,
  ): Promise<TokenUser | null>;
}

type Row = { userId: number; scope: TokenScope; revoked: boolean; lastUsedAt: Date | null };

/** The seam in memory, so routes are tested against real tokens and no Postgres. */
export class InMemoryTokenStore implements TokenStore {
  private readonly tokens = new Map<string, Row>();
  private readonly users = new Map<number, TokenUser>();

  /** Test helper: an identity for tokens to belong to. */
  seedUser(user: TokenUser): void {
    this.users.set(user.id, user);
  }

  async createToken(userId: number, tokenHash: string, scope: TokenScope): Promise<void> {
    await this.revokeTokens(userId, scope);
    this.tokens.set(tokenHash, { userId, scope, revoked: false, lastUsedAt: null });
  }

  async revokeTokens(userId: number, scope: TokenScope): Promise<void> {
    for (const token of this.tokens.values()) {
      // Scoped, so revoking the folder's token does not sign the grill bridge out.
      if (token.userId === userId && token.scope === scope) token.revoked = true;
    }
  }

  async findUserByLiveToken(
    tokenHash: string,
    scope: TokenScope,
    now: Date,
  ): Promise<TokenUser | null> {
    const token = this.tokens.get(tokenHash);
    if (!token || token.revoked || token.scope !== scope) return null;
    token.lastUsedAt = now;
    return this.users.get(token.userId) ?? null;
  }
}
