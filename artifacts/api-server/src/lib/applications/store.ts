import {
  applicationEventsTable,
  applicationStatusTable,
  applicationsTable,
  db,
} from "@workspace/db";
import { and, desc, eq, sql } from "drizzle-orm";

import type {
  ApplicationEdit,
  ApplicationRecord,
  ApplicationStore,
  EditHand,
} from "../../routes/applications";

/**
 * The ApplicationStore backed by Postgres.
 *
 * Reading is thin, the way `DrizzleMarkerStore` is. Writing is not, and deliberately: a change
 * to the owner's half and its trail row are one transaction, because a status that moved with
 * no record of what it moved from is the loss this whole change was built to prevent.
 *
 * **The column list is the point of the read.** `jd_markdown` is never selected — 80 bodies at
 * ~8 KB would be 400 kB of text on every page load, to render a column that says "yes". Whether
 * one exists is asked of the database as `is not null`; the body itself is its own request.
 */

/** One shape for both paths, so a column added to the list cannot go missing from a write. */
const COLUMNS = {
  id: applicationsTable.id,
  company: applicationsTable.company,
  role: applicationsTable.role,
  location: applicationsTable.location,
  region: applicationsTable.region,
  ats: applicationsTable.ats,
  url: applicationsTable.url,
  importedStatus: applicationsTable.importedStatus,
  appliedDate: applicationsTable.appliedDate,
  savedDate: applicationsTable.savedDate,
  importedAt: applicationsTable.importedAt,
  // `sql<boolean>` rather than `isNotNull()`: the helper is typed for a WHERE clause and
  // lands in a select list as `unknown`.
  hasJd: sql<boolean>`${applicationsTable.jdMarkdown} is not null`,
  status: applicationStatusTable.status,
  stage: applicationStatusTable.stage,
  note: applicationStatusTable.note,
};

export class DrizzleApplicationStore implements ApplicationStore {
  constructor(private readonly database: typeof db = db) {}

  async list(userId: number): Promise<ApplicationRecord[]> {
    return this.database
      .select(COLUMNS)
      .from(applicationsTable)
      /**
       * A left join, because most applications have no hand-written row and never will. An
       * inner join here would silently show the owner only the ones they had already said
       * something about — the emptiest possible reading of their own list.
       */
      .leftJoin(
        applicationStatusTable,
        eq(applicationStatusTable.applicationId, applicationsTable.id),
      )
      .where(eq(applicationsTable.userId, userId))
      /**
       * Most recently applied first, and rows never applied to after them. The folder's own
       * board sorts by whichever header you click; this is only the order it arrives in.
       */
      .orderBy(
        sql`${applicationsTable.appliedDate} desc nulls last`,
        desc(applicationsTable.savedDate),
        desc(applicationsTable.id),
      );
  }

  async update(
    userId: number,
    id: number,
    edit: ApplicationEdit,
    hand: EditHand,
  ): Promise<ApplicationRecord | null> {
    return this.database.transaction(async (tx) => {
      /**
       * Ownership is a condition of the read, not a check after it. A row belonging to
       * somebody else is indistinguishable here from one that does not exist, which is what
       * lets the route answer 404 to both without deciding which it was.
       */
      const [row] = await tx
        .select(COLUMNS)
        .from(applicationsTable)
        .leftJoin(
          applicationStatusTable,
          eq(applicationStatusTable.applicationId, applicationsTable.id),
        )
        .where(and(eq(applicationsTable.id, id), eq(applicationsTable.userId, userId)))
        .limit(1);
      if (!row) return null;

      const before = { status: row.status, stage: row.stage, note: row.note };
      /**
       * Only keys the caller sent. `Object.hasOwn` rather than a truthiness check, because
       * null is a value here — "clear this" — and absence is the other instruction.
       */
      const changed = (["status", "stage", "note"] as const).filter(
        (field) => Object.hasOwn(edit, field) && (edit[field] ?? null) !== before[field],
      );
      if (changed.length === 0) return row;

      const after = { ...before };
      for (const field of changed) after[field] = edit[field] ?? null;

      await tx
        .insert(applicationStatusTable)
        .values({ applicationId: id, ...after, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: applicationStatusTable.applicationId,
          set: { ...after, updatedAt: new Date() },
        });

      /**
       * The trail, in the same transaction as the change. Append-only and one row per field,
       * carrying what it read before: "rejected" overwriting "interviewing" destroys the only
       * copy of something the owner lived through, and a trail written afterwards is a trail
       * that can be missing exactly when it matters.
       *
       * A field set to what it already said writes nothing — a no-op is not history.
       */
      await tx.insert(applicationEventsTable).values(
        changed.map((field) => ({
          applicationId: id,
          hand,
          field,
          previousValue: before[field],
          value: after[field],
        })),
      );

      return { ...row, ...after };
    });
  }

  async jd(userId: number, id: number): Promise<string | null> {
    const [row] = await this.database
      .select({ jdMarkdown: applicationsTable.jdMarkdown })
      .from(applicationsTable)
      // Ownership in the query again: a row belonging to somebody else and a row with no
      // archive both answer null, and the route turns both into the same 404.
      .where(and(eq(applicationsTable.id, id), eq(applicationsTable.userId, userId)))
      .limit(1);
    return row?.jdMarkdown ?? null;
  }
}
