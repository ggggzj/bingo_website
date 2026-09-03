// Port of the day-log cases from AceLeetcode scripts/test_tracking.py.
// The analytics cases there (ungraded, knowledge_gaps, pattern_strength)
// belong to the analytics port in a later change, not to coach-engine.
import { describe, expect, it } from "vitest";
import { shiftDate } from "../src/dates";
import {
  adherence,
  dayStatus,
  markDone,
  markSolved,
  solvedIds,
  streak,
} from "../src/daylog";
import type { DayLogEntry, Grade } from "../src/types";

const TODAY = "2026-08-23";

function day(offset: number): string {
  return shiftDate(TODAY, offset);
}

function entry(opts: {
  assigned?: string[];
  done?: string[];
  reviews?: string[];
  solved?: string[];
}): DayLogEntry {
  return {
    assigned_new: opts.assigned ?? [],
    assigned_reviews: opts.reviews ?? [],
    planned_minutes: 48,
    solved: opts.solved ?? [],
    done: (opts.done ?? []).map((pid) => ({
      id: pid,
      grade: "pass" as Grade,
      mode: "grill",
    })),
  };
}

describe("dayStatus", () => {
  it("a finished day is complete", () => {
    const e = entry({ assigned: ["a", "b"], done: ["a", "b"] });
    expect(dayStatus(e, day(-1), TODAY)).toBe("complete");
  });

  it("an unfinished past day is a miss", () => {
    expect(dayStatus(entry({ assigned: ["a", "b"] }), day(-1), TODAY)).toBe(
      "missed",
    );
    expect(
      dayStatus(entry({ assigned: ["a", "b"], done: ["a"] }), day(-1), TODAY),
    ).toBe("partial");
  });

  it("today is not a miss until it is over", () => {
    expect(dayStatus(entry({ assigned: ["a", "b"] }), day(0), TODAY)).toBe(
      "pending",
    );
    expect(
      dayStatus(entry({ assigned: ["a", "b"], done: ["a"] }), day(0), TODAY),
    ).toBe("partial");
  });

  it("solved without a grade is its own state", () => {
    const e = entry({ assigned: ["a", "b"], solved: ["a", "b"] });
    expect(dayStatus(e, day(-1), TODAY)).toBe("ungraded");
    expect(dayStatus(e, day(0), TODAY)).toBe("partial"); // today, in progress
    expect(streak({ [day(-1)]: e }, TODAY)).toBe(0); // never counts
  });

  it("grading a problem implies it was solved", () => {
    const e = entry({ assigned: ["a"], done: ["a"] });
    expect(solvedIds(e)).toEqual(["a"]);
    expect(dayStatus(e, day(-1), TODAY)).toBe("complete");
  });

  it("unplanned work still counts", () => {
    expect(dayStatus(entry({ done: ["a"] }), day(-1), TODAY)).toBe("extra");
    expect(dayStatus(entry({}), day(-1), TODAY)).toBe("rest");
  });
});

describe("streak", () => {
  it("survives an unfinished today", () => {
    const log = {
      [day(0)]: entry({ assigned: ["e"] }), // started, not finished
      [day(-1)]: entry({ assigned: ["c", "d"], done: ["c", "d"] }),
      [day(-2)]: entry({ assigned: ["a", "b"], done: ["a", "b"] }),
    };
    expect(streak(log, TODAY)).toBe(2);
  });

  it("breaks on a skipped day", () => {
    const log = {
      [day(0)]: entry({ assigned: ["f"], done: ["f"] }),
      [day(-1)]: entry({ assigned: ["d", "e"] }), // missed
      [day(-2)]: entry({ assigned: ["a"], done: ["a"] }),
    };
    expect(streak(log, TODAY)).toBe(1);
  });
});

describe("adherence", () => {
  it("counts only assigned days", () => {
    const log = {
      [day(0)]: entry({ assigned: ["d"], done: ["d"] }),
      [day(-1)]: entry({ assigned: ["b", "c"], done: ["b"] }), // partial
      [day(-2)]: entry({ done: ["x"] }), // unplanned, not an assigned day
    };
    const ad = adherence(log, 30, TODAY);
    expect(ad.assigned_days).toBe(2);
    expect(ad.finished_days).toBe(1);
    expect(ad.worked_days).toBe(3);
    expect(ad.rate).toBeCloseTo(0.5, 9);
  });
});

describe("entry transformers", () => {
  it("markDone implies solved and overwrites a same-day regrade", () => {
    let e = entry({ assigned: ["a"] });
    e = markDone(e, "a", "partial", "grill");
    expect(e.solved).toContain("a");
    e = markDone(e, "a", "pass", "grill");
    expect(e.done).toEqual([{ id: "a", grade: "pass", mode: "grill" }]);
  });

  it("markSolved refuses to un-solve a graded problem", () => {
    let e = entry({ assigned: ["a"] });
    e = markDone(e, "a", "pass", "grill");
    expect(() => markSolved(e, "a", false)).toThrow(/graded today/);
  });

  it("markSolved keeps assigned order first, extras sorted after", () => {
    let e = entry({ assigned: ["b", "a"] });
    e = markSolved(e, "z");
    e = markSolved(e, "a");
    expect(e.solved).toEqual(["a", "z"]);
    e = markSolved(e, "b");
    expect(e.solved).toEqual(["b", "a", "z"]);
  });
});
