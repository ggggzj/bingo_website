// Port of AceLeetcode scripts/test_scheduler.py, adapted to the
// non-mutating applyGrade signature.
import { describe, expect, it } from "vitest";
import {
  LEARNING_STEPS,
  MASTERED_THRESHOLD,
  applyGrade,
  freshReviewState,
  isDue,
  retentionRisk,
  serializeReviewState,
} from "../src/scheduler";
import type { Grade, ReviewState } from "../src/types";

const D0 = "2026-08-20";

function grade(
  st: ReviewState,
  g: Grade,
  on: string = D0,
  weakPoints?: string[],
): ReviewState {
  return applyGrade(st, g, { on, weakPoints }).next;
}

describe("scheduler", () => {
  it("climbs the learning ladder on consecutive passes", () => {
    let st = freshReviewState("lc-0239");
    for (const expected of LEARNING_STEPS) {
      st = grade(st, "pass");
      expect(st.interval_days).toBe(expected);
    }
    expect(st.state).toBe("review");
  });

  it("fail resets to one day", () => {
    let st = freshReviewState("lc-0239");
    for (let i = 0; i < 6; i++) st = grade(st, "pass");
    expect(st.interval_days).toBeGreaterThan(7);
    st = grade(st, "fail", D0, ["cannot justify the invariant"]);
    expect(st.interval_days).toBe(1);
    expect(st.state).toBe("learning");
    expect(st.lapses).toBe(1);
    expect(st.due).toBe("2026-08-21");
  });

  it("partial grows slower than pass", () => {
    let a = freshReviewState("a");
    let b = freshReviewState("b");
    for (let i = 0; i < 3; i++) {
      a = grade(a, "pass");
      b = grade(b, "pass");
    }
    a = grade(a, "pass");
    b = grade(b, "partial");
    expect(a.interval_days).toBeGreaterThan(b.interval_days);
  });

  it("reaches mastered", () => {
    let st = freshReviewState("lc-0239");
    for (let i = 0; i < 12; i++) st = grade(st, "pass");
    expect(st.interval_days).toBeGreaterThanOrEqual(MASTERED_THRESHOLD);
    expect(st.state).toBe("mastered");
  });

  it("weak points persist then clear on a clean pass", () => {
    let st = freshReviewState("lc-0239");
    st = grade(st, "partial", D0, ["amortized argument"]);
    expect(st.weak_points).toEqual(["amortized argument"]);
    st = grade(st, "partial", D0, ["k > n edge case"]);
    expect(st.weak_points).toEqual(["k > n edge case", "amortized argument"]);
    st = grade(st, "pass");
    expect(st.weak_points).toEqual([]);
  });

  it("risk prioritises the most forgotten", () => {
    let old = freshReviewState("lc-0001");
    old = grade(old, "pass", "2026-07-01");
    old = grade(old, "pass", "2026-07-02"); // short interval, long overdue

    let recent = freshReviewState("lc-0002");
    for (let i = 0; i < 8; i++) recent = grade(recent, "pass", "2026-08-01");

    expect(retentionRisk(old, D0)).toBeGreaterThan(retentionRisk(recent, D0));
  });

  it("serialization round-trips", () => {
    let st = freshReviewState("lc-0239");
    st = grade(st, "partial", D0, ["deque vs heap trade-off"]);
    const dict = serializeReviewState(st);
    const clone: ReviewState = { problem_id: "lc-0239", ...dict };
    expect(serializeReviewState(clone)).toEqual(dict);
  });

  it("is not due before the date", () => {
    let st = freshReviewState("lc-0239");
    st = grade(st, "pass"); // due 2026-08-21
    expect(isDue(st, D0)).toBe(false);
    expect(isDue(st, "2026-08-21")).toBe(true);
  });

  it("records one event per grading with the failed points", () => {
    const st = freshReviewState("lc-0239");
    const { next, event } = applyGrade(st, "partial", {
      on: D0,
      weakPoints: ["amortized argument"],
      notes: "needed a nudge",
    });
    expect(event).toEqual({
      date: D0,
      mode: "grill",
      grade: "partial",
      interval_days: next.interval_days,
      failed_on: ["amortized argument"],
      notes: "needed a nudge",
    });
  });

  it("clamps ease at both ends", () => {
    let st = freshReviewState("lc-0239");
    for (let i = 0; i < 10; i++) st = grade(st, "fail");
    expect(st.ease).toBeCloseTo(1.3, 10);
    let up = freshReviewState("lc-0001");
    for (let i = 0; i < 12; i++) up = grade(up, "pass");
    expect(up.ease).toBeLessThanOrEqual(3.2);
  });
});
