/**
 * The CoachStore backed by Postgres. Thin like DrizzleAuthStore — one query
 * (or one transaction) per method, shape changes in mapping.ts. The grade
 * write is the one genuinely transactional spot: review upsert, event
 * append and day-log stamp commit together or not at all.
 */

import {
  coachApiTokensTable,
  coachConfigTable,
  coachDailyLogTable,
  coachProblemsTable,
  coachReviewsTable,
  coachReviewEventsTable,
  db,
  usersTable,
} from "@workspace/db";
import { and, eq, gte, isNull, lte } from "drizzle-orm";
import { shiftDate, coachConfigSchema } from "@workspace/coach-engine";
import type {
  CoachConfig,
  DayLogEntry,
  Problem,
  ReviewEvent,
  ReviewState,
} from "@workspace/coach-engine";

import {
  configRowToEngine,
  dayRowToEngine,
  engineToConfigRow,
  engineToDayRow,
  engineToReviewRow,
  problemRowToEngine,
  reviewRowToEngine,
} from "./mapping";
import type { CoachStore, CoachUser } from "./store";

export class DrizzleCoachStore implements CoachStore {
  /** Takes the connection so the contract tests can point it at a scratch
   * database; production wiring uses the process-wide `db`. */
  constructor(private readonly database: typeof db = db) {}

  async loadProblems(): Promise<Record<string, Problem>> {
    const rows = await this.database.select().from(coachProblemsTable);
    return Object.fromEntries(rows.map((r) => [r.id, problemRowToEngine(r)]));
  }

  async loadReviews(userId: number): Promise<Record<string, ReviewState>> {
    const rows = await this.database
      .select()
      .from(coachReviewsTable)
      .where(eq(coachReviewsTable.userId, userId));
    return Object.fromEntries(
      rows.map((r) => [r.problemId, reviewRowToEngine(r)]),
    );
  }

  async getReview(
    userId: number,
    problemId: string,
  ): Promise<ReviewState | null> {
    const [row] = await this.database
      .select()
      .from(coachReviewsTable)
      .where(
        and(
          eq(coachReviewsTable.userId, userId),
          eq(coachReviewsTable.problemId, problemId),
        ),
      )
      .limit(1);
    return row ? reviewRowToEngine(row) : null;
  }

  async loadEvents(userId: number): Promise<Record<string, ReviewEvent[]>> {
    const rows = await this.database
      .select({
        problemId: coachReviewsTable.problemId,
        date: coachReviewEventsTable.date,
        mode: coachReviewEventsTable.mode,
        grade: coachReviewEventsTable.grade,
        intervalDays: coachReviewEventsTable.intervalDays,
        failedOn: coachReviewEventsTable.failedOn,
        notes: coachReviewEventsTable.notes,
        id: coachReviewEventsTable.id,
      })
      .from(coachReviewEventsTable)
      .innerJoin(
        coachReviewsTable,
        eq(coachReviewsTable.id, coachReviewEventsTable.reviewId),
      )
      .where(eq(coachReviewsTable.userId, userId))
      // Oldest first: the analytics read history in order.
      .orderBy(coachReviewEventsTable.date, coachReviewEventsTable.id);

    const out: Record<string, ReviewEvent[]> = {};
    for (const row of rows) {
      (out[row.problemId] ??= []).push({
        date: row.date,
        mode: row.mode,
        grade: row.grade as ReviewEvent["grade"],
        interval_days: row.intervalDays,
        failed_on: row.failedOn,
        notes: row.notes,
      });
    }
    return out;
  }

  async saveGrade(
    userId: number,
    state: ReviewState,
    event: ReviewEvent,
    day: string,
    entry: DayLogEntry,
  ): Promise<void> {
    await this.database.transaction(async (tx) => {
      const row = engineToReviewRow(userId, state);
      const [review] = await tx
        .insert(coachReviewsTable)
        .values(row)
        .onConflictDoUpdate({
          target: [coachReviewsTable.userId, coachReviewsTable.problemId],
          set: row,
        })
        .returning({ id: coachReviewsTable.id });
      await tx.insert(coachReviewEventsTable).values({
        reviewId: review!.id,
        date: event.date,
        mode: event.mode,
        grade: event.grade,
        intervalDays: event.interval_days,
        failedOn: event.failed_on,
        notes: event.notes,
      });
      const dayRow = engineToDayRow(userId, day, entry);
      await tx
        .insert(coachDailyLogTable)
        .values(dayRow)
        .onConflictDoUpdate({
          target: [coachDailyLogTable.userId, coachDailyLogTable.day],
          set: dayRow,
        });
    });
  }

  async getDayEntry(userId: number, day: string): Promise<DayLogEntry | null> {
    const [row] = await this.database
      .select()
      .from(coachDailyLogTable)
      .where(
        and(
          eq(coachDailyLogTable.userId, userId),
          eq(coachDailyLogTable.day, day),
        ),
      )
      .limit(1);
    return row ? dayRowToEngine(row) : null;
  }

  async putDayEntry(
    userId: number,
    day: string,
    entry: DayLogEntry,
  ): Promise<void> {
    const dayRow = engineToDayRow(userId, day, entry);
    await this.database
      .insert(coachDailyLogTable)
      .values(dayRow)
      .onConflictDoUpdate({
        target: [coachDailyLogTable.userId, coachDailyLogTable.day],
        set: dayRow,
      });
  }

  async freezeDay(
    userId: number,
    day: string,
    entry: DayLogEntry,
  ): Promise<DayLogEntry> {
    // First writer wins; a racing second insert hits the unique constraint,
    // does nothing, and reads the winner back.
    const [inserted] = await this.database
      .insert(coachDailyLogTable)
      .values(engineToDayRow(userId, day, entry))
      .onConflictDoNothing()
      .returning();
    if (inserted) return dayRowToEngine(inserted);
    const existing = await this.getDayEntry(userId, day);
    // The row can only have vanished if someone deleted it between the two
    // statements; treat our entry as the deal in that unlikely case.
    return existing ?? entry;
  }

  async loadDayLog(
    userId: number,
    today: string,
    days: number,
  ): Promise<Record<string, DayLogEntry>> {
    const start = shiftDate(today, -(days - 1));
    const rows = await this.database
      .select()
      .from(coachDailyLogTable)
      .where(
        and(
          eq(coachDailyLogTable.userId, userId),
          gte(coachDailyLogTable.day, start),
          lte(coachDailyLogTable.day, today),
        ),
      );
    return Object.fromEntries(rows.map((r) => [r.day, dayRowToEngine(r)]));
  }

  async getConfig(userId: number): Promise<CoachConfig> {
    const defaults = coachConfigSchema.parse({});
    await this.database
      .insert(coachConfigTable)
      .values(engineToConfigRow(userId, defaults))
      .onConflictDoNothing();
    const [row] = await this.database
      .select()
      .from(coachConfigTable)
      .where(eq(coachConfigTable.userId, userId))
      .limit(1);
    return row ? configRowToEngine(row) : defaults;
  }

  async putConfig(userId: number, config: CoachConfig): Promise<CoachConfig> {
    const row = engineToConfigRow(userId, config);
    await this.database
      .insert(coachConfigTable)
      .values(row)
      .onConflictDoUpdate({ target: coachConfigTable.userId, set: row });
    return config;
  }

  async createToken(userId: number, tokenHash: string): Promise<void> {
    await this.database.transaction(async (tx) => {
      await tx
        .update(coachApiTokensTable)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(coachApiTokensTable.userId, userId),
            isNull(coachApiTokensTable.revokedAt),
          ),
        );
      await tx.insert(coachApiTokensTable).values({ userId, tokenHash });
    });
  }

  async revokeTokens(userId: number): Promise<void> {
    await this.database
      .update(coachApiTokensTable)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(coachApiTokensTable.userId, userId),
          isNull(coachApiTokensTable.revokedAt),
        ),
      );
  }

  async findUserByLiveToken(
    tokenHash: string,
    now: Date,
  ): Promise<CoachUser | null> {
    const [row] = await this.database
      .select({ id: usersTable.id, email: usersTable.email })
      .from(coachApiTokensTable)
      .innerJoin(usersTable, eq(usersTable.id, coachApiTokensTable.userId))
      .where(
        and(
          eq(coachApiTokensTable.tokenHash, tokenHash),
          isNull(coachApiTokensTable.revokedAt),
        ),
      )
      .limit(1);
    if (!row) return null;
    await this.database
      .update(coachApiTokensTable)
      .set({ lastUsedAt: now })
      .where(eq(coachApiTokensTable.tokenHash, tokenHash));
    return row;
  }
}
