/**
 * What the coach routes need from storage, and nothing else — the AuthStore
 * pattern applied to the coach. The engine (@workspace/coach-engine) is pure
 * and sits in front of this seam: routes fetch rows through here, run the
 * engine, and persist what it returns. Tests run the real routes and the
 * real engine against the memory implementation.
 *
 * All engine-facing shapes are the engine's own snake_case types; the
 * drizzle implementation owns the camelCase-row mapping.
 */

import type {
  CoachConfig,
  DayLogEntry,
  Problem,
  ReviewEvent,
  ReviewState,
} from "@workspace/coach-engine";

/** Who a bearer token belongs to. No passwordHash on purpose — a coach token
 * must never be usable as a login. */
export type CoachUser = { id: number; email: string };

export interface CoachStore {
  /** The global problem bank, keyed by problem id. Read-only reference data. */
  loadProblems(): Promise<Record<string, Problem>>;

  /** Every review state the user has, keyed by problem id. */
  loadReviews(userId: number): Promise<Record<string, ReviewState>>;

  getReview(userId: number, problemId: string): Promise<ReviewState | null>;

  /** Every grading the user has, keyed by problem id, oldest first — the
   * history the analytics read (events are rows here, not an array on the
   * review state). */
  loadEvents(userId: number): Promise<Record<string, ReviewEvent[]>>;

  /**
   * Persist one grading atomically: upsert the review state, append the
   * event, and replace the day-log entry. A crash must never leave a grade
   * counted in one place and missing in the other.
   */
  saveGrade(
    userId: number,
    state: ReviewState,
    event: ReviewEvent,
    day: string,
    entry: DayLogEntry,
  ): Promise<void>;

  getDayEntry(userId: number, day: string): Promise<DayLogEntry | null>;

  /** Upsert the full entry for a day (solved ticks, corrections). */
  putDayEntry(userId: number, day: string, entry: DayLogEntry): Promise<void>;

  /**
   * Freeze a day's assignment exactly once: if a row for (user, day) already
   * exists it wins and is returned unchanged; otherwise `entry` is inserted
   * and returned. Two racing first calls must both come back with the same
   * winner.
   */
  freezeDay(
    userId: number,
    day: string,
    entry: DayLogEntry,
  ): Promise<DayLogEntry>;

  /** Day-log entries for the trailing window ending at `today`, keyed by day. */
  loadDayLog(
    userId: number,
    today: string,
    days: number,
  ): Promise<Record<string, DayLogEntry>>;

  /** The user's settings, created with engine defaults on first read. */
  getConfig(userId: number): Promise<CoachConfig>;

  putConfig(userId: number, config: CoachConfig): Promise<CoachConfig>;

  /** Store a new token hash, revoking every live token the user had. */
  createToken(userId: number, tokenHash: string): Promise<void>;

  /** Idempotent: revoking with no live tokens is a no-op. */
  revokeTokens(userId: number): Promise<void>;

  /** The owner of a live (unrevoked) token, or null; touches last_used_at. */
  findUserByLiveToken(tokenHash: string, now: Date): Promise<CoachUser | null>;
}
