import { coachApiTokensTable, db, usersTable } from "@workspace/db";
import { and, eq, isNull } from "drizzle-orm";

import type { TokenScope, TokenStore, TokenUser } from "./store";

/**
 * Personal tokens in Postgres. Moved here from `DrizzleCoachStore` on 2026-09-27 unchanged
 * except for the scope, which is now part of every one of the three operations.
 *
 * The table is `coach_api_tokens` and the name is stale — see the column comment in
 * `lib/db/src/schema/coach.ts` for why it is not renamed.
 */
export class DrizzleTokenStore implements TokenStore {
  constructor(private readonly database: typeof db = db) {}

  async createToken(userId: number, tokenHash: string, scope: TokenScope): Promise<void> {
    await this.database.transaction(async (tx) => {
      /**
       * Issuing replaces — but only within the scope. Revoking every token the user had would
       * mean asking for a folder token signed the grill bridge out, which is a surprise nobody
       * would connect to the thing they just did.
       */
      await tx
        .update(coachApiTokensTable)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(coachApiTokensTable.userId, userId),
            eq(coachApiTokensTable.scope, scope),
            isNull(coachApiTokensTable.revokedAt),
          ),
        );
      await tx.insert(coachApiTokensTable).values({ userId, tokenHash, scope });
    });
  }

  async revokeTokens(userId: number, scope: TokenScope): Promise<void> {
    await this.database
      .update(coachApiTokensTable)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(coachApiTokensTable.userId, userId),
          eq(coachApiTokensTable.scope, scope),
          isNull(coachApiTokensTable.revokedAt),
        ),
      );
  }

  async findUserByLiveToken(
    tokenHash: string,
    scope: TokenScope,
    now: Date,
  ): Promise<TokenUser | null> {
    const [row] = await this.database
      .select({ id: usersTable.id, email: usersTable.email })
      .from(coachApiTokensTable)
      .innerJoin(usersTable, eq(usersTable.id, coachApiTokensTable.userId))
      .where(
        and(
          eq(coachApiTokensTable.tokenHash, tokenHash),
          // Scope is a condition of the lookup, not a check after it: a token of the wrong
          // scope is indistinguishable here from one that was never issued.
          eq(coachApiTokensTable.scope, scope),
          isNull(coachApiTokensTable.revokedAt),
        ),
      )
      .limit(1);
    if (!row) return null;
    await this.database
      .update(coachApiTokensTable)
      .set({ lastUsedAt: now })
      .where(eq(coachApiTokensTable.tokenHash, tokenHash));
    return row;
  }
}
