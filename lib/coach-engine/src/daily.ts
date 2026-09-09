/**
 * Assembling today's practice plan — port of daily.py's plan logic (the
 * markdown rendering half of that file is not ported; the web page renders
 * from the structured plan).
 *
 * Budget-aware: due reviews are placed first, because a forgotten problem is
 * worth more than a new one, but reviews are capped so a backlog can never
 * crowd new problems out entirely.
 *
 * The pure port of the freeze rule: the caller passes today's existing
 * day-log entry (if any). When that entry already carries an assignment and
 * `reassign` is not set, the plan is rebuilt from it; otherwise a fresh deal
 * is made and returned as `assignment` for the caller to persist.
 */
import { daysBetween } from "./dates";
import {
  daysOverdue,
  isDue,
  retentionRisk,
  freshReviewState,
} from "./scheduler";
import { estimateMinutes, rankNewProblems } from "./selector";
import { doneIds, gradeFor, solvedIds, blankEntry } from "./daylog";
import { pythonRound, roundTo } from "./round";
import type {
  CoachConfig,
  DayLogEntry,
  NewItem,
  Plan,
  Problem,
  ReviewItem,
  ReviewMode,
  ReviewState,
} from "./types";

export const GRILL_MINUTES = 4; // oral recall of a problem already solved once
export const RESOLVE_FACTOR = 0.6; // re-solving is faster than the first encounter
export const REVIEW_BUDGET_SHARE = 0.65; // ceiling on how much of a day backlog may eat

/** Oral grilling by default; back to the keyboard only when recall collapsed.
 *
 * A `partial` stays oral on purpose — the grilling already knows where the
 * gap is and will go straight at it. */
export function reviewMode(st: ReviewState): ReviewMode {
  return st.last_grade === "fail" ? "re-solve" : "grill";
}

export function reviewCost(st: ReviewState, problem: Problem): number {
  if (reviewMode(st) === "grill") return GRILL_MINUTES;
  return Math.max(8, pythonRound(estimateMinutes(problem) * RESOLVE_FACTOR));
}

export function collectDue(
  problems: Record<string, Problem>,
  reviews: Record<string, ReviewState>,
  today: string,
): Array<{ st: ReviewState; problem: Problem; risk: number }> {
  const due: Array<{ st: ReviewState; problem: Problem; risk: number }> = [];
  for (const [pid, st] of Object.entries(reviews)) {
    const problem = problems[pid];
    if (!problem) continue;
    if (isDue(st, today)) {
      due.push({ st, problem, risk: retentionRisk(st, today) });
    }
  }
  due.sort((a, b) => b.risk - a.risk);
  return due;
}

function reviewItem(
  st: ReviewState,
  problem: Problem,
  today: string,
): ReviewItem {
  return {
    problem,
    state: st,
    mode: reviewMode(st),
    minutes: reviewCost(st, problem),
    risk: roundTo(retentionRisk(st, today), 2),
    days_overdue: daysOverdue(st, today),
  };
}

/** Rebuild today's list from the assignment that was already handed out. */
function fromFrozen(
  entry: DayLogEntry,
  problems: Record<string, Problem>,
  reviews: Record<string, ReviewState>,
  today: string,
): { reviewItems: ReviewItem[]; newItems: NewItem[] } {
  const reviewItems: ReviewItem[] = [];
  for (const pid of entry.assigned_reviews) {
    const problem = problems[pid];
    if (!problem) continue;
    const st = reviews[pid] ?? freshReviewState(pid);
    reviewItems.push(reviewItem(st, problem, today));
  }
  const newItems: NewItem[] = [];
  for (const pid of entry.assigned_new) {
    const problem = problems[pid];
    if (!problem) continue;
    newItems.push({ problem, minutes: estimateMinutes(problem), score: null });
  }
  return { reviewItems, newItems };
}

export interface BuildPlanInput {
  problems: Record<string, Problem>;
  reviews: Record<string, ReviewState>;
  config: CoachConfig;
  /** ISO date the plan is for — the engine has no clock. */
  today: string;
  /** Today's existing day-log entry, when one exists. */
  entry?: Partial<DayLogEntry> | null;
  /** Override the config's minutes budget. */
  minutes?: number;
  /** Throw away a frozen assignment and deal a fresh one. */
  reassign?: boolean;
}

export interface BuildPlanResult {
  plan: Plan;
  /** Non-null when a fresh deal happened: what the caller must freeze into
   * the day log. Null when the plan was rebuilt from the frozen entry. */
  assignment: {
    assigned_new: string[];
    assigned_reviews: string[];
    planned_minutes: number;
  } | null;
}

export function buildPlan(input: BuildPlanInput): BuildPlanResult {
  const { problems, reviews, config, today, reassign = false } = input;
  const entry: DayLogEntry = { ...blankEntry(), ...(input.entry ?? {}) };
  const budget = input.minutes ?? config.daily_minutes;

  let sprint = false;
  let sprintDays: number | null = null;
  if (config.interview_date) {
    sprintDays = daysBetween(config.interview_date, today);
    sprint = sprintDays >= 0 && sprintDays <= config.sprint_window_days;
  }

  const due = collectDue(problems, reviews, today);
  const reviewCeiling = sprint
    ? budget
    : pythonRound(budget * REVIEW_BUDGET_SHARE);

  let reviewItems: ReviewItem[] = [];
  let spent = 0;
  for (const { st, problem } of due) {
    const cost = reviewCost(st, problem);
    if (spent + cost > reviewCeiling && reviewItems.length) break;
    reviewItems.push(reviewItem(st, problem, today));
    spent += cost;
  }

  let newItems: NewItem[] = [];
  const newTarget = config.new_per_day;
  if (!sprint || spent < budget) {
    let remaining = budget - spent;
    for (const { problem, score } of rankNewProblems(
      problems,
      reviews,
      config.target_companies,
      { sprint, track: config.active_track },
    )) {
      const cost = estimateMinutes(problem);
      if (cost > remaining) continue;
      newItems.push({ problem, minutes: cost, score: roundTo(score, 3) });
      remaining -= cost;
      spent += cost;
      if (remaining < 15 || newItems.length >= newTarget) break;
    }
  }

  const wasFrozen =
    entry.assigned_new.length > 0 || entry.assigned_reviews.length > 0;

  let assignment: BuildPlanResult["assignment"] = null;
  if (wasFrozen && !reassign) {
    ({ reviewItems, newItems } = fromFrozen(entry, problems, reviews, today));
    spent = [...reviewItems, ...newItems].reduce((n, i) => n + i.minutes, 0);
  } else {
    assignment = {
      assigned_new: newItems.map((i) => i.problem.id),
      assigned_reviews: reviewItems.map((i) => i.problem.id),
      planned_minutes: spent,
    };
  }

  const done = new Set(doneIds(entry));
  const solved = new Set(solvedIds(entry));
  for (const item of [...reviewItems, ...newItems]) {
    const pid = item.problem.id;
    item.done = done.has(pid);
    item.solved = solved.has(pid);
    item.grade = gradeFor(entry, pid);
  }

  const assignedReviews = new Set(reviewItems.map((i) => i.problem.id));
  const deferred = due.filter(
    (d) => !assignedReviews.has(d.st.problem_id),
  ).length;

  const planIds = new Set(
    [...reviewItems, ...newItems].map((i) => i.problem.id),
  );

  const plan: Plan = {
    date: today,
    budget,
    planned_minutes: spent,
    reviews: reviewItems,
    new: newItems,
    deferred_reviews: deferred,
    sprint,
    sprint_days: sprintDays,
    total_seen: Object.keys(reviews).length,
    total_problems: Object.keys(problems).length,
    done_today: done.size,
    solved_today: [...solved].filter((pid) => planIds.has(pid)).length,
    assigned_today: reviewItems.length + newItems.length,
  };

  return { plan, assignment };
}
