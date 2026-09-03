import {
  date,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  serial,
  text,
  unique,
} from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

/**
 * The interview coach's tables. The problem bank is global and holds no user
 * data; everything else is per-user and cascades away with the account. The
 * scheduling decisions over these rows are made by @workspace/coach-engine —
 * pure functions the API layer feeds with rows and persists results from.
 *
 * JSONB columns hold opaque lists the engine consumes whole (patterns,
 * siblings, a day's assigned ids); grading history is rows in
 * coach_review_events because reports will query it by date.
 */

/** NeetCode 150 bank, seeded by seed-coach-problems.ts. Ids look like "lc-0239". */
export const coachProblemsTable = pgTable("coach_problems", {
  id: text("id").primaryKey(),
  num: integer("num").notNull(),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  difficulty: text("difficulty").notNull(), // easy | medium | hard
  neetcodeGroup: text("neetcode_group").notNull(),
  patterns: jsonb("patterns").$type<string[]>().notNull(),
  companyFreq: jsonb("company_freq").$type<Record<string, number>>().notNull(),
  followups: jsonb("followups").$type<string[]>().notNull(),
  siblings: jsonb("siblings").$type<string[]>().notNull(),
});

/** One row per (user, problem) the user has ever been graded on — the
 * engine's ReviewState at rest. */
export const coachReviewsTable = pgTable(
  "coach_reviews",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    problemId: text("problem_id")
      .notNull()
      .references(() => coachProblemsTable.id),
    state: text("state").notNull().default("new"), // new | learning | review | mastered
    ease: real("ease").notNull().default(2.5),
    intervalDays: integer("interval_days").notNull().default(0),
    due: date("due"),
    reps: integer("reps").notNull().default(0),
    lapses: integer("lapses").notNull().default(0),
    lastGrade: text("last_grade"), // pass | partial | fail
    weakPoints: jsonb("weak_points").$type<string[]>().notNull().default([]),
  },
  (table) => [
    unique("coach_reviews_user_problem_uq").on(table.userId, table.problemId),
    index("coach_reviews_user_due_idx").on(table.userId, table.due),
  ],
);

/** One row per grading — the engine's ReviewEvent. History lives here, not
 * in a JSONB array, so reports can query it by date range. */
export const coachReviewEventsTable = pgTable(
  "coach_review_events",
  {
    id: serial("id").primaryKey(),
    reviewId: integer("review_id")
      .notNull()
      .references(() => coachReviewsTable.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    mode: text("mode").notNull(),
    grade: text("grade").notNull(), // pass | partial | fail
    intervalDays: integer("interval_days").notNull(),
    failedOn: jsonb("failed_on").$type<string[]>().notNull().default([]),
    notes: text("notes").notNull().default(""),
  },
  (table) => [
    index("coach_review_events_review_date_idx").on(table.reviewId, table.date),
  ],
);

/** One row per (user, calendar day) — the engine's DayLogEntry. The
 * assignment freezes here the first time a day's plan is dealt. */
export const coachDailyLogTable = pgTable(
  "coach_daily_log",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    assignedNew: jsonb("assigned_new").$type<string[]>().notNull().default([]),
    assignedReviews: jsonb("assigned_reviews")
      .$type<string[]>()
      .notNull()
      .default([]),
    plannedMinutes: integer("planned_minutes").notNull().default(0),
    solved: jsonb("solved").$type<string[]>().notNull().default([]),
    done: jsonb("done")
      .$type<Array<{ id: string; grade: string; mode: string }>>()
      .notNull()
      .default([]),
  },
  (table) => [unique("coach_daily_log_user_day_uq").on(table.userId, table.day)],
);

/** Per-user coach settings. Defaults mirror the reference system's config. */
export const coachConfigTable = pgTable("coach_config", {
  userId: integer("user_id")
    .primaryKey()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  dailyMinutes: integer("daily_minutes").notNull().default(60),
  newPerDay: integer("new_per_day").notNull().default(2),
  sprintWindowDays: integer("sprint_window_days").notNull().default(14),
  interviewDate: date("interview_date"),
  targetCompanies: jsonb("target_companies")
    .$type<string[]>()
    .notNull()
    .default([]),
});

export type CoachProblem = typeof coachProblemsTable.$inferSelect;
export type CoachReview = typeof coachReviewsTable.$inferSelect;
export type CoachReviewEvent = typeof coachReviewEventsTable.$inferSelect;
export type CoachDailyLog = typeof coachDailyLogTable.$inferSelect;
export type CoachConfigRow = typeof coachConfigTable.$inferSelect;
