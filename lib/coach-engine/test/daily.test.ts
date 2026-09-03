import { describe, expect, it } from "vitest";
import { buildPlan } from "../src/daily";
import { applyGrade, freshReviewState } from "../src/scheduler";
import { coachConfigSchema } from "../src/types";
import type { CoachConfig, Problem, ReviewState } from "../src/types";

const TODAY = "2026-09-03";

function problem(over: Partial<Problem> & { id: string; num: number }): Problem {
  return {
    title: over.id,
    slug: over.id,
    difficulty: "medium",
    neetcode_group: "Arrays & Hashing",
    patterns: ["hash-map"],
    company_freq: {},
    followups: [],
    siblings: [],
    ...over,
  };
}

function config(over: Partial<CoachConfig> = {}): CoachConfig {
  return { ...coachConfigSchema.parse({}), ...over };
}

/** A state due today: graded `grade` some days ago with a matching interval. */
function dueState(pid: string, grade: "pass" | "fail", daysAgo: number): ReviewState {
  const on = `2026-08-${String(31 - daysAgo + 3).padStart(2, "0")}`; // lands before TODAY
  let st = freshReviewState(pid);
  st = applyGrade(st, "pass", { on: "2026-08-01" }).next;
  st = applyGrade(st, grade, { on }).next;
  return st;
}

function bankOfNew(
  count: number,
  difficulty: Problem["difficulty"] = "medium",
): Record<string, Problem> {
  const out: Record<string, Problem> = {};
  for (let i = 1; i <= count; i++) {
    const id = `lc-${String(i).padStart(4, "0")}`;
    out[id] = problem({ id, num: i, difficulty });
  }
  return out;
}

describe("buildPlan", () => {
  it("assigns up to new_per_day new problems inside the budget", () => {
    const { plan, assignment } = buildPlan({
      problems: bankOfNew(10),
      reviews: {},
      config: config(),
      today: TODAY,
    });
    expect(plan.new).toHaveLength(2);
    expect(plan.reviews).toHaveLength(0);
    expect(plan.planned_minutes).toBe(56); // two mediums
    expect(assignment).toEqual({
      assigned_new: plan.new.map((i) => i.problem.id),
      assigned_reviews: [],
      planned_minutes: 56,
    });
  });

  it("caps reviews at 65% of the budget and reports deferrals", () => {
    // Six easy re-solve reviews (fail last time) at 12 min each against a
    // 60-min budget: ceiling is 39, so three fit (36), the rest defer, and
    // the remaining 24 minutes still take one easy new problem.
    const problems = bankOfNew(8, "easy");
    const reviews: Record<string, ReviewState> = {};
    for (let i = 1; i <= 6; i++) {
      const id = `lc-${String(i).padStart(4, "0")}`;
      reviews[id] = { ...dueState(id, "fail", 5), problem_id: id };
    }
    const { plan } = buildPlan({
      problems,
      reviews,
      config: config(),
      today: TODAY,
    });
    expect(plan.reviews).toHaveLength(3);
    expect(plan.reviews.every((r) => r.mode === "re-solve")).toBe(true);
    expect(plan.deferred_reviews).toBe(3);
    expect(plan.new.length).toBeGreaterThan(0); // backlog did not starve new
  });

  it("sprint mode is review-only when reviews fill the budget", () => {
    const problems = bankOfNew(8);
    const reviews: Record<string, ReviewState> = {};
    for (let i = 1; i <= 4; i++) {
      const id = `lc-${String(i).padStart(4, "0")}`;
      reviews[id] = { ...dueState(id, "fail", 5), problem_id: id };
    }
    const { plan } = buildPlan({
      problems,
      reviews,
      config: config({ interview_date: "2026-09-10" }),
      today: TODAY,
      minutes: 68, // exactly four 17-minute re-solves
    });
    expect(plan.sprint).toBe(true);
    expect(plan.sprint_days).toBe(7);
    expect(plan.reviews).toHaveLength(4);
    expect(plan.new).toHaveLength(0);
  });

  it("sprint is off outside the window", () => {
    const { plan } = buildPlan({
      problems: bankOfNew(3),
      reviews: {},
      config: config({ interview_date: "2026-12-01" }),
      today: TODAY,
    });
    expect(plan.sprint).toBe(false);
  });

  it("rebuilds from a frozen assignment instead of dealing fresh", () => {
    const problems = bankOfNew(10);
    const first = buildPlan({
      problems,
      reviews: {},
      config: config(),
      today: TODAY,
    });
    const frozenIds = first.plan.new.map((i) => i.problem.id);

    const again = buildPlan({
      problems,
      reviews: {},
      config: config(),
      today: TODAY,
      entry: {
        assigned_new: frozenIds,
        assigned_reviews: [],
        planned_minutes: 56,
        solved: [frozenIds[0]],
        done: [{ id: frozenIds[0], grade: "pass", mode: "grill" }],
      },
    });
    expect(again.assignment).toBeNull();
    expect(again.plan.new.map((i) => i.problem.id)).toEqual(frozenIds);
    expect(again.plan.new[0].done).toBe(true);
    expect(again.plan.new[0].grade).toBe("pass");
    expect(again.plan.new[1].done).toBe(false);
    expect(again.plan.solved_today).toBe(1);
  });

  it("reassign deals a fresh hand over a frozen entry", () => {
    const problems = bankOfNew(10);
    const { assignment } = buildPlan({
      problems,
      reviews: {},
      config: config(),
      today: TODAY,
      entry: {
        assigned_new: ["lc-0009", "lc-0010"],
        assigned_reviews: [],
        planned_minutes: 56,
        solved: [],
        done: [],
      },
      reassign: true,
    });
    expect(assignment).not.toBeNull();
  });

  it("stops adding new problems when under 15 minutes remain", () => {
    // 40-minute budget: one medium (28) leaves 12 — below the floor, so the
    // second new problem is not dealt even though new_per_day is 2.
    const { plan } = buildPlan({
      problems: bankOfNew(5),
      reviews: {},
      config: config(),
      today: TODAY,
      minutes: 40,
    });
    expect(plan.new).toHaveLength(1);
  });
});
