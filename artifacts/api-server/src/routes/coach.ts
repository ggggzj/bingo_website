/**
 * The interview coach's HTTP surface. Every route sits behind the allowlist
 * gate (uniform 404); the scheduling itself is @workspace/coach-engine —
 * pure functions these handlers feed with rows and persist results from.
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";

import {
  GRADES,
  applyGrade,
  adherence,
  blankEntry,
  buildPlan,
  dayStatus,
  entryFor,
  freshReviewState,
  fromEpochDay,
  markDone,
  markSolved,
  reviewCost,
  streak,
  toEpochDay,
} from "@workspace/coach-engine";
import type {
  CoachConfig,
  DayLog,
  DayLogEntry,
  Plan,
  Problem,
  ReviewState,
} from "@workspace/coach-engine";

import { isCoachUser } from "../lib/auth/coach";
import { hashToken, newSessionToken } from "../lib/auth/session";
import type { AuthStore } from "../lib/auth/store";
import { COACH_USER, coachGate } from "../lib/coach/auth";
import type { CoachStore, CoachUser } from "../lib/coach/store";
import { currentUser } from "./auth";

/** Plans live on UTC days, end to end, so a plan built at 23:59 local never
 * lands on the wrong row. */
function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

const NOT_FOUND = { error: "Not found" };

const solvedInput = z.object({
  problemId: z.string().min(1),
  solved: z.boolean(),
});

const gradeInput = z.object({
  problemId: z.string().min(1),
  grade: z.enum(GRADES),
  weakPoints: z.array(z.string().min(1).max(300)).max(6).optional(),
  mode: z.enum(["grill", "re-solve"]).optional(),
  notes: z.string().max(2000).optional(),
});

const configInput = z
  .object({
    dailyMinutes: z.number().int().min(15).max(480),
    newPerDay: z.number().int().min(0).max(10),
    sprintWindowDays: z.number().int().min(1).max(60),
    interviewDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable(),
    targetCompanies: z.array(z.string().min(1).max(40)).max(20),
  })
  .partial()
  .strict();

function problemSummary(p: Problem) {
  return {
    id: p.id,
    num: p.num,
    title: p.title,
    slug: p.slug,
    difficulty: p.difficulty,
    patterns: p.patterns,
    neetcodeGroup: p.neetcode_group,
  };
}

function serializePlan(plan: Plan) {
  return {
    date: plan.date,
    budget: plan.budget,
    plannedMinutes: plan.planned_minutes,
    reviews: plan.reviews.map((i) => ({
      problem: problemSummary(i.problem),
      mode: i.mode,
      minutes: i.minutes,
      risk: i.risk,
      daysOverdue: i.days_overdue,
      weakPoints: i.state.weak_points,
      done: i.done ?? false,
      solved: i.solved ?? false,
      grade: i.grade ?? null,
    })),
    new: plan.new.map((i) => ({
      problem: problemSummary(i.problem),
      minutes: i.minutes,
      score: i.score,
      done: i.done ?? false,
      solved: i.solved ?? false,
      grade: i.grade ?? null,
    })),
    deferredReviews: plan.deferred_reviews,
    sprint: plan.sprint,
    sprintDays: plan.sprint_days,
    totalSeen: plan.total_seen,
    totalProblems: plan.total_problems,
    doneToday: plan.done_today,
    solvedToday: plan.solved_today,
    assignedToday: plan.assigned_today,
  };
}

function serializeConfig(
  cfg: CoachConfig,
  problems: Record<string, Problem>,
) {
  // The roster is data, not code: every company the bank carries frequency
  // data for, so a bank refresh reaches the settings page with no client
  // change.
  const known = new Set<string>();
  for (const p of Object.values(problems)) {
    for (const company of Object.keys(p.company_freq)) known.add(company);
  }
  return {
    dailyMinutes: cfg.daily_minutes,
    newPerDay: cfg.new_per_day,
    sprintWindowDays: cfg.sprint_window_days,
    interviewDate: cfg.interview_date,
    targetCompanies: cfg.target_companies,
    knownCompanies: [...known].sort(),
  };
}

export function createCoachRouter(
  authStore: AuthStore,
  store: CoachStore,
): IRouter {
  const router: IRouter = Router();

  /**
   * Token issuance takes the session cookie only — never a bearer token —
   * so a stolen token cannot mint its own successor. It sits in front of
   * the shared gate on purpose.
   */
  router.post("/token", async (req: Request, res: Response) => {
    let signedIn;
    try {
      signedIn = await currentUser(authStore, req);
    } catch (err) {
      req.log?.error({ err }, "Failed to read session");
      res.status(500).json({ error: "Internal server error" });
      return;
    }
    if (!signedIn || !isCoachUser(signedIn.email)) {
      res.status(404).json(NOT_FOUND);
      return;
    }
    const token = newSessionToken();
    await store.createToken(signedIn.id, hashToken(token));
    res.status(201).json({ token });
  });

  router.use(coachGate(authStore, store));

  const user = (res: Response): CoachUser => res.locals[COACH_USER] as CoachUser;

  router.delete("/token", async (_req, res) => {
    await store.revokeTokens(user(res).id);
    res.json({ ok: true });
  });

  router.get("/plan", async (req, res) => {
    const { id } = user(res);
    const today = utcToday();
    try {
      const [problems, reviews, config, entry] = await Promise.all([
        store.loadProblems(),
        store.loadReviews(id),
        store.getConfig(id),
        store.getDayEntry(id, today),
      ]);
      let { plan, assignment } = buildPlan({
        problems,
        reviews,
        config,
        today,
        entry,
      });
      if (assignment) {
        const frozen = await store.freezeDay(id, today, {
          ...blankEntry(),
          ...(entry ?? {}),
          assigned_new: assignment.assigned_new,
          assigned_reviews: assignment.assigned_reviews,
          planned_minutes: assignment.planned_minutes,
        });
        // A racing first call may have won the freeze with a different deal;
        // whatever is in the row is the day's truth, so rebuild from it.
        ({ plan } = buildPlan({
          problems,
          reviews,
          config,
          today,
          entry: frozen,
        }));
      }
      res.json(serializePlan(plan));
    } catch (err) {
      req.log?.error({ err }, "Failed to build the plan");
      res.status(500).json({ error: "Internal server error" });
    }
  });

  router.post("/solved", async (req, res) => {
    const parsed = solvedInput.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ error: "Invalid body" });
      return;
    }
    const { id } = user(res);
    const { problemId, solved } = parsed.data;
    try {
      const problems = await store.loadProblems();
      if (!(problemId in problems)) {
        res.status(422).json({ error: "Unknown problem" });
        return;
      }
      const today = utcToday();
      const entry = (await store.getDayEntry(id, today)) ?? blankEntry();
      let next: DayLogEntry;
      try {
        next = markSolved(entry, problemId, solved);
      } catch {
        res
          .status(409)
          .json({ error: "Graded today; a grade cannot be un-ticked" });
        return;
      }
      await store.putDayEntry(id, today, next);
      res.json({ ok: true });
    } catch (err) {
      req.log?.error({ err }, "Failed to record solved");
      res.status(500).json({ error: "Internal server error" });
    }
  });

  router.post("/grade", async (req, res) => {
    const parsed = gradeInput.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ error: "Invalid body" });
      return;
    }
    const { id } = user(res);
    const { problemId, grade, weakPoints, mode, notes } = parsed.data;
    try {
      const problems = await store.loadProblems();
      if (!(problemId in problems)) {
        res.status(422).json({ error: "Unknown problem" });
        return;
      }
      const today = utcToday();
      const current =
        (await store.getReview(id, problemId)) ?? freshReviewState(problemId);
      const { next, event } = applyGrade(current, grade, {
        on: today,
        mode: mode ?? "grill",
        weakPoints,
        notes: notes ?? "",
      });
      const entry = markDone(
        (await store.getDayEntry(id, today)) ?? blankEntry(),
        problemId,
        grade,
        mode ?? "grill",
      );
      await store.saveGrade(id, next, event, today, entry);
      res.json({
        problemId,
        state: next.state,
        intervalDays: next.interval_days,
        due: next.due,
        lapses: next.lapses,
        weakPoints: next.weak_points,
      });
    } catch (err) {
      req.log?.error({ err }, "Failed to record grade");
      res.status(500).json({ error: "Internal server error" });
    }
  });

  router.get("/forecast", async (req, res) => {
    const { id } = user(res);
    const days = boundedQuery(req, "days", 14, 1, 60);
    try {
      const [problems, reviews] = await Promise.all([
        store.loadProblems(),
        store.loadReviews(id),
      ]);
      const today = utcToday();
      const start = toEpochDay(today);
      const buckets = new Map<string, { count: number; minutes: number }>();
      for (const st of Object.values(reviews) as ReviewState[]) {
        if (!st.due) continue;
        // Overdue work lands on today: it is today's load, not the past's.
        const bucketDay = st.due < today ? today : st.due;
        const offset = toEpochDay(bucketDay) - start;
        if (offset >= days) continue;
        const problem = problems[st.problem_id];
        if (!problem) continue;
        const bucket = buckets.get(bucketDay) ?? { count: 0, minutes: 0 };
        bucket.count += 1;
        bucket.minutes += reviewCost(st, problem);
        buckets.set(bucketDay, bucket);
      }
      const series = Array.from({ length: days }, (_, i) => {
        const date = fromEpochDay(start + i);
        const bucket = buckets.get(date) ?? { count: 0, minutes: 0 };
        return { date, ...bucket };
      });
      res.json({ days: series });
    } catch (err) {
      req.log?.error({ err }, "Failed to build the forecast");
      res.status(500).json({ error: "Internal server error" });
    }
  });

  router.get("/log", async (req, res) => {
    const { id } = user(res);
    const days = boundedQuery(req, "days", 91, 1, 366);
    try {
      const today = utcToday();
      const log: DayLog = await store.loadDayLog(id, today, days);
      const start = toEpochDay(today) - (days - 1);
      const series = Array.from({ length: days }, (_, i) => {
        const day = fromEpochDay(start + i);
        const entry = entryFor(log, day);
        return {
          day,
          status: dayStatus(entry, day, today),
          assignedNew: entry.assigned_new,
          assignedReviews: entry.assigned_reviews,
          plannedMinutes: entry.planned_minutes,
          solved: entry.solved,
          done: entry.done,
        };
      });
      res.json({
        days: series,
        streak: streak(log, today),
        adherence: serializeAdherence(adherence(log, 30, today)),
      });
    } catch (err) {
      req.log?.error({ err }, "Failed to load the log");
      res.status(500).json({ error: "Internal server error" });
    }
  });

  router.get("/config", async (req, res) => {
    try {
      const [cfg, problems] = await Promise.all([
        store.getConfig(user(res).id),
        store.loadProblems(),
      ]);
      res.json(serializeConfig(cfg, problems));
    } catch (err) {
      req.log?.error({ err }, "Failed to load config");
      res.status(500).json({ error: "Internal server error" });
    }
  });

  router.put("/config", async (req, res) => {
    const parsed = configInput.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ error: "Invalid settings" });
      return;
    }
    const { id } = user(res);
    try {
      const current = await store.getConfig(id);
      const patch = parsed.data;
      const next: CoachConfig = {
        daily_minutes: patch.dailyMinutes ?? current.daily_minutes,
        new_per_day: patch.newPerDay ?? current.new_per_day,
        sprint_window_days:
          patch.sprintWindowDays ?? current.sprint_window_days,
        interview_date:
          patch.interviewDate !== undefined
            ? patch.interviewDate
            : current.interview_date,
        target_companies: patch.targetCompanies ?? current.target_companies,
      };
      const [saved, problems] = await Promise.all([
        store.putConfig(id, next),
        store.loadProblems(),
      ]);
      res.json(serializeConfig(saved, problems));
    } catch (err) {
      req.log?.error({ err }, "Failed to update config");
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}

function boundedQuery(
  req: Request,
  name: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const raw = req.query[name];
  if (typeof raw !== "string") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) return fallback;
  return value;
}

function serializeAdherence(a: ReturnType<typeof adherence>) {
  return {
    window: a.window,
    assignedDays: a.assigned_days,
    finishedDays: a.finished_days,
    workedDays: a.worked_days,
    rate: a.rate,
  };
}
