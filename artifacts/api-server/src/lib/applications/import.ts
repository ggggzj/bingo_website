import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import * as schema from "@workspace/db/schema";

import { readFolder, readJdBody } from "./folder";

/**
 * Moving the owner's folder into their account.
 *
 * **The one rule.** This writes `applications` and it seeds `application_status` for rows that
 * have none. It never *updates* `application_status`, because that table is the owner's — what
 * they typed in the browser outlives every later import. The folder itself is built on this
 * same split (`applications.js` regenerated, `overrides.js` never touched) and the promise its
 * README makes is the promise kept here: 重新导入不会冲掉你积累的东西.
 *
 * The seeding happens once, at cutover, so the 18 hand-written rows that exist today — quoting
 * rejection emails Simplify never saw — become the first contents of the account's half. After
 * that the browser owns it and the import stays out.
 */

export type ImportSummary = {
  /** Applications created by this run. */
  inserted: number;
  /** Applications that already existed and had their imported half refreshed. */
  updated: number;
  /** How many carry an archived JD body after this run. */
  jdBodies: number;
  /** Hand-written rows seeded by this run. Zero on every run after the first. */
  statusSeeded: number;
  /** Hand-written rows this run deliberately left alone. */
  statusLeftAlone: number;
  /** Keys in overrides.js / archive.js matching no application — key drift, surfaced. */
  unmatchedOverrideKeys: string[];
  unmatchedArchiveKeys: string[];
  /** The folder's own "last generated" date, for the header the page shows. */
  folderUpdatedAt: string | null;
};

export type ImportOptions = {
  database: NodePgDatabase<typeof schema>;
  /** The folder root, e.g. `/Users/…/Desktop/job_dashboard`. */
  root: string;
  /** Whose applications these are. */
  userId: number;
};

export async function importFolder({
  database,
  root,
  userId,
}: ImportOptions): Promise<ImportSummary> {
  const folder = readFolder(root);

  return database.transaction(async (tx) => {
    const existing = await tx
      .select({
        id: schema.applicationsTable.id,
        sourceKey: schema.applicationsTable.sourceKey,
      })
      .from(schema.applicationsTable)
      .where(eq(schema.applicationsTable.userId, userId));
    const existingKeys = new Set(existing.map((row) => row.sourceKey));

    let inserted = 0;
    let updated = 0;
    let jdBodies = 0;
    const idByKey = new Map<string, number>();

    for (const application of folder.applications) {
      const jdMarkdown = application.jdPath ? readJdBody(root, application.jdPath) : null;
      if (jdMarkdown !== null) jdBodies += 1;

      /**
       * Every column named here is the import's to own. `application_status` is absent from
       * this statement on purpose, and adding a column of that table to it is the one edit
       * that would break this module's promise — `import.contract.test.ts` is watching for it.
       */
      const machineHalf = {
        company: application.company,
        role: application.role,
        location: application.location,
        locationsAll: application.locationsAll,
        region: application.region,
        url: application.url,
        ats: application.ats,
        importedStatus: application.importedStatus,
        appliedDate: application.appliedDate,
        savedDate: application.savedDate,
        jobType: application.jobType,
        csvNotes: application.csvNotes,
        dupCount: application.dupCount,
        jdMarkdown,
        jdPath: application.jdPath,
        importedAt: new Date(),
      };

      const [row] = await tx
        .insert(schema.applicationsTable)
        .values({ userId, sourceKey: application.sourceKey, ...machineHalf })
        .onConflictDoUpdate({
          target: [schema.applicationsTable.userId, schema.applicationsTable.sourceKey],
          set: machineHalf,
        })
        .returning({ id: schema.applicationsTable.id });

      if (existingKeys.has(application.sourceKey)) updated += 1;
      else inserted += 1;
      idByKey.set(application.sourceKey, row!.id);
    }

    /**
     * Seed the hand-written half — and only where the account has nothing yet.
     *
     * `onConflictDoNothing` is the whole guarantee: a row the owner has already touched is a
     * conflict, and a conflict here means "leave it". `returning()` then lists exactly what was
     * created, which is what the trail records.
     */
    const withOverride = folder.applications.filter((application) => application.override);
    let statusSeeded = 0;
    let statusLeftAlone = 0;

    for (const application of withOverride) {
      const applicationId = idByKey.get(application.sourceKey)!;
      const override = application.override!;
      const seeded = await tx
        .insert(schema.applicationStatusTable)
        .values({
          applicationId,
          status: override.status,
          stage: override.stage,
          note: override.note,
        })
        .onConflictDoNothing({ target: schema.applicationStatusTable.applicationId })
        .returning({ applicationId: schema.applicationStatusTable.applicationId });

      if (seeded.length === 0) {
        statusLeftAlone += 1;
        continue;
      }
      statusSeeded += 1;

      const fields = [
        ["status", override.status],
        ["stage", override.stage],
        ["note", override.note],
      ] as const;
      const events = fields
        .filter(([, value]) => value !== null)
        .map(([field, value]) => ({
          applicationId,
          hand: "import" as const,
          field,
          previousValue: null,
          value,
        }));
      if (events.length > 0) await tx.insert(schema.applicationEventsTable).values(events);
    }

    return {
      inserted,
      updated,
      jdBodies,
      statusSeeded,
      statusLeftAlone,
      unmatchedOverrideKeys: folder.unmatchedOverrideKeys,
      unmatchedArchiveKeys: folder.unmatchedArchiveKeys,
      folderUpdatedAt: folder.updatedAt,
    } satisfies ImportSummary;
  });
}
