/**
 * The AuthStore backed by Postgres. Deliberately thin: every method is one query and
 * a shape change, so the behaviour worth testing lives in the routes and the modules
 * beside this one, where it can be tested without a database.
 */

import { db, sessionsTable, usersTable } from "@workspace/db";
import { and, eq, gt, isNull } from "drizzle-orm";

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
