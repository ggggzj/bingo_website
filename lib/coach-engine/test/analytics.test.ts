// Ported from the behavior of AceLeetcode scripts/analytics.py, with the
// cases named by the coach-insights spec.
import { describe, expect, it } from "vitest";
import {
  guidance,
  knowledgeGaps,
  leeches,
  overview,
  patternStrength,
  ungraded,
  type EventsByProblem,
} from "../src/analytics";
import { applyGrade, freshReviewState } from "../src/scheduler";
import { coachConfigSchema } from "../src/types";
import type {
  CoachConfig,
  DayLog,
  DayLogEntry,
  Problem,
  ReviewEvent,
  ReviewState,
} from "../src/types";

const TODAY = "2026-09-09";

function problem(
  over: Partial<Problem> & { id: string; num: number },
): Problem {
  return {
    title: `Problem ${over.num}`,
    slug: `problem-${over.num}`,
    difficulty: "medium",
    neetcode_group: "Arrays & Hashing",
    patterns: ["hash-map"],
    company_freq: {},
    followups: [],
    siblings: [],
    ...over,
  };
}

const bank = (...ps: Problem[]) => Object.fromEntries(ps.map((p) => [p.id, p]));
const config = (over: Partial<CoachConfig> = {}): CoachConfig => ({
  ...coachConfigSchema.parse({}),
  ...over,
});

function entry(over: Partial<DayLogEntry> = {}): DayLogEntry {
  return {
    assigned_new: [],
    assigned_reviews: [],
    planned_minutes: 0,
    solved: [],
    done: [],
    ...over,
  };
}

/** Grade a problem repeatedly, collecting state and events like the API does. */
function graded(
  pid: string,
  steps: Array<{ grade: "pass" | "partial" | "fail"; on: string; weak?: string[] }>,
): { state: ReviewState; events: ReviewEvent[] } {
  let state = freshReviewState(pid);
  const events: ReviewEvent[] = [];
  for (const step of steps) {
    const res = applyGrade(state, step.grade, {
      on: step.on,
      weakPoints: step.weak,
    });
    state = res.next;
    events.push(res.event);
  }
  return { state, events };
}

describe("knowledgeGaps", () => {
  it("orders a repeated gap ahead of a fresh one", () => {
    const a = graded("lc-0001", [
      { grade: "partial", on: "2026-09-01", weak: ["amortized argument"] },
      { grade: "partial", on: "2026-09-04", weak: ["amortized argument"] },
    ]);
    const b = graded("lc-0002", [
      { grade: "partial", on: "2026-09-05", weak: ["k > n edge case"] },
    ]);
    const gaps = knowledgeGaps(
      bank(problem({ id: "lc-0001", num: 1 }), problem({ id: "lc-0002", num: 2 })),
      { "lc-0001": a.state, "lc-0002": b.state },
      { "lc-0001": a.events, "lc-0002": b.events },
    );
    expect(gaps.open.map((g) => g.point)).toEqual([
      "amortized argument",
      "k > n edge case",
    ]);
    expect(gaps.open[0].hits).toBe(2);
  });

  it("moves a point to cleared when a clean pass clears it", () => {
    const g = graded("lc-0001", [
      { grade: "partial", on: "2026-09-01", weak: ["invariant"] },
      { grade: "pass", on: "2026-09-02" },
    ]);
    const gaps = knowledgeGaps(
      bank(problem({ id: "lc-0001", num: 1 })),
      { "lc-0001": g.state },
      { "lc-0001": g.events },
    );
    expect(gaps.open).toEqual([]);
    expect(gaps.cleared.map((c) => c.point)).toEqual(["invariant"]);
  });
});

describe("patternStrength", () => {
  it("penalizes lapses", () => {
    const solid = graded("lc-0001", [
      { grade: "pass", on: "2026-09-01" },
      { grade: "pass", on: "2026-09-02" },
      { grade: "pass", on: "2026-09-05" },
    ]);
    const shaky = graded("lc-0002", [
      { grade: "pass", on: "2026-09-01" },
      { grade: "pass", on: "2026-09-02" },
      { grade: "pass", on: "2026-09-05" },
      { grade: "fail", on: "2026-09-06" },
      { grade: "pass", on: "2026-09-07" },
      { grade: "pass", on: "2026-09-08" },
    ]);
    const rows = patternStrength(
      bank(
        problem({ id: "lc-0001", num: 1, patterns: ["binary-search"] }),
        problem({ id: "lc-0002", num: 2, patterns: ["monotonic-deque"] }),
      ),
      { "lc-0001": solid.state, "lc-0002": shaky.state },
    );
    const by = Object.fromEntries(rows.map((r) => [r.pattern, r]));
    expect(by["binary-search"].strength).toBeGreaterThan(
      by["monotonic-deque"].strength,
    );
    expect(by["monotonic-deque"].lapses).toBe(1);
  });

  it("caps confidence at one third for a single seen problem", () => {
    const g = graded("lc-0001", [{ grade: "pass", on: "2026-09-01" }]);
    const rows = patternStrength(
      bank(
        problem({ id: "lc-0001", num: 1, patterns: ["trie"] }),
        problem({ id: "lc-0002", num: 2, patterns: ["trie"] }),
      ),
      { "lc-0001": g.state },
    );
    expect(rows[0]).toMatchObject({ pattern: "trie", seen: 1, total: 2 });
    expect(rows[0].confidence).toBeCloseTo(1 / 3, 10);
  });
});

describe("ungraded", () => {
  it("lists the oldest solved-but-never-graded problem first", () => {
    const log: DayLog = {
      "2026-09-06": entry({ assigned_new: ["lc-0001"], solved: ["lc-0001"] }),
      "2026-09-09": entry({ assigned_new: ["lc-0002"], solved: ["lc-0002"] }),
    };
    const rows = ungraded(
      bank(problem({ id: "lc-0001", num: 1 }), problem({ id: "lc-0002", num: 2 })),
      {},
      log,
      TODAY,
    );
    expect(rows.map((r) => r.problem.num)).toEqual([1, 2]);
    expect(rows[0].days_ago).toBe(3);
  });

  it("ignores problems that were graded", () => {
    const g = graded("lc-0001", [{ grade: "pass", on: "2026-09-06" }]);
    const log: DayLog = {
      "2026-09-06": entry({ assigned_new: ["lc-0001"], solved: ["lc-0001"] }),
    };
    expect(
      ungraded(bank(problem({ id: "lc-0001", num: 1 })), { "lc-0001": g.state }, log, TODAY),
    ).toEqual([]);
  });
});

describe("guidance", () => {
  const noEvents: EventsByProblem = {};

  it("leads with overdue reviews, naming the worst", () => {
    // Graded a while ago with a short interval: overdue by the time TODAY comes.
    const g = graded("lc-0239", [{ grade: "pass", on: "2026-09-01" }]);
    const items = guidance(
      bank(problem({ id: "lc-0239", num: 239 })),
      { "lc-0239": g.state },
      { "lc-0239": g.events },
      {},
      config(),
      TODAY,
    );
    expect(items[0].title).toMatch(/overdue review/);
    expect(items[0].body).toContain("LC 239");
    expect(items[0].tone).toBe("critical");
  });

  it("tells a fresh account how the ladder starts", () => {
    const items = guidance(
      bank(problem({ id: "lc-0001", num: 1 })),
      {},
      noEvents,
      {},
      config(),
      TODAY,
    );
    const ladder = items.find((i) => i.title.includes("ladder starts"));
    expect(ladder).toBeDefined();
    expect(ladder!.body).toContain("1 day, then 3, then 7");
  });

  it("chases the solved-but-ungraded backlog by name", () => {
    const log: DayLog = {
      "2026-09-06": entry({ assigned_new: ["lc-0001"], solved: ["lc-0001"] }),
    };
    const items = guidance(
      bank(problem({ id: "lc-0001", num: 1 })),
      {},
      noEvents,
      log,
      config(),
      TODAY,
    );
    const stale = items.find((i) => i.title.includes("never grilled"));
    expect(stale).toBeDefined();
    expect(stale!.body).toContain("LC 1");
    expect(stale!.title).toContain("3 days old");
  });

  it("warns about a leech instead of scheduling more repetitions", () => {
    const g = graded("lc-0239", [
      { grade: "pass", on: "2026-09-01" },
      { grade: "fail", on: "2026-09-02" },
      { grade: "fail", on: "2026-09-03" },
    ]);
    const items = guidance(
      bank(problem({ id: "lc-0239", num: 239 })),
      { "lc-0239": g.state },
      { "lc-0239": g.events },
      {},
      config(),
      TODAY,
    );
    expect(leeches(bank(problem({ id: "lc-0239", num: 239 })), { "lc-0239": g.state })).toHaveLength(1);
    expect(items.some((i) => i.title.includes("collapsed"))).toBe(true);
  });
});

describe("overview", () => {
  it("counts today's assignment against what was graded", () => {
    const g = graded("lc-0001", [{ grade: "pass", on: TODAY }]);
    const log: DayLog = {
      [TODAY]: entry({
        assigned_new: ["lc-0001", "lc-0002"],
        solved: ["lc-0001", "lc-0002"],
        done: [{ id: "lc-0001", grade: "pass", mode: "grill" }],
      }),
    };
    const ov = overview(
      bank(problem({ id: "lc-0001", num: 1 }), problem({ id: "lc-0002", num: 2 })),
      { "lc-0001": g.state },
      log,
      config(),
      TODAY,
    );
    expect(ov).toMatchObject({
      today_assigned: 2,
      today_done: 1,
      today_solved: 2,
      today_status: "partial",
      seen: 1,
      bank: 2,
    });
  });
});
