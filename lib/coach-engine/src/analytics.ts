/**
 * Reading the state back out: what is due, what is weak, what to do about it
 * — port of AceLeetcode's analytics.py.
 *
 * `buildPlan` decides what happens today. This module answers the slower
 * questions: which patterns are actually holding, which explanations keep
 * collapsing, and how much review work the fortnight is carrying. It only
 * reads; nothing here writes state, and nothing reads the clock.
 *
 * One shape difference from the reference: history arrives as review events
 * keyed by problem, because the web stores gradings as rows rather than an
 * array embedded in the review state.
 */
import { daysBetween, fromEpochDay, toEpochDay } from "./dates";
import { reviewCost, reviewMode } from "./daily";
import { adherence, dayStatus, entryFor, problemsDone, solvedIds, assignedIds, doneIds, streak } from "./daylog";
import { EASE_DEFAULT, retentionRisk } from "./scheduler";
import type {
  CoachConfig,
  DayLog,
  Problem,
  ReviewEvent,
  ReviewMode,
  ReviewState,
} from "./types";

/** How much a problem in each state counts toward its pattern being "held". */
const STATE_STRENGTH: Record<string, number> = {
  new: 0.15,
  learning: 0.45,
  review: 0.8,
  mastered: 1.0,
};

/** Lapses at which spaced repetition alone has clearly stopped working. */
export const LEECH_LAPSES = 2;

/** Grading history per problem id, newest last — the engine's stand-in for
 * the reference's embedded `history` array. */
export type EventsByProblem = Record<string, ReviewEvent[]>;

export interface KnowledgeGap {
  point: string;
  problem: Problem;
  patterns: string[];
  first_hit: string | null;
  last_hit: string | null;
  hits: number;
  /** Times it came back and still bit. */
  survived: number;
}

export interface ClearedGap {
  point: string;
  problem: Problem;
  cleared_after: number;
}

/** The points that got you caught, as concrete testable claims.
 *
 * Open gaps are what the last grading attached to a problem: the scheduler
 * clears them on a clean pass, so a point disappearing from this list means
 * you re-explained it without help, not that time passed. */
export function knowledgeGaps(
  problems: Record<string, Problem>,
  reviews: Record<string, ReviewState>,
  events: EventsByProblem,
): { open: KnowledgeGap[]; cleared: ClearedGap[] } {
  const open: KnowledgeGap[] = [];
  const cleared: ClearedGap[] = [];

  for (const [pid, st] of Object.entries(reviews)) {
    const problem = problems[pid];
    if (!problem) continue;
    const history = events[pid] ?? [];

    const seen = new Map<string, string[]>();
    for (const ev of history) {
      for (const point of ev.failed_on) {
        const dates = seen.get(point) ?? [];
        dates.push(ev.date);
        seen.set(point, dates);
      }
    }

    for (const point of st.weak_points) {
      const dates = seen.get(point) ?? [];
      const last = dates.length ? dates[dates.length - 1] : null;
      const survived = history.filter((h) => !last || h.date > last).length;
      open.push({
        point,
        problem,
        patterns: problem.patterns,
        first_hit: dates.length ? dates[0] : null,
        last_hit: last,
        hits: dates.length,
        survived,
      });
    }
    for (const [point, dates] of seen) {
      if (!st.weak_points.includes(point)) {
        cleared.push({ point, problem, cleared_after: dates.length });
      }
    }
  }

  open.sort(
    (a, b) =>
      b.hits - a.hits ||
      b.survived - a.survived ||
      a.problem.num - b.problem.num,
  );
  return { open, cleared };
}

/** Problems that keep collapsing. More repetitions will not save these. */
export function leeches(
  problems: Record<string, Problem>,
  reviews: Record<string, ReviewState>,
): Array<{ problem: Problem; state: ReviewState }> {
  const out: Array<{ problem: Problem; state: ReviewState }> = [];
  for (const [pid, st] of Object.entries(reviews)) {
    const problem = problems[pid];
    if (problem && st.lapses >= LEECH_LAPSES) out.push({ problem, state: st });
  }
  out.sort((a, b) => b.state.lapses - a.state.lapses || a.state.ease - b.state.ease);
  return out;
}

function problemStrength(st: ReviewState): number {
  let base = STATE_STRENGTH[st.state] ?? 0.15;
  base -= 0.08 * st.lapses;
  if (st.last_grade === "fail") base = Math.min(base, 0.3);
  return Math.max(0.05, Math.min(1.0, base));
}

export interface PatternRow {
  pattern: string;
  total: number;
  seen: number;
  solid: number;
  lapses: number;
  gaps: number;
  strength: number;
  ease: number;
  confidence: number;
}

/** Per-pattern hold on the material, most-practised first. */
export function patternStrength(
  problems: Record<string, Problem>,
  reviews: Record<string, ReviewState>,
): PatternRow[] {
  const rows = new Map<
    string,
    PatternRow & { _scores: number[]; _ease: number[] }
  >();

  for (const [pid, problem] of Object.entries(problems)) {
    for (const pat of problem.patterns) {
      let row = rows.get(pat);
      if (!row) {
        row = {
          pattern: pat,
          total: 0,
          seen: 0,
          solid: 0,
          lapses: 0,
          gaps: 0,
          strength: 0,
          ease: EASE_DEFAULT,
          confidence: 0,
          _scores: [],
          _ease: [],
        };
        rows.set(pat, row);
      }
      row.total += 1;
      const st = reviews[pid];
      if (!st) continue;
      row.seen += 1;
      row.lapses += st.lapses;
      row.gaps += st.weak_points.length;
      row._scores.push(problemStrength(st));
      row._ease.push(st.ease);
      if (
        (st.state === "review" || st.state === "mastered") &&
        st.last_grade !== "fail"
      ) {
        row.solid += 1;
      }
    }
  }

  const out: PatternRow[] = [];
  for (const row of rows.values()) {
    const { _scores, _ease, ...rest } = row;
    out.push({
      ...rest,
      strength: _scores.length
        ? _scores.reduce((a, b) => a + b, 0) / _scores.length
        : 0,
      ease: _ease.length
        ? _ease.reduce((a, b) => a + b, 0) / _ease.length
        : EASE_DEFAULT,
      // A pattern proved on one problem is not a pattern you own yet.
      confidence: Math.min(1, row.seen / 3),
    });
  }
  out.sort((a, b) => b.seen - a.seen || a.pattern.localeCompare(b.pattern));
  return out;
}

export interface UngradedItem {
  problem: Problem;
  solved_on: string;
  days_ago: number;
}

/** Problems whose code got written but whose reasoning was never tested.
 *
 * These are invisible to the scheduler: no grade means no interval, which
 * means nothing ever brings them back. Left alone they are the problems you
 * will swear you have done and be unable to explain. */
export function ungraded(
  problems: Record<string, Problem>,
  reviews: Record<string, ReviewState>,
  log: DayLog,
  today: string,
): UngradedItem[] {
  const out = new Map<string, UngradedItem>();
  for (const day of Object.keys(log)) {
    const entry = entryFor(log, day);
    for (const pid of solvedIds(entry)) {
      if (pid in reviews || !(pid in problems)) continue;
      const prev = out.get(pid);
      if (!prev || day < prev.solved_on) {
        out.set(pid, {
          problem: problems[pid],
          solved_on: day,
          days_ago: daysBetween(today, day),
        });
      }
    }
  }
  return [...out.values()].sort((a, b) => b.days_ago - a.days_ago);
}

export interface ForecastDayDetail {
  date: string;
  count: number;
  minutes: number;
}

export interface OverdueItem {
  problem: Problem;
  state: ReviewState;
  minutes: number;
  mode: ReviewMode;
  days_overdue: number;
  risk: number;
}

/** Review load for the next fortnight, plus whatever is already late. */
export function forecast(
  problems: Record<string, Problem>,
  reviews: Record<string, ReviewState>,
  days: number,
  today: string,
): {
  days: ForecastDayDetail[];
  overdue: OverdueItem[];
  overdue_minutes: number;
  beyond: number;
  peak: number;
} {
  const start = toEpochDay(today);
  const buckets = new Map<string, ForecastDayDetail>();
  for (let i = 0; i < days; i++) {
    const date = fromEpochDay(start + i);
    buckets.set(date, { date, count: 0, minutes: 0 });
  }
  const overdue: OverdueItem[] = [];
  let beyond = 0;

  for (const [pid, st] of Object.entries(reviews)) {
    const problem = problems[pid];
    if (!problem || !st.due) continue;
    const cost = reviewCost(st, problem);
    if (st.due < today) {
      overdue.push({
        problem,
        state: st,
        minutes: cost,
        mode: reviewMode(st),
        days_overdue: daysBetween(today, st.due),
        risk: retentionRisk(st, today),
      });
    } else {
      const bucket = buckets.get(st.due);
      if (bucket) {
        bucket.count += 1;
        bucket.minutes += cost;
      } else {
        beyond += 1;
      }
    }
  }

  overdue.sort((a, b) => b.risk - a.risk);
  const series = [...buckets.values()];
  return {
    days: series,
    overdue,
    overdue_minutes: overdue.reduce((n, r) => n + r.minutes, 0),
    beyond,
    peak: series.reduce((m, d) => Math.max(m, d.minutes), 0),
  };
}

export interface Overview {
  date: string;
  seen: number;
  bank: number;
  by_state: Record<string, number>;
  streak: number;
  adherence: ReturnType<typeof adherence>;
  solved_7d: number;
  today_assigned: number;
  today_done: number;
  today_solved: number;
  today_status: string;
  interview_date: string | null;
  days_to_interview: number | null;
}

export function overview(
  problems: Record<string, Problem>,
  reviews: Record<string, ReviewState>,
  log: DayLog,
  config: CoachConfig,
  today: string,
): Overview {
  const byState: Record<string, number> = {};
  for (const st of Object.values(reviews)) {
    byState[st.state] = (byState[st.state] ?? 0) + 1;
  }
  const entry = entryFor(log, today);
  const assigned = new Set(assignedIds(entry));
  const done = doneIds(entry).filter((p) => assigned.has(p));
  const solved = solvedIds(entry).filter((p) => assigned.has(p));

  return {
    date: today,
    seen: Object.keys(reviews).length,
    bank: Object.keys(problems).length,
    by_state: byState,
    streak: streak(log, today),
    adherence: adherence(log, 30, today),
    solved_7d: problemsDone(log, today, 7),
    today_assigned: assigned.size,
    today_done: done.length,
    today_solved: solved.length,
    today_status: dayStatus(entry, today, today),
    interview_date: config.interview_date,
    days_to_interview: config.interview_date
      ? daysBetween(config.interview_date, today)
      : null,
  };
}

export type GuidanceTone = "critical" | "warn" | "info" | "good";

export interface GuidanceItem {
  tone: GuidanceTone;
  title: string;
  body: string;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/** Concrete instructions derived from the state, most urgent first.
 *
 * Everything here has to name a problem, a date or a number. Generic study
 * advice is worth nothing at this point — the whole system exists to know
 * exactly which sentence you could not say out loud. */
export function guidance(
  problems: Record<string, Problem>,
  reviews: Record<string, ReviewState>,
  events: EventsByProblem,
  log: DayLog,
  config: CoachConfig,
  today: string,
): GuidanceItem[] {
  const ov = overview(problems, reviews, log, config, today);
  const fc = forecast(problems, reviews, 14, today);
  const gaps = knowledgeGaps(problems, reviews, events);
  const out: GuidanceItem[] = [];

  if (fc.overdue.length) {
    const worst = fc.overdue[0];
    out.push({
      tone: worst.days_overdue >= 3 ? "critical" : "warn",
      title: `Clear ${plural(fc.overdue.length, "overdue review")} first (~${fc.overdue_minutes} min)`,
      body:
        `Start with LC ${worst.problem.num} · ${worst.problem.title}, ` +
        `${worst.days_overdue}d late. Recall decays fastest just past the due ` +
        "date, so the oldest card is where a minute of review buys the most.",
    });
  }

  const stale = ungraded(problems, reviews, log, today);
  if (stale.length) {
    const oldest = stale[0];
    const names = stale.slice(0, 4).map((r) => `LC ${r.problem.num}`).join(", ");
    const fresh = oldest.days_ago === 0;
    const tail = fresh
      ? stale.length === 1
        ? "get to it today"
        : "get to them today"
      : `oldest is ${plural(oldest.days_ago, "day")} old`;
    out.push({
      tone: fresh ? "info" : "warn",
      title: `${plural(stale.length, "problem")} solved but never grilled — ${tail}`,
      body:
        `${names}. Code that was never defended out loud is not on any review ` +
        "schedule — the scheduler cannot bring back a problem it has no grade " +
        "for, so these are the ones that vanish quietly. Grill each of them.",
    });
  }

  if (ov.today_assigned && ov.today_done < ov.today_assigned) {
    const left = ov.today_assigned - ov.today_done;
    const unsolved = ov.today_assigned - ov.today_solved;
    out.push({
      tone: "info",
      title:
        `${plural(left, "item")} still ungraded today` +
        (ov.today_solved
          ? ` · ${ov.today_solved} of ${ov.today_assigned} solved`
          : ""),
      body: unsolved
        ? "Tick the box once the code passes on LeetCode, then get grilled — the tick " +
          "records that you wrote it, the grade records that you can explain it."
        : "The code is written. Now defend it: the interval only starts once a " +
          "grilling puts a grade on it.",
    });
  }

  if (gaps.open.length) {
    const top = gaps.open.slice(0, 3);
    const bullets = top
      .map((g) => `LC ${g.problem.num}: ${g.point}`)
      .join("; ");
    const repeat = gaps.open.some((g) => g.hits >= 2);
    out.push({
      tone: repeat ? "warn" : "info",
      title: `Open the next ${plural(Math.min(3, top.length), "session")} on these exact claims`,
      body:
        bullets +
        ". Say each one out loud until it survives a follow-up question — " +
        "a gap only closes when you explain it unprompted.",
    });
  }

  for (const leech of leeches(problems, reviews).slice(0, 2)) {
    const { problem: p, state: st } = leech;
    out.push({
      tone: "critical",
      title: `LC ${p.num} has collapsed ${plural(st.lapses, "time")} — stop reviewing it`,
      body:
        "Repetition does not repair a problem you never understood. Re-solve it " +
        "from scratch on LeetCode, then rewrite the card's core insight in one " +
        "sentence of your own before scheduling it again.",
    });
  }

  const ceiling = Math.round(config.daily_minutes * 0.65);
  const heavy = fc.days.slice(0, 7).filter((d) => d.minutes > ceiling);
  if (heavy.length) {
    const d = heavy[0];
    out.push({
      tone: "warn",
      title: `${d.date} is carrying ${d.minutes} min of review`,
      body:
        `${plural(d.count, "problem")} land the same day. Pull one or two ` +
        "forward — reviewing a day early costs almost nothing, while a backlog " +
        "pushes new problems out of the plan.",
    });
  }

  const ad = ov.adherence;
  if (ad.assigned_days >= 3) {
    if (ad.rate < 0.7) {
      out.push({
        tone: "warn",
        title: `You finished ${ad.finished_days} of ${ad.assigned_days} assigned days this month`,
        body:
          "Two problems a day is the load this schedule was built for; missed " +
          "days come back as overdue reviews, not as free time. If two is " +
          "genuinely too many, lower new-per-day rather than skipping — the " +
          "reviews are the part that must not slip.",
      });
    } else if (ov.streak >= 3) {
      out.push({
        tone: "good",
        title: `${plural(ov.streak, "day")} in a row`,
        body:
          `${ad.finished_days} of ${ad.assigned_days} assigned days finished ` +
          `in the last ${ad.window}. Intervals only stretch if the days they ` +
          "are measured in actually happen.",
      });
    }
  }

  if (!Object.keys(reviews).length) {
    out.push({
      tone: "info",
      title: "Nothing scheduled yet — the ladder starts on your first grade",
      body:
        "Solve today's problems, get grilled, and the first intervals appear: " +
        "1 day, then 3, then 7, stretching by your ease factor from there. A " +
        "`fail` drops straight back to tomorrow.",
    });
  }

  if (
    ov.days_to_interview !== null &&
    ov.days_to_interview >= 0 &&
    ov.days_to_interview <= 30
  ) {
    out.push({
      tone: "warn",
      title: `${plural(ov.days_to_interview, "day")} to the interview`,
      body:
        "Inside the final two weeks the plan switches to target-company frequency " +
        "and goes review-heavy. Do not start a new pattern this close in.",
    });
  }

  return out;
}
