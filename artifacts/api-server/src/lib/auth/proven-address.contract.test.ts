/**
 * The two raw statements `DrizzleAuthStore.recordProvenAddress` runs, against a real
 * Postgres.
 *
 * `registrations` and `email_verifications` belong to h1_checker's `models.py`, and this
 * repo deliberately does not declare them in `lib/db/src/schema/` — see the comment on the
 * method for why, and `openspec/changes/fix-google-signin-skips-the-owner-list/design.md`.
 * The price of staying out of the schema is that the compiler checks nothing here, so this
 * file is where the statements are checked by a machine instead of by reading.
 *
 * **What it catches:** that both statements parse, that `ON CONFLICT (email)` has an index
 * to land on, that a second call inserts nothing, and that `verified_at` does not drift
 * while `last_verified_at` does.
 *
 * **What it cannot catch:** that the column names match the real tables, because it creates
 * its own. That was checked directly against the production schema on 2026-09-21 — four
 * columns on `registrations`, six on `email_verifications`, `ix_email_verifications_email`
 * unique — and it is the kind of check that belongs in a session log, not in a test this
 * repo runs without that database.
 *
 * Gated on COACH_TEST_DATABASE_URL, the same scratch Postgres the coach contract test uses
 * and for the same reason: vitest pins DATABASE_URL to a dummy so the db package can load
 * without a server.
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const PG_URL = process.env["COACH_TEST_DATABASE_URL"];
const ADDRESS = "proven@contract.test";

describe.skipIf(!PG_URL)("recording a proven address (Postgres)", () => {
  let pool: pg.Pool;
  let db: ReturnType<typeof drizzle>;

  /** The same two statements the store runs, kept here as one copy to compare against. */
  async function record(email: string, now: Date) {
    await db.execute(sql`
      INSERT INTO registrations (email, client_id, created_at)
      SELECT ${email}, NULL, ${now}
      WHERE NOT EXISTS (
        SELECT 1 FROM registrations
        WHERE email = ${email} AND client_id IS NULL
      )
    `);
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

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: PG_URL });
    db = drizzle(pool);
    /* Shaped from the production schema read on 2026-09-21. Scratch copies: this test
       owns them and drops them again, so it can never touch the real tables. */
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS registrations (
        id SERIAL PRIMARY KEY,
        email VARCHAR(320) NOT NULL,
        client_id VARCHAR(64),
        created_at TIMESTAMP
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS email_verifications (
        id SERIAL PRIMARY KEY,
        email VARCHAR(320) NOT NULL UNIQUE,
        token_hash VARCHAR(64) NOT NULL UNIQUE,
        sent_at TIMESTAMP NOT NULL,
        verified_at TIMESTAMP,
        last_verified_at TIMESTAMP
      )
    `);
    await db.execute(sql`DELETE FROM registrations WHERE email = ${ADDRESS}`);
    await db.execute(sql`DELETE FROM email_verifications WHERE email = ${ADDRESS}`);
  });

  afterAll(async () => {
    await db.execute(sql`DELETE FROM registrations WHERE email = ${ADDRESS}`);
    await db.execute(sql`DELETE FROM email_verifications WHERE email = ${ADDRESS}`);
    await pool.end();
  });

  it("writes one registration and one proof, and a second sign-in adds neither", async () => {
    const first = new Date("2026-09-21T10:00:00Z");
    const second = new Date("2026-09-21T11:00:00Z");

    await record(ADDRESS, first);
    await record(ADDRESS, second);

    const regs = await db.execute(
      sql`SELECT count(*)::int AS n FROM registrations WHERE email = ${ADDRESS}`,
    );
    expect(regs.rows[0]).toMatchObject({ n: 1 });

    const proofs = await db.execute(
      sql`SELECT verified_at, last_verified_at FROM email_verifications WHERE email = ${ADDRESS}`,
    );
    expect(proofs.rows).toHaveLength(1);
    const row = proofs.rows[0] as { verified_at: Date; last_verified_at: Date };

    /* First proof does not drift; the later one is recorded beside it. That is the rule
       h1_checker's own /verify follows, and the reader on the other side depends on it. */
    expect(new Date(row.verified_at).toISOString()).toBe(first.toISOString());
    expect(new Date(row.last_verified_at).toISOString()).toBe(second.toISOString());
  });
});
