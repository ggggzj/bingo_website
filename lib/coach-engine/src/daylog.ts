/**
 * The day log: what was assigned on a given day, and what actually got done —
 * port of daylog.py's pure helpers. Two different facts per day, and the
 * difference is the point:
 *
 *   solved - the code was written and passed. Self-reported, and that is
 *            fine: whether you typed a solution is not a matter of opinion.
 *   done   - a grilling put a grade on it. Only this counts toward streaks,
 *            intervals and completion.
 *
 * Everything here transforms entries passed in; persistence belongs to the
 * caller (the API layer keeps one row per user per day).
 */
import { fromEpochDay, toEpochDay } from "./dates";
import type { DayLog, DayLogEntry, DayStatus, Grade } from "./types";

export function blankEntry(): DayLogEntry {
  return {
    assigned_new: [],
    assigned_reviews: [],
    planned_minutes: 0,
    solved: [],
    done: [],
  };
}

export function entryFor(log: DayLog, day: string): DayLogEntry {
  return { ...blankEntry(), ...(log[day] ?? {}) };
}

export function assignedIds(entry: DayLogEntry): string[] {
  return [...entry.assigned_new, ...entry.assigned_reviews];
}

export function doneIds(entry: DayLogEntry): string[] {
  return entry.done.map((d) => d.id);
}

/** Solved implies graded, never the other way round. */
export function solvedIds(entry: DayLogEntry): string[] {
  const out = [...entry.solved];
  for (const pid of doneIds(entry)) {
    if (!out.includes(pid)) out.push(pid);
  }
  return out;
}

export function gradeFor(entry: DayLogEntry, pid: string): Grade | null {
  for (const d of entry.done) {
    if (d.id === pid) return d.grade;
  }
  return null;
}

/** Record that the code got written. Says nothing about understanding it.
 *
 * Refuses to un-solve a problem that has already been graded — the grading
 * session is proof the code existed. Returns a new entry. */
export function markSolved(
  entry: DayLogEntry,
  pid: string,
  solved: boolean = true,
): DayLogEntry {
  const current = new Set(entry.solved);
  if (solved) {
    current.add(pid);
  } else if (doneIds(entry).includes(pid)) {
    throw new Error(`${pid} was graded today; a grade cannot be un-ticked here`);
  } else {
    current.delete(pid);
  }
  const assigned = assignedIds(entry);
  const extras = [...current].filter((p) => !assigned.includes(p)).sort();
  const order = [...assigned, ...extras];
  return { ...entry, solved: order.filter((p) => current.has(p)) };
}

/** Stamp a graded session onto its day. Re-grading the same problem the same
 * day overwrites, so a corrected grade does not count as two problems. */
export function markDone(
  entry: DayLogEntry,
  pid: string,
  grade: Grade,
  mode: string,
): DayLogEntry {
  const done = entry.done.filter((d) => d.id !== pid);
  done.push({ id: pid, grade, mode });
  const solved = entry.solved.includes(pid)
    ? entry.solved
    : [...entry.solved, pid];
  return { ...entry, done, solved };
}

/** How a single day went.
 *
 *   complete - everything the day asked for was graded
 *   partial  - some of it was
 *   ungraded - the problems were solved, but no grilling ever graded them
 *   missed   - the day asked for problems and nothing happened
 *   extra    - nothing was assigned, but work happened anyway
 *   rest     - nothing assigned, nothing done
 *   pending  - today, still in progress
 *
 * Only `complete` counts toward a streak. Writing code you never had to
 * defend is the failure mode this whole system exists to catch, so it gets
 * its own colour rather than being rounded up to success. */
export function dayStatus(
  entry: DayLogEntry,
  day: string,
  today: string,
): DayStatus {
  const assigned = new Set(assignedIds(entry));
  const done = new Set(doneIds(entry));
  const solved = new Set(solvedIds(entry));
  const isToday = day === today;

  if (!assigned.size) {
    if (done.size) return "extra";
    if (solved.size) return "ungraded";
    return isToday ? "pending" : "rest";
  }
  if ([...assigned].every((pid) => done.has(pid))) return "complete";
  if (isToday) return solved.size ? "partial" : "pending";
  if (done.size) return "partial";
  return solved.size ? "ungraded" : "missed";
}

/** Consecutive days of finishing the assignment, counting back from today.
 *
 * An unfinished today does not break the streak — the day is not over. A day
 * where nothing was assigned and nothing was done does: a system you did not
 * open is a day you did not practise. */
export function streak(log: DayLog, today: string): number {
  let count = 0;
  let cursor = toEpochDay(today);
  let first = true;
  for (;;) {
    const day = fromEpochDay(cursor);
    const status = dayStatus(entryFor(log, day), day, today);
    if (status === "complete" || status === "extra") {
      count += 1;
    } else if (first && (status === "pending" || status === "partial")) {
      // today is still open for business
    } else {
      break;
    }
    cursor -= 1;
    first = false;
    if (count > 3650) break;
  }
  return count;
}

export interface Adherence {
  window: number;
  assigned_days: number;
  finished_days: number;
  worked_days: number;
  rate: number;
}

/** How often assigned days actually got finished, over a trailing window. */
export function adherence(
  log: DayLog,
  days: number,
  today: string,
): Adherence {
  const start = toEpochDay(today);
  let assignedDays = 0;
  let finishedDays = 0;
  let workedDays = 0;
  for (let i = 0; i < days; i++) {
    const day = fromEpochDay(start - i);
    if (!(day in log)) continue;
    const entry = entryFor(log, day);
    const status = dayStatus(entry, day, today);
    if (entry.assigned_new.length || entry.assigned_reviews.length) {
      assignedDays += 1;
      if (status === "complete") finishedDays += 1;
    }
    if (entry.done.length || entry.solved.length) workedDays += 1;
  }
  return {
    window: days,
    assigned_days: assignedDays,
    finished_days: finishedDays,
    worked_days: workedDays,
    rate: assignedDays ? finishedDays / assignedDays : 0.0,
  };
}

export function problemsDone(
  log: DayLog,
  today: string,
  days?: number,
): number {
  if (days === undefined) {
    return Object.values(log).reduce((n, e) => n + (e.done?.length ?? 0), 0);
  }
  const start = toEpochDay(today);
  let total = 0;
  for (let i = 0; i < days; i++) {
    total += entryFor(log, fromEpochDay(start - i)).done.length;
  }
  return total;
}
