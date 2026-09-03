/**
 * Spaced-repetition scheduling — port of AceLeetcode's scheduler.py.
 *
 * An SM-2 variant where the grade is the outcome of a grilling session, not
 * self-reported confidence. Three grades only. A `fail` always resets to a
 * one-day interval: if you cannot explain why it is correct, you do not know
 * it. States: new -> learning -> review -> mastered; mastered is not an exit,
 * the problem keeps coming back (interval capped at MAX_INTERVAL).
 *
 * Unlike the Python original, `applyGrade` does not mutate: it returns the
 * next state plus the grading event, and the caller persists both.
 */
import { daysBetween, shiftDate } from "./dates";
import { pythonRound, roundTo } from "./round";
import type { Grade, ReviewEvent, ReviewState } from "./types";

export const EASE_DEFAULT = 2.5;
export const EASE_MIN = 1.3;
export const EASE_MAX = 3.2;

export const LEARNING_STEPS = [1, 3, 7] as const;

export const MASTERED_THRESHOLD = 60; // days; interval at which a problem counts as mastered
export const MAX_INTERVAL = 180;

const MAX_WEAK_POINTS = 6;

export function freshReviewState(problemId: string): ReviewState {
  return {
    problem_id: problemId,
    state: "new",
    ease: EASE_DEFAULT,
    interval_days: 0,
    due: null,
    reps: 0,
    lapses: 0,
    last_grade: null,
    weak_points: [],
  };
}

export function daysOverdue(st: ReviewState, today: string): number {
  if (!st.due) return 0;
  return daysBetween(today, st.due);
}

export function isDue(st: ReviewState, today: string): boolean {
  return st.due !== null && st.due <= today;
}

function clampEase(ease: number): number {
  return Math.max(EASE_MIN, Math.min(EASE_MAX, ease));
}

function nextLearningInterval(current: number): number {
  for (const step of LEARNING_STEPS) {
    if (step > current) return step;
  }
  return LEARNING_STEPS[LEARNING_STEPS.length - 1];
}

export interface ApplyGradeOptions {
  mode?: string;
  weakPoints?: string[];
  notes?: string;
  /** ISO date the grading happened — required; the engine has no clock. */
  on: string;
}

export function applyGrade(
  st: ReviewState,
  grade: Grade,
  opts: ApplyGradeOptions,
): { next: ReviewState; event: ReviewEvent } {
  const { mode = "grill", weakPoints, notes = "", on } = opts;
  const next: ReviewState = { ...st, weak_points: [...st.weak_points] };

  next.reps += 1;
  next.last_grade = grade;

  if (grade === "fail") {
    next.lapses += 1;
    next.ease = clampEase(next.ease - 0.2);
    next.state = "learning";
    next.interval_days = 1;
  } else if (grade === "partial") {
    next.ease = clampEase(next.ease - 0.05);
    if (next.state === "new" || next.state === "learning") {
      next.state = "learning";
      next.interval_days = nextLearningInterval(next.interval_days);
    } else {
      // Shaky recall: grow the gap, but far more slowly than a clean pass.
      next.interval_days = Math.max(2, pythonRound(next.interval_days * 1.25));
    }
  } else {
    next.ease = clampEase(next.ease + 0.1);
    if (next.state === "new" || next.state === "learning") {
      next.interval_days = nextLearningInterval(next.interval_days);
      next.state =
        next.interval_days < LEARNING_STEPS[LEARNING_STEPS.length - 1]
          ? "learning"
          : "review";
    } else {
      next.interval_days = Math.max(
        1,
        pythonRound(next.interval_days * next.ease),
      );
    }
  }

  next.interval_days = Math.min(next.interval_days, MAX_INTERVAL);
  if (next.interval_days >= MASTERED_THRESHOLD) {
    next.state = "mastered";
  }

  next.due = shiftDate(on, next.interval_days);

  if (weakPoints && weakPoints.length) {
    // Keep the most recent distinct weak points, newest first.
    const merged = [
      ...weakPoints,
      ...next.weak_points.filter((w) => !weakPoints.includes(w)),
    ];
    next.weak_points = merged.slice(0, MAX_WEAK_POINTS);
  } else if (grade === "pass") {
    next.weak_points = [];
  }

  const event: ReviewEvent = {
    date: on,
    mode,
    grade,
    interval_days: next.interval_days,
    failed_on: [...(weakPoints ?? [])],
    notes,
  };

  return { next, event };
}

/** How close this problem is to being forgotten. Higher = rescue it sooner.
 *
 * Overdue relative to its own interval, nudged up for problems that have
 * lapsed before or that were never solid to begin with. */
export function retentionRisk(st: ReviewState, today: string): number {
  const overdue = daysOverdue(st, today);
  if (overdue < 0) return 0.0;
  const base = (overdue + 1) / Math.max(1, st.interval_days);
  const lapsePenalty = 1.0 + 0.15 * st.lapses;
  const easePenalty = 1.0 + (EASE_DEFAULT - st.ease) * 0.4;
  return base * lapsePenalty * easePenalty;
}

/** The state as the Python reference serializes it (`to_dict`, minus the
 * embedded history array — events are rows here). Used by parity fixtures. */
export function serializeReviewState(
  st: ReviewState,
): Omit<ReviewState, "problem_id" | "ease"> & { ease: number } {
  const { problem_id: _ignored, ...rest } = st;
  return { ...rest, ease: roundTo(st.ease, 3) };
}
