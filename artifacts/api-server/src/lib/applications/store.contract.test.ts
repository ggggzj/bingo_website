/**
 * `DrizzleApplicationStore` against a real Postgres.
 *
 * The route's own tests run against a fake store and cover everything about the *shape*. What
 * they cannot cover is the query: a left join, an ordering written as raw SQL (`desc nulls
 * last`), and a `jd_markdown is not null` that must answer without dragging 400 kB of text
 * across the wire. Those are true or false only in a database.
 *
 * Runs when COACH_TEST_DATABASE_URL names a scratch Postgres — the same gate as its
 * neighbours. The three tables are created by `import.contract.test.ts`'s beforeAll when
 * absent; this file seeds through the importer so the rows under test are the real thing.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import * as schema from "@workspace/db/schema";
import { importFolder } from "./import";
import { DrizzleApplicationStore } from "./store";

const PG_URL = process.env["COACH_TEST_DATABASE_URL"];
const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");
const OWNER = "applications-store-contract@test.local";

describe.skipIf(!PG_URL)("DrizzleApplicationStore (Postgres)", () => {
  const pool = PG_URL ? new pg.Pool({ connectionString: PG_URL }) : null;
  const database = pool ? drizzle(pool, { schema }) : null;
  let userId = 0;

  async function clean() {
    await database!.delete(schema.usersTable).where(eq(schema.usersTable.email, OWNER));
  }

  beforeAll(clean);

  afterAll(async () => {
    if (!pool) return;
    await clean();
    await pool.end();
  });

  beforeEach(async () => {
    await clean();
    const [user] = await database!
      .insert(schema.usersTable)
      .values({ email: OWNER, passwordHash: null, createdAt: new Date() })
      .returning();
    userId = user!.id;
    await importFolder({ database: database!, root: FIXTURES, userId });
  });

  it("returns every application, with the hand-written half where there is one", async () => {
    const rows = await new DrizzleApplicationStore(database! as never).list(userId);

    expect(rows).toHaveLength(3);
    const zoom = rows.find((row) => row.company === "Zoom");
    expect(zoom?.status).toBe("closed");
    expect(zoom?.stage).toBe("简历被拒");

    // The left join is what makes this row appear at all — it has no status row.
    const solace = rows.find((row) => row.company === "Solace Health");
    expect(solace?.status).toBeNull();
    expect(solace?.importedStatus).toBe("saved");
  });

  it("answers whether a JD was archived without returning one", async () => {
    const rows = await new DrizzleApplicationStore(database! as never).list(userId);

    expect(rows.find((row) => row.company === "Solace Health")?.hasJd).toBe(true);
    expect(rows.find((row) => row.company === "Zoom")?.hasJd).toBe(false);
    // The body is a separate request; a list of 94 must not carry the text of 80.
    expect(rows.every((row) => !("jdMarkdown" in row))).toBe(true);
  });

  it("orders the most recently applied first and never-applied rows last", async () => {
    const rows = await new DrizzleApplicationStore(database! as never).list(userId);

    expect(rows.map((row) => row.appliedDate)).toEqual(["2026-09-22", "2026-09-20", null]);
  });

  it("shows one person only their own rows", async () => {
    const [other] = await database!
      .insert(schema.usersTable)
      .values({ email: `other-${OWNER}`, passwordHash: null, createdAt: new Date() })
      .returning();

    const rows = await new DrizzleApplicationStore(database! as never).list(other!.id);
    expect(rows).toEqual([]);

    await database!.delete(schema.usersTable).where(eq(schema.usersTable.id, other!.id));
  });

  /**
   * The trail, which is the reason writing goes through a transaction at all. `017` calls this
   * non-negotiable and is right: a status that moved with no record of what it moved from
   * destroys the only copy of something the owner lived through.
   */
  it("keeps every state an application passed through", async () => {
    const store = new DrizzleApplicationStore(database! as never);
    const [solace] = (await store.list(userId)).filter(
      (row) => row.company === "Solace Health",
    );

    await store.update(userId, solace!.id, { status: "applied" }, "browser");
    await store.update(userId, solace!.id, { status: "interview", stage: "OA" }, "browser");
    await store.update(userId, solace!.id, { status: "closed" }, "browser");

    const events = await database!
      .select()
      .from(schema.applicationEventsTable)
      .where(eq(schema.applicationEventsTable.applicationId, solace!.id));

    const statuses = events.filter((event) => event.field === "status");
    expect(statuses.map((event) => event.value)).toEqual(["applied", "interview", "closed"]);
    // What it read before each move, which is what makes the history recoverable.
    expect(statuses.map((event) => event.previousValue)).toEqual([null, "applied", "interview"]);
    expect(events.every((event) => event.hand === "browser")).toBe(true);
  });

  it("writes nothing when a field is set to what it already says", async () => {
    const store = new DrizzleApplicationStore(database! as never);
    const [zoom] = (await store.list(userId)).filter((row) => row.company === "Zoom");
    expect(zoom!.status).toBe("closed"); // seeded by the import

    await store.update(userId, zoom!.id, { status: "closed" }, "browser");

    const events = await database!
      .select()
      .from(schema.applicationEventsTable)
      .where(eq(schema.applicationEventsTable.applicationId, zoom!.id));
    // Only what the import seeded. A no-op is not history.
    expect(events.every((event) => event.hand === "import")).toBe(true);
  });

  it("leaves out what was left out and clears what was sent as null", async () => {
    const store = new DrizzleApplicationStore(database! as never);
    const [zoom] = (await store.list(userId)).filter((row) => row.company === "Zoom");

    const after = await store.update(userId, zoom!.id, { stage: null }, "browser");

    expect(after?.stage).toBeNull();
    // The note was not mentioned, so it is untouched — this is the loss the two-key
    // distinction exists to prevent.
    expect(after?.note).toContain("identified other candidates");
    expect(after?.status).toBe("closed");
  });

  it("refuses to write to somebody else's row, without saying whose it is", async () => {
    const store = new DrizzleApplicationStore(database! as never);
    const [solace] = (await store.list(userId)).filter(
      (row) => row.company === "Solace Health",
    );
    const [other] = await database!
      .insert(schema.usersTable)
      .values({ email: `other-${OWNER}`, passwordHash: null, createdAt: new Date() })
      .returning();

    const result = await store.update(other!.id, solace!.id, { status: "closed" }, "browser");

    // Null, the same answer an id that does not exist gets: the route turns both into 404.
    expect(result).toBeNull();
    const [unchanged] = await database!
      .select()
      .from(schema.applicationStatusTable)
      .where(eq(schema.applicationStatusTable.applicationId, solace!.id));
    expect(unchanged).toBeUndefined();

    await database!.delete(schema.usersTable).where(eq(schema.usersTable.id, other!.id));
  });
});
