/**
 * Personal tokens, run against both implementations.
 *
 * The lifecycle half moved here from `coach/store.contract.test.ts` when tokens stopped being
 * the coach's. The scope half is new, and is the only reason this change exists: a token issued
 * for practice must not reach the table holding the only copy of the owner's rejection letters.
 *
 * The Postgres half runs when COACH_TEST_DATABASE_URL names a scratch database, the same gate
 * its neighbours use; the memory half always runs.
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { eq, sql } from "drizzle-orm";
import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import * as schema from "@workspace/db/schema";
import { DrizzleTokenStore } from "./drizzle-store";
import { InMemoryTokenStore, type TokenStore } from "./store";

const PG_URL = process.env["COACH_TEST_DATABASE_URL"];
const EMAIL = "tokens-contract@test.local";

type Harness = { store: TokenStore; userId: number };

function runContract(name: string, make: () => Promise<Harness>) {
  describe(name, () => {
    let h: Harness;
    const now = new Date();

    beforeEach(async () => {
      h = await make();
    });

    it("resolves a live token, and nothing else", async () => {
      await h.store.createToken(h.userId, "hash-one", "coach");

      expect(await h.store.findUserByLiveToken("hash-one", "coach", now)).toMatchObject({
        id: h.userId,
      });
      expect(await h.store.findUserByLiveToken("hash-unknown", "coach", now)).toBeNull();
    });

    it("rotates: issuing again kills the one before it", async () => {
      await h.store.createToken(h.userId, "hash-one", "coach");
      await h.store.createToken(h.userId, "hash-two", "coach");

      expect(await h.store.findUserByLiveToken("hash-one", "coach", now)).toBeNull();
      expect(await h.store.findUserByLiveToken("hash-two", "coach", now)).toMatchObject({
        id: h.userId,
      });
    });

    it("revokes, and revoking an empty slate is a no-op", async () => {
      await h.store.createToken(h.userId, "hash-two", "coach");

      await h.store.revokeTokens(h.userId, "coach");
      expect(await h.store.findUserByLiveToken("hash-two", "coach", now)).toBeNull();
      await h.store.revokeTokens(h.userId, "coach");
    });

    /**
     * The point of the change. A credential handed to a practice tool must not become a way
     * into the applications table; a token's reach is decided when it is issued.
     */
    it("does not resolve a token of another scope", async () => {
      await h.store.createToken(h.userId, "practice", "coach");

      expect(await h.store.findUserByLiveToken("practice", "applications", now)).toBeNull();
      // Indistinguishable from a token that was never issued, so probing cannot map scopes.
      expect(await h.store.findUserByLiveToken("never-issued", "applications", now)).toBeNull();
    });

    it("keeps one scope's token alive when the other is issued or revoked", async () => {
      await h.store.createToken(h.userId, "practice", "coach");
      await h.store.createToken(h.userId, "folder", "applications");

      // Issuing the second did not sign the first out.
      expect(await h.store.findUserByLiveToken("practice", "coach", now)).toMatchObject({
        id: h.userId,
      });

      await h.store.revokeTokens(h.userId, "applications");
      expect(await h.store.findUserByLiveToken("folder", "applications", now)).toBeNull();
      expect(await h.store.findUserByLiveToken("practice", "coach", now)).toMatchObject({
        id: h.userId,
      });
    });
  });
}

runContract("InMemoryTokenStore", async () => {
  const store = new InMemoryTokenStore();
  store.seedUser({ id: 1, email: EMAIL });
  return { store, userId: 1 };
});

describe.skipIf(!PG_URL)("DrizzleTokenStore (Postgres)", () => {
  const pool = PG_URL ? new pg.Pool({ connectionString: PG_URL }) : null;
  const database = pool ? drizzle(pool, { schema }) : null;

  beforeAll(async () => {
    // The scratch database predates the column; `if not exists` makes this idempotent, and
    // the default is the same one production carries.
    await database!.execute(
      sql`alter table coach_api_tokens add column if not exists scope text not null default 'coach'`,
    );
    await database!.delete(schema.usersTable).where(eq(schema.usersTable.email, EMAIL));
  });

  afterAll(async () => {
    if (!pool) return;
    await database!.delete(schema.usersTable).where(eq(schema.usersTable.email, EMAIL));
    await pool.end();
  });

  runContract("contract", async () => {
    await database!.delete(schema.usersTable).where(eq(schema.usersTable.email, EMAIL));
    const [user] = await database!
      .insert(schema.usersTable)
      .values({ email: EMAIL, passwordHash: null, createdAt: new Date() })
      .returning();
    return { store: new DrizzleTokenStore(database! as never), userId: user!.id };
  });

  /**
   * The guarantee the production migration rests on: rows written before scopes existed read
   * as `coach`, so nothing already in somebody's hands got wider.
   */
  it("reads a row inserted without a scope as coach", async () => {
    // Its own address: the shared contract above owns EMAIL and recreates it per test.
    const legacyEmail = `legacy-${EMAIL}`;
    await database!.delete(schema.usersTable).where(eq(schema.usersTable.email, legacyEmail));
    const [user] = await database!
      .insert(schema.usersTable)
      .values({ email: legacyEmail, passwordHash: null, createdAt: new Date() })
      .returning();
    await database!.execute(
      sql`insert into coach_api_tokens (user_id, token_hash) values (${user!.id}, 'legacy-hash')`,
    );

    const store = new DrizzleTokenStore(database! as never);
    expect(await store.findUserByLiveToken("legacy-hash", "coach", new Date())).toMatchObject({
      id: user!.id,
    });
    expect(
      await store.findUserByLiveToken("legacy-hash", "applications", new Date()),
    ).toBeNull();

    await database!.delete(schema.usersTable).where(eq(schema.usersTable.email, legacyEmail));
  });
});
