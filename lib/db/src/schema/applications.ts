import {
  date,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

import { usersTable } from "./auth";

/**
 * **This repo owns these tables' DDL** (owner decision, 2026-09-20), even though after the
 * move they live in h1_checker's database. Whoever reads a table maintains it, and nothing
 * over there reads these.
 *
 * The condition attached is not optional: this file describes a handful of that database's
 * twenty-seven tables, so a whole-schema reconciliation from here would read h1_checker's
 * application as unknown. `push` is gone from package.json and refused in drizzle.config.ts
 * for that reason. Change a table with `generate`, read the SQL, apply it through
 * `railway connect` — the path recorded in replit.md under Run & Operate.
 */

/**
 * The applications the owner has already sent, imported from `~/Desktop/job_dashboard`.
 *
 * **Two halves with two owners, and that is the whole design.** The folder already splits its
 * data into `applications.js` (machine-generated, rewritten wholesale on every import) and
 * `overrides.js` (hand-written, never touched by a script), for the reason its README states:
 * 重新导入不会冲掉你积累的东西. This carries that boundary across instead of re-deciding it.
 *
 * `applications` is the machine half — the import owns every column here and rewrites them.
 * `application_status` is the human half and the import never names it. One table with an
 * UPSERT that only lists the machine columns would also work, and was rejected: the guarantee
 * would then live in a `SET` clause, one careless column away from losing the irreplaceable
 * half. Two tables make it structural — the import's SQL cannot touch a table it never
 * mentions.
 */
export const applicationsTable = pgTable(
  "applications",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    /**
     * The folder's own key: a normalised apply URL, or `"公司名|职位名"` where there is no
     * link, or a synthetic `workday:…` / `ashby:…` token. `import_simplify.py` already strips
     * `?embed=true`, `/application` and `/confirmation` so one posting from two sources
     * collapses to one row — reuse that normalisation rather than writing a second one.
     *
     * This is what reconnects a re-imported row to the status the owner typed in the browser.
     * A key that drifts does not announce itself as a conflict; it produces a row whose
     * history has quietly detached.
     */
    sourceKey: text("source_key").notNull(),
    company: text("company").notNull(),
    role: text("role").notNull(),
    location: text("location"),
    /** Every location the posting listed, as the folder joined them with " | ". */
    locationsAll: text("locations_all"),
    region: text("region"),
    url: text("url"),
    /** Greenhouse / Ashby / Workday / 公司官网 / Oracle / 未知, as the folder classified it. */
    ats: text("ats"),
    /**
     * The status Simplify exported — `applied` or `saved`. **Deliberately not the status the
     * page shows.** The owner's own answer lives in `application_status.status` and wins when
     * it is present; this is the fallback for the 76 rows they have not annotated. Keeping
     * them in separate columns is what lets the import refresh one without touching the other.
     */
    importedStatus: text("imported_status").notNull(),
    appliedDate: date("applied_date"),
    savedDate: date("saved_date"),
    jobType: text("job_type"),
    /** The CSV's own notes column, e.g. 邮件确认（Ashby），Simplify 未记录. */
    csvNotes: text("csv_notes"),
    /** How many CSV rows collapsed into this one. Not a key; neither is the folder's `id`. */
    dupCount: integer("dup_count").notNull().default(1),
    /**
     * The archived JD body, where `archive_jds.py` captured one — 80 of 94 today, ~8 KB each.
     * A column rather than a fourth table: Postgres moves values this size out of line by
     * itself (TOAST), so a list query that does not name this column does not pay for it.
     *
     * This is the half that cannot be re-fetched. Trustpilot's posting 404'd one day after the
     * owner applied and Showpad's after five; both bodies are gone because nothing had copied
     * them yet.
     */
    jdMarkdown: text("jd_markdown"),
    /** Where the body came from in the folder, e.g. `jobs/google-93/jd.md`. */
    jdPath: text("jd_path"),
    /** When the import last rewrote this row. The page states it — the machine half is
     * exactly this old, and an empty week must not read as a quiet week. */
    importedAt: timestamp("imported_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    /** One row per posting per person, which is what makes the import an upsert. */
    unique("applications_user_source_key").on(table.userId, table.sourceKey),
    index("applications_user_idx").on(table.userId),
  ],
);

/**
 * The half the owner writes, and the import never does.
 *
 * Seeded once at cutover from the folder's 18 `overrides.js` rows — the only part of that
 * folder nothing can regenerate, because it quotes employers' own words from emails Simplify
 * never saw.
 *
 * A null `status` means "no human opinion yet", not "unknown": the page falls back to
 * `applications.imported_status`. That distinction is why this is nullable rather than
 * defaulted.
 */
export const applicationStatusTable = pgTable("application_status", {
  applicationId: integer("application_id")
    .primaryKey()
    .references(() => applicationsTable.id, { onDelete: "cascade" }),
  /** saved | applied | interview | closed — the folder's vocabulary, kept so `017` can adopt
   * these rows rather than translate them. */
  status: text("status"),
  /** Free text: "OA" / "HR面试" / "Onsite" / "简历被拒" / "拒信 · 不提供 sponsorship". */
  stage: text("stage"),
  note: text("note"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Every change to the human half, append-only.
 *
 * `017` calls this non-negotiable and is right: "rejected" overwriting "interviewing" destroys
 * the only copy of something the owner lived through. At 94 rows the trail is cheap; the point
 * at which it stops being cheap is the point at which it is already too late to add.
 *
 * `hand` exists from day one although only two values can occur today. After
 * `.harness/backlogs/025` a local script writes here too, and a trail with a blind period
 * exactly where two writers start disagreeing is worth nothing.
 */
export const applicationEventsTable = pgTable(
  "application_events",
  {
    id: serial("id").primaryKey(),
    applicationId: integer("application_id")
      .notNull()
      .references(() => applicationsTable.id, { onDelete: "cascade" }),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    /** browser | import | script — who moved it. `script` is unused until `025`. */
    hand: text("hand").notNull(),
    /** status | stage | note */
    field: text("field").notNull(),
    /** What it read before this change. Null is a real value: the field was empty. */
    previousValue: text("previous_value"),
    value: text("value"),
  },
  (table) => [index("application_events_application_idx").on(table.applicationId)],
);

export type ApplicationRow = typeof applicationsTable.$inferSelect;
export type ApplicationStatusRow = typeof applicationStatusTable.$inferSelect;
export type ApplicationEventRow = typeof applicationEventsTable.$inferSelect;
