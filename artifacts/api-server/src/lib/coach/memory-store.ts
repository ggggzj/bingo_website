/**
 * A CoachStore in memory — a real implementation, not a stub: freezing is
 * first-writer-wins, token rotation revokes predecessors, config defaults
 * appear on first read. Backs the route tests and local no-Postgres runs.
 */

import { coachConfigSchema } from "@workspace/coach-engine";
import type {
  CoachConfig,
  DayLogEntry,
  Problem,
  ReviewEvent,
  ReviewState,
} from "@workspace/coach-engine";
import type { CoachStore, CoachUser } from "./store";

type StoredToken = {
  userId: number;
  revoked: boolean;
  lastUsedAt: Date | null;
};

const key = (userId: number, sub: string) => `${userId}:${sub}`;

export class InMemoryCoachStore implements CoachStore {
  private problems: Record<string, Problem>;
  private readonly reviews = new Map<string, ReviewState>();
  readonly events: Array<{ userId: number; event: ReviewEvent }> = [];
  private readonly days = new Map<string, DayLogEntry>();
  private readonly configs = new Map<number, CoachConfig>();
  private readonly tokens = new Map<string, StoredToken>();
  private readonly users = new Map<number, CoachUser>();

  constructor(problems: Record<string, Problem> = {}) {
    this.problems = problems;
  }

  /** Test seams. */
  seedProblems(problems: Record<string, Problem>): void {
    this.problems = problems;
  }
  seedUser(user: CoachUser): void {
    this.users.set(user.id, user);
  }

  async loadProblems(): Promise<Record<string, Problem>> {
    return this.problems;
  }

  async loadReviews(userId: number): Promise<Record<string, ReviewState>> {
    const out: Record<string, ReviewState> = {};
    for (const [k, st] of this.reviews) {
      const [uid] = k.split(":");
      if (Number(uid) === userId) out[st.problem_id] = st;
    }
    return out;
  }

  async getReview(
    userId: number,
    problemId: string,
  ): Promise<ReviewState | null> {
    return this.reviews.get(key(userId, problemId)) ?? null;
  }

  async saveGrade(
    userId: number,
    state: ReviewState,
    event: ReviewEvent,
    day: string,
    entry: DayLogEntry,
  ): Promise<void> {
    this.reviews.set(key(userId, state.problem_id), state);
    this.events.push({ userId, event });
    this.days.set(key(userId, day), entry);
  }

  async getDayEntry(userId: number, day: string): Promise<DayLogEntry | null> {
    return this.days.get(key(userId, day)) ?? null;
  }

  async putDayEntry(
    userId: number,
    day: string,
    entry: DayLogEntry,
  ): Promise<void> {
    this.days.set(key(userId, day), entry);
  }

  async freezeDay(
    userId: number,
    day: string,
    entry: DayLogEntry,
  ): Promise<DayLogEntry> {
    const existing = this.days.get(key(userId, day));
    if (existing) return existing;
    this.days.set(key(userId, day), entry);
    return entry;
  }

  async loadDayLog(
    userId: number,
    today: string,
    days: number,
  ): Promise<Record<string, DayLogEntry>> {
    // Memory keeps few rows; filter by window the same way the SQL will.
    const out: Record<string, DayLogEntry> = {};
    for (const [k, entry] of this.days) {
      const [uid, day] = k.split(":");
      if (Number(uid) !== userId || day > today) continue;
      const age =
        (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${day}T00:00:00Z`)) /
        86_400_000;
      if (age < days) out[day] = entry;
    }
    return out;
  }

  async getConfig(userId: number): Promise<CoachConfig> {
    let cfg = this.configs.get(userId);
    if (!cfg) {
      cfg = coachConfigSchema.parse({});
      this.configs.set(userId, cfg);
    }
    return cfg;
  }

  async putConfig(userId: number, config: CoachConfig): Promise<CoachConfig> {
    this.configs.set(userId, config);
    return config;
  }

  async createToken(userId: number, tokenHash: string): Promise<void> {
    await this.revokeTokens(userId);
    this.tokens.set(tokenHash, { userId, revoked: false, lastUsedAt: null });
  }

  async revokeTokens(userId: number): Promise<void> {
    for (const token of this.tokens.values()) {
      if (token.userId === userId) token.revoked = true;
    }
  }

  async findUserByLiveToken(
    tokenHash: string,
    now: Date,
  ): Promise<CoachUser | null> {
    const token = this.tokens.get(tokenHash);
    if (!token || token.revoked) return null;
    token.lastUsedAt = now;
    return this.users.get(token.userId) ?? null;
  }
}
