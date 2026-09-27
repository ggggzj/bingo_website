import {
  applicationStatusTable,
  applicationsTable,
  db,
} from "@workspace/db";
import { desc, eq, sql } from "drizzle-orm";

import type { ApplicationRecord, ApplicationStore } from "../../routes/applications";

/**
 * The ApplicationStore backed by Postgres. Thin on purpose, the same way `DrizzleMarkerStore`
 * is: one query and a shape change, so everything worth testing stays in the route, where it
 * runs against memory and no database.
 *
 * **The column list is the point.** `jd_markdown` is never selected here — 80 bodies at ~8 KB
 * would be 400 kB of text on every page load, to render a column that says "yes". Whether one
 * exists is asked of the database as `is not null`; the body itself is its own request.
 */
export class DrizzleApplicationStore implements ApplicationStore {
  constructor(private readonly database: typeof db = db) {}

  async list(userId: number): Promise<ApplicationRecord[]> {
    const rows = await this.database
      .select({
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
        // `sql<boolean>` rather than `isNotNull()`: the helper is typed for a WHERE
        // clause and lands in a select list as `unknown`.
        hasJd: sql<boolean>`${applicationsTable.jdMarkdown} is not null`,
        status: applicationStatusTable.status,
        stage: applicationStatusTable.stage,
        note: applicationStatusTable.note,
      })
      .from(applicationsTable)
      /**
       * A left join, because most applications have no hand-written row and never will.
       * An inner join here would silently show the owner only the ones they had already
       * said something about — the emptiest possible reading of their own list.
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

    return rows;
  }
}
