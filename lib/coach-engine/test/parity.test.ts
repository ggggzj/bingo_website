/**
 * Parity suite: replays the golden fixtures produced by the reference Python
 * engine (fixtures/generate.py) through the TypeScript port and asserts deep
 * equality — zero tolerance, no approximate matchers. A mismatch here is a
 * defect in the port, not acceptable drift.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildPlan } from "../src/daily";
import { adherence, dayStatus, entryFor, streak } from "../src/daylog";
import {
  applyGrade,
  freshReviewState,
  serializeReviewState,
} from "../src/scheduler";
import { rankNewProblems } from "../src/selector";
import type {
  CoachConfig,
  DayLog,
  Grade,
  NewItem,
  Plan,
  Problem,
  ReviewItem,
  ReviewState,
} from "../src/types";

const FIXTURES = join(__dirname, "..", "fixtures");

function load<T>(name: string): T {
  return JSON.parse(readFileSync(join(FIXTURES, `${name}.json`), "utf-8")) as T;
}

/** Python's ReviewState.from_dict: a partial raw dict over fresh defaults. */
function fromDict(pid: string, raw: Partial<ReviewState>): ReviewState {
  return { ...freshReviewState(pid), ...raw, problem_id: pid };
}

function convertReviews(
  raw: Record<string, Partial<ReviewState>>,
): Record<string, ReviewState> {
  return Object.fromEntries(
    Object.entries(raw).map(([pid, r]) => [pid, fromDict(pid, r)]),
  );
}

const bank = load<{ problems: Record<string, Problem> }>("bank").problems;

describe("parity: grading", () => {
  interface GradingStep {
    on: string;
    grade: Grade;
    weak_points: string[];
    state: Record<string, unknown>;
    event: Record<string, unknown>;
  }
  const { scenarios } = load<{
    scenarios: Array<{
      name: string;
      start: Partial<ReviewState> | null;
      steps: GradingStep[];
    }>;
  }>("grading");

  for (const sc of scenarios) {
    it(sc.name, () => {
      let st = sc.start
        ? fromDict("lc-x", sc.start)
        : freshReviewState("lc-x");
      for (const step of sc.steps) {
        const { next, event } = applyGrade(st, step.grade, {
          on: step.on,
          weakPoints: step.weak_points,
        });
        expect(serializeReviewState(next)).toEqual(step.state);
        expect(event).toEqual(step.event);
        st = next;
      }
    });
  }
});

describe("parity: ranking", () => {
  const fx = load<{
    reviews: Record<string, Partial<ReviewState>>;
    cases: Array<{
      name: string;
      companies: string[];
      sprint: boolean;
      fresh: boolean;
      ranked: Array<{ id: string; score: number }>;
    }>;
  }>("ranking");
  const reviews = convertReviews(fx.reviews);

  for (const c of fx.cases) {
    it(c.name, () => {
      const ranked = rankNewProblems(bank, c.fresh ? {} : reviews, c.companies, {
        sprint: c.sprint,
      });
      expect(
        ranked.map((r) => ({ id: r.problem.id, score: r.score })),
      ).toEqual(c.ranked);
    });
  }
});

describe("parity: plans", () => {
  interface ComparablePlan extends Omit<Plan, "reviews" | "new"> {
    reviews: Array<Record<string, unknown>>;
    new: Array<Record<string, unknown>>;
  }
  const fx = load<{
    cases: Array<{
      name: string;
      config: CoachConfig;
      reviews: Record<string, Partial<ReviewState>>;
      minutes: number | null;
      ref: string;
      frozen_script: Array<[string, string] | [string, string, string]>;
      entries: Array<Record<string, unknown>>;
      plans: ComparablePlan[];
    }>;
  }>("plans");

  function comparable(plan: Plan): ComparablePlan {
    const strip = (i: ReviewItem | NewItem) => {
      const { problem, ...rest } = i as ReviewItem & { state?: unknown };
      delete (rest as { state?: unknown }).state;
      return { id: problem.id, ...rest };
    };
    return {
      ...plan,
      reviews: plan.reviews.map(strip),
      new: plan.new.map(strip),
    };
  }

  for (const c of fx.cases) {
    it(c.name, () => {
      const reviews = convertReviews(c.reviews);
      const minutes = c.minutes ?? undefined;

      const first = buildPlan({
        problems: bank,
        reviews,
        config: c.config,
        today: c.ref,
        entry: null,
        minutes,
      });
      expect(first.assignment).not.toBeNull();
      expect(comparable(first.plan)).toEqual(c.plans[0]);

      if (c.plans.length > 1) {
        // entries[1] is the day-log row as it stood before the second build:
        // the frozen assignment plus the scripted solved/graded marks.
        const second = buildPlan({
          problems: bank,
          reviews,
          config: c.config,
          today: c.ref,
          entry: c.entries[1] as never,
          minutes,
        });
        expect(second.assignment).toBeNull();
        expect(comparable(second.plan)).toEqual(c.plans[1]);
      }
    });
  }
});

describe("parity: daylog", () => {
  const fx = load<{
    ref: string;
    logs: Record<
      string,
      {
        log: DayLog;
        statuses: Record<string, string>;
        streak: number;
        adherence: Record<string, number>;
      }
    >;
  }>("daylog");

  for (const [name, data] of Object.entries(fx.logs)) {
    it(name, () => {
      for (const [day, expected] of Object.entries(data.statuses)) {
        expect(dayStatus(entryFor(data.log, day), day, fx.ref)).toBe(expected);
      }
      expect(streak(data.log, fx.ref)).toBe(data.streak);
      expect(adherence(data.log, 30, fx.ref)).toEqual(data.adherence);
    });
  }
});
