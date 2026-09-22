/**
 * The AuthStore backed by Postgres. Deliberately thin: every method is one query and
 * a shape change, so the behaviour worth testing lives in the routes and the modules
 * beside this one, where it can be tested without a database.
 */

import { db, sessionsTable, usersTable } from "@workspace/db";
import { and, eq, gt, isNull, sql } from "drizzle-orm";

import type { AuthStore, UserRecord } from "./store";

function toRecord(row: {
  id: number;
  email: string;
  passwordHash: string | null;
}): UserRecord {
  return { id: row.id, email: row.email, passwordHash: row.passwordHash };
}

export class DrizzleAuthStore implements AuthStore {
  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const [row] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);
    return row ? toRecord(row) : null;
  }

  async createUser(email: string, passwordHash: string): Promise<UserRecord> {
    return this.insert(email, passwordHash);
  }

  async createPasswordlessUser(email: string): Promise<UserRecord> {
    return this.insert(email, null);
  }

  /**
   * Both creation paths, for the reason `memory-store` gives for sharing its own:
   * two implementations of one insert are two places for the duplicate-address
   * behaviour to drift apart.
   *
   * The empty check replaces a `!`. `.returning()` on a successful single-row
   * insert always yields one, so this branch is unreachable — but saying so with
   * an assertion tells the compiler to stop looking, in the one file whose job is
   * to stop passing comfortable lies upwards.
   */
  private async insert(
    email: string,
    passwordHash: string | null,
  ): Promise<UserRecord> {
    const [row] = await db
      .insert(usersTable)
      .values({ email, passwordHash })
      .returning();
    if (!row) throw new Error("insert returned no row");
    return toRecord(row);
  }

  /**
   * The two rows that put a Google-proved address on the owner's list.
   *
   * **Raw SQL, and not a Drizzle table, on purpose.** `registrations` and
   * `email_verifications` belong to h1_checker's `models.py`, which migrates them
   * lazily at runtime — that is how `email_verifications.last_verified_at` arrived
   * after the table had shipped. Since the 2026-09-21 cutover both repos share one
   * `DATABASE_URL`. Declaring these two in `lib/db/src/schema/` would pull them into
   * `db run push`'s scope here, and a push run from this repo for an unrelated coach
   * change would reconcile its stale idea of them against the real thing. Nothing
   * would error; a column h1_checker added would simply be gone. Keeping them out of
   * the schema is what makes that impossible rather than merely unlikely.
   *
   * The cost is that the column names are not checked by the compiler.
   * `store.contract.test.ts` pays it.
   */
  async recordProvenAddress(email: string, now: Date): Promise<void> {
    /* `client_id IS NULL` in the guard, never `= NULL`, which matches nothing and
       would insert a row per sign-in. NULL is correct here: `client_id` names a
       browser extension install, and somebody signing in on this site has none.
       Inventing one would put a false install on the dashboard's Installed column. */
    await db.execute(sql`
      INSERT INTO registrations (email, client_id, created_at)
      SELECT ${email}, NULL, ${now}
      WHERE NOT EXISTS (
        SELECT 1 FROM registrations
        WHERE email = ${email} AND client_id IS NULL
      )
    `);

    /* `email` is unique here, so this is an upsert rather than a guarded insert.
       `verified_at` is when the address was FIRST proved and must not drift — the rule
       h1_checker's own `/verify` follows — so it is only set when absent, while
       `last_verified_at` records this proof. `token_hash` is NOT NULL and unique and
       holds the hash of a token that is generated here and dropped: nothing is mailed,
       so nothing can be redeemed with it. */
    await db.execute(sql`
      INSERT INTO email_verifications
        (email, token_hash, sent_at, verified_at, last_verified_at)
      VALUES (
        ${email},
        encode(sha256((gen_random_uuid()::text || ${email})::bytea), 'hex'),
        ${now}, ${now}, ${now}
      )
      ON CONFLICT (email) DO UPDATE SET
        verified_at = COALESCE(email_verifications.verified_at, EXCLUDED.verified_at),
        last_verified_at = EXCLUDED.last_verified_at
    `);
  }

  async clearPassword(userId: number): Promise<void> {
    await db
      .update(usersTable)
      .set({ passwordHash: null })
      .where(eq(usersTable.id, userId));
  }

  async createSession(
    userId: number,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await db.insert(sessionsTable).values({ userId, tokenHash, expiresAt });
  }

  async findUserByLiveSession(
    tokenHash: string,
    now: Date,
  ): Promise<UserRecord | null> {
    // Expiry and revocation are part of the query, not a check the caller might skip.
    const [row] = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        passwordHash: usersTable.passwordHash,
      })
      .from(sessionsTable)
      .innerJoin(usersTable, eq(usersTable.id, sessionsTable.userId))
      .where(
        and(
          eq(sessionsTable.tokenHash, tokenHash),
          isNull(sessionsTable.revokedAt),
          gt(sessionsTable.expiresAt, now),
        ),
      )
      .limit(1);
    return row ? toRecord(row) : null;
  }

  async revokeSession(tokenHash: string): Promise<void> {
    // No row matched is the normal case for a stale cookie, not an error.
    await db
      .update(sessionsTable)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(sessionsTable.tokenHash, tokenHash),
          isNull(sessionsTable.revokedAt),
        ),
      );
  }

  async recordLogin(userId: number, at: Date): Promise<void> {
    await db
      .update(usersTable)
      .set({ lastLoginAt: at })
      .where(eq(usersTable.id, userId));
  }
}
