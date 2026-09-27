/**
 * The import against a real Postgres, because the guarantee it exists to give is a database
 * guarantee: **a second import must not touch what the browser wrote.**
 *
 * That cannot be proven in memory. It is an UPSERT touching one table and leaving another
 * alone, and the way it breaks is a `SET` clause naming one column too many.
 *
 * Runs when COACH_TEST_DATABASE_URL names a scratch Postgres with
 * `lib/db/drizzle/0000_young_peter_parker.sql` applied; skipped otherwise — the same gate as
 * `auth/drizzle-store.contract.test.ts`. The three tables this change adds are created from
 * `lib/db/drizzle/0001_vengeful_forge.sql` when they are absent, so the DDL under test is the
 * same file that was applied to production rather than a copy that can drift from it.
 *
 * Seeds and deletes its own user, by address.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { drizzle } from "drizzle-orm/node-postgres";
import { and, eq, sql } from "drizzle-orm";
import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import * as schema from "@workspace/db/schema";
import { importFolder } from "./import";

const PG_URL = process.env["COACH_TEST_DATABASE_URL"];

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(HERE, "fixtures");
const MIGRATION = path.join(HERE, "..", "..", "..", "..", "..", "lib", "db", "drizzle");

const OWNER = "applications-import-contract@test.local";

describe.skipIf(!PG_URL)("importFolder (Postgres)", () => {
  const pool = PG_URL ? new pg.Pool({ connectionString: PG_URL }) : null;
  const database = pool ? drizzle(pool, { schema }) : null;
  let userId = 0;

  async function clean() {
    await database!.delete(schema.usersTable).where(eq(schema.usersTable.email, OWNER));
  }

  beforeAll(async () => {
    const present = await database!.execute(sql`select to_regclass('applications') as t`);
    if (!present.rows[0]?.["t"]) {
      const file = path.join(MIGRATION, "0001_vengeful_forge.sql");
      const statements = fs
        .readFileSync(file, "utf8")
        .split("--> statement-breakpoint")
        .map((chunk) =>
          chunk
            .split("\n")
            .filter((line) => !line.trimStart().startsWith("--"))
            .join("\n")
            .trim(),
        )
        .filter((chunk) => chunk.length > 0);
      for (const statement of statements) {
        await database!.execute(sql.raw(statement));
      }
    }
    await clean();
  });

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
  });

  it("lands one row per application, with the archived body where the folder kept one", async () => {
    const summary = await importFolder({ database: database!, root: FIXTURES, userId });

    expect(summary.inserted).toBe(3);
    expect(summary.updated).toBe(0);

    const rows = await database!
      .select()
      .from(schema.applicationsTable)
      .where(eq(schema.applicationsTable.userId, userId));
    expect(rows).toHaveLength(3);

    const solace = rows.find((r) => r.sourceKey === "ashby:db008474");
    expect(solace?.company).toBe("Solace Health");
    expect(solace?.jdPath).toBe("jobs/solace-health-82/jd.md");
    expect(solace?.jdMarkdown).toContain("Associate Software Engineer");

    const zoom = rows.find((r) => r.sourceKey === "Zoom|Software Engineer");
    expect(zoom?.jdMarkdown).toBeNull(); // no archive for it, and that is a fact not a gap
    expect(zoom?.url).toBeNull();
  });

  it("seeds the hand-written half once, and trails the seeding as the import's own hand", async () => {
    await importFolder({ database: database!, root: FIXTURES, userId });

    const statuses = await database!
      .select()
      .from(schema.applicationStatusTable)
      .innerJoin(
        schema.applicationsTable,
        eq(schema.applicationsTable.id, schema.applicationStatusTable.applicationId),
      )
      .where(eq(schema.applicationsTable.userId, userId));
    expect(statuses).toHaveLength(2); // two of the three fixtures carry an override

    const zoom = statuses.find(
      (row) => row.applications.sourceKey === "Zoom|Software Engineer",
    );
    expect(zoom?.application_status.status).toBe("closed");
    expect(zoom?.application_status.stage).toBe("简历被拒");
    expect(zoom?.application_status.note).toContain("identified other candidates");

    const events = await database!
      .select()
      .from(schema.applicationEventsTable)
      .innerJoin(
        schema.applicationsTable,
        eq(schema.applicationsTable.id, schema.applicationEventsTable.applicationId),
      )
      .where(eq(schema.applicationsTable.userId, userId));
    expect(events.every((row) => row.application_events.hand === "import")).toBe(true);
    expect(events.length).toBeGreaterThan(0);
  });

  it("running twice does not duplicate an application", async () => {
    await importFolder({ database: database!, root: FIXTURES, userId });
    const second = await importFolder({ database: database!, root: FIXTURES, userId });

    expect(second.inserted).toBe(0);
    expect(second.updated).toBe(3);

    const rows = await database!
      .select()
      .from(schema.applicationsTable)
      .where(eq(schema.applicationsTable.userId, userId));
    expect(rows).toHaveLength(3);
  });

  /**
   * The test this whole change exists for. The owner's folder splits its two files for this
   * reason — 重新导入不会冲掉你积累的东西 — and here that promise is a `SET` clause away from
   * being false.
   */
  it("refreshes the imported half and leaves what the browser wrote untouched", async () => {
    await importFolder({ database: database!, root: FIXTURES, userId });

    const [solace] = await database!
      .select()
      .from(schema.applicationsTable)
      .where(
        and(
          eq(schema.applicationsTable.userId, userId),
          eq(schema.applicationsTable.sourceKey, "ashby:db008474"),
        ),
      );

    // The owner, in the browser: this one is now an interview, with a note.
    await database!.insert(schema.applicationStatusTable).values({
      applicationId: solace!.id,
      status: "interview",
      stage: "OA 09-28",
      note: "recruiter said the take-home is 3 hours",
    });
    // And something the import owns drifts out of date in the database.
    await database!
      .update(schema.applicationsTable)
      .set({ company: "stale name", location: "stale place" })
      .where(eq(schema.applicationsTable.id, solace!.id));

    await importFolder({ database: database!, root: FIXTURES, userId });

    const [status] = await database!
      .select()
      .from(schema.applicationStatusTable)
      .where(eq(schema.applicationStatusTable.applicationId, solace!.id));
    expect(status?.status).toBe("interview");
    expect(status?.stage).toBe("OA 09-28");
    expect(status?.note).toBe("recruiter said the take-home is 3 hours");

    const [refreshed] = await database!
      .select()
      .from(schema.applicationsTable)
      .where(eq(schema.applicationsTable.id, solace!.id));
    expect(refreshed?.company).toBe("Solace Health");
    expect(refreshed?.location).toBe("Redwood City, CA");
  });

  it("reports the keys that matched nothing rather than dropping them", async () => {
    const summary = await importFolder({ database: database!, root: FIXTURES, userId });

    expect(summary.unmatchedOverrideKeys).toEqual([
      "https://example.com/a-posting-that-no-longer-exists",
    ]);
    expect(summary.unmatchedArchiveKeys).toEqual(["ashby:a-key-with-no-application"]);
  });
});
