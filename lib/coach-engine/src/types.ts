/**
 * The engine's plain-object types. Field names stay snake_case to match the
 * problem bank JSON and the Python reference byte-for-byte — parity fixtures
 * and the seed data are shared artifacts, and renaming fields would put a
 * mapping layer between them and every test.
 */
import { z } from "zod";

export const GRADES = ["pass", "partial", "fail"] as const;
export type Grade = (typeof GRADES)[number];

export const gradeSchema = z.enum(GRADES);

export const difficultySchema = z.enum(["easy", "medium", "hard"]);
export type Difficulty = z.infer<typeof difficultySchema>;

export const problemSchema = z.object({
  id: z.string(),
  num: z.number().int(),
  title: z.string(),
  slug: z.string(),
  difficulty: difficultySchema,
  neetcode_group: z.string(),
  patterns: z.array(z.string()),
  company_freq: z.record(z.string(), z.number()),
  followups: z.array(z.string()),
  siblings: z.array(z.string()),
});
export type Problem = z.infer<typeof problemSchema>;

export const reviewStateSchema = z.object({
  problem_id: z.string(),
  state: z.enum(["new", "learning", "review", "mastered"]),
  ease: z.number(),
  interval_days: z.number().int(),
  due: z.string().nullable(),
  reps: z.number().int(),
  lapses: z.number().int(),
  last_grade: gradeSchema.nullable(),
  weak_points: z.array(z.string()),
});
export type ReviewState = z.infer<typeof reviewStateSchema>;

/** One grading. The Python reference appends these to a history array; here
 * the caller persists them as rows. */
export const reviewEventSchema = z.object({
  date: z.string(),
  mode: z.string(),
  grade: gradeSchema,
  interval_days: z.number().int(),
  failed_on: z.array(z.string()),
  notes: z.string(),
});
export type ReviewEvent = z.infer<typeof reviewEventSchema>;

export const doneEntrySchema = z.object({
  id: z.string(),
  grade: gradeSchema,
  mode: z.string(),
});
export type DoneEntry = z.infer<typeof doneEntrySchema>;

export const dayLogEntrySchema = z.object({
  assigned_new: z.array(z.string()),
  assigned_reviews: z.array(z.string()),
  planned_minutes: z.number().int(),
  solved: z.array(z.string()),
  done: z.array(doneEntrySchema),
});
export type DayLogEntry = z.infer<typeof dayLogEntrySchema>;

/** {date: entry} — same shape the Python daylog module works over. */
export type DayLog = Record<string, Partial<DayLogEntry>>;

export const coachConfigSchema = z.object({
  daily_minutes: z.number().int().default(60),
  new_per_day: z.number().int().default(2),
  sprint_window_days: z.number().int().default(14),
  interview_date: z.string().nullable().default(null),
  target_companies: z.array(z.string()).default([]),
  // Which application track's weights steer new-problem selection.
  active_track: z.enum(["sde", "ai-engineer"]).default("sde"),
});
export type CoachConfig = z.infer<typeof coachConfigSchema>;

export type ReviewMode = "grill" | "re-solve";

export interface ReviewItem {
  problem: Problem;
  state: ReviewState;
  mode: ReviewMode;
  minutes: number;
  risk: number;
  days_overdue: number;
  done?: boolean;
  solved?: boolean;
  grade?: Grade | null;
}

export interface NewItem {
  problem: Problem;
  minutes: number;
  score: number | null;
  done?: boolean;
  solved?: boolean;
  grade?: Grade | null;
}

export interface Plan {
  date: string;
  budget: number;
  planned_minutes: number;
  reviews: ReviewItem[];
  new: NewItem[];
  deferred_reviews: number;
  sprint: boolean;
  sprint_days: number | null;
  total_seen: number;
  total_problems: number;
  done_today: number;
  solved_today: number;
  assigned_today: number;
}

export type DayStatus =
  | "complete"
  | "partial"
  | "ungraded"
  | "missed"
  | "extra"
  | "rest"
  | "pending";
