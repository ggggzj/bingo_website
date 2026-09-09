/**
 * The one place camelCase rows meet the engine's snake_case types. The
 * engine keeps the Python reference's field names so its parity fixtures
 * stay byte-comparable; the database follows this repo's column style.
 * Keeping the conversion in one file keeps the seam auditable.
 */

import type {
  CoachConfigRow,
  CoachDailyLog,
  CoachProblem,
  CoachReview,
} from "@workspace/db";
import type {
  CoachConfig,
  DayLogEntry,
  Grade,
  Problem,
  ReviewState,
} from "@workspace/coach-engine";

export function problemRowToEngine(row: CoachProblem): Problem {
  return {
    id: row.id,
    num: row.num,
    title: row.title,
    slug: row.slug,
    difficulty: row.difficulty as Problem["difficulty"],
    neetcode_group: row.neetcodeGroup,
    patterns: row.patterns,
    company_freq: row.companyFreq,
    followups: row.followups,
    siblings: row.siblings,
  };
}

export function reviewRowToEngine(row: CoachReview): ReviewState {
  return {
    problem_id: row.problemId,
    state: row.state as ReviewState["state"],
    ease: row.ease,
    interval_days: row.intervalDays,
    due: row.due,
    reps: row.reps,
    lapses: row.lapses,
    last_grade: row.lastGrade as Grade | null,
    weak_points: row.weakPoints,
  };
}

export function engineToReviewRow(userId: number, st: ReviewState) {
  return {
    userId,
    problemId: st.problem_id,
    state: st.state,
    ease: st.ease,
    intervalDays: st.interval_days,
    due: st.due,
    reps: st.reps,
    lapses: st.lapses,
    lastGrade: st.last_grade,
    weakPoints: st.weak_points,
  };
}

export function dayRowToEngine(row: CoachDailyLog): DayLogEntry {
  return {
    assigned_new: row.assignedNew,
    assigned_reviews: row.assignedReviews,
    planned_minutes: row.plannedMinutes,
    solved: row.solved,
    done: row.done as DayLogEntry["done"],
  };
}

export function engineToDayRow(userId: number, day: string, entry: DayLogEntry) {
  return {
    userId,
    day,
    assignedNew: entry.assigned_new,
    assignedReviews: entry.assigned_reviews,
    plannedMinutes: entry.planned_minutes,
    solved: entry.solved,
    done: entry.done,
  };
}

export function configRowToEngine(row: CoachConfigRow): CoachConfig {
  return {
    daily_minutes: row.dailyMinutes,
    new_per_day: row.newPerDay,
    sprint_window_days: row.sprintWindowDays,
    interview_date: row.interviewDate,
    target_companies: row.targetCompanies,
    // A row written before the column existed, or by hand, falls back to
    // the default track rather than failing the whole config read.
    active_track:
      row.activeTrack === "ai-engineer" ? "ai-engineer" : "sde",
  };
}

export function engineToConfigRow(userId: number, cfg: CoachConfig) {
  return {
    userId,
    dailyMinutes: cfg.daily_minutes,
    newPerDay: cfg.new_per_day,
    sprintWindowDays: cfg.sprint_window_days,
    interviewDate: cfg.interview_date,
    targetCompanies: cfg.target_companies,
    activeTrack: cfg.active_track,
  };
}
