import { describe, expect, it } from "vitest";
import {
  companyDemand,
  estimateMinutes,
  pickSibling,
  patternStats,
  rankNewProblems,
} from "../src/selector";
import { applyGrade, freshReviewState } from "../src/scheduler";
import type { Problem, ReviewState } from "../src/types";

const D0 = "2026-08-20";

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

function bank(...ps: Problem[]): Record<string, Problem> {
  return Object.fromEntries(ps.map((p) => [p.id, p]));
}

/** A review state that has passed enough to count as solid for its pattern. */
function solidState(pid: string): ReviewState {
  let st = freshReviewState(pid);
  for (let i = 0; i < 3; i++) st = applyGrade(st, "pass", { on: D0 }).next;
  return st; // state: review, last_grade: pass
}

describe("companyDemand", () => {
  it("defaults to 0.3 with no frequency data", () => {
    expect(companyDemand(problem({ id: "a", num: 1 }), ["google"])).toBe(0.3);
  });

  it("blends mean and max over target companies", () => {
    const p = problem({
      id: "a",
      num: 1,
      company_freq: { google: 0.9, meta: 0.1 },
    });
    const demand = companyDemand(p, ["google", "meta"]);
    expect(demand).toBeCloseTo(0.65 * 0.5 + 0.35 * 0.9, 10);
  });

  it("treats a missing target company as zero frequency", () => {
    const p = problem({ id: "a", num: 1, company_freq: { google: 0.8 } });
    const demand = companyDemand(p, ["amazon"]);
    expect(demand).toBeCloseTo(0.65 * 0 + 0.35 * 0, 10);
  });
});

describe("hard lock", () => {
  const hard = problem({
    id: "lc-0239",
    num: 239,
    difficulty: "hard",
    patterns: ["monotonic-deque"],
  });
  const easyA = problem({ id: "lc-0001", num: 1, patterns: ["monotonic-deque"] });
  const easyB = problem({ id: "lc-0002", num: 2, patterns: ["monotonic-deque"] });

  it("locks a hard problem while the pattern has fewer than 2 solid problems", () => {
    const problems = bank(hard, easyA, easyB);
    const oneSolid = { "lc-0001": solidState("lc-0001") };
    const ranked = rankNewProblems(problems, oneSolid, []);
    expect(ranked.map((r) => r.problem.id)).not.toContain("lc-0239");
  });

  it("unlocks at exactly 2 solid problems", () => {
    const problems = bank(hard, easyA, easyB);
    const twoSolid = {
      "lc-0001": solidState("lc-0001"),
      "lc-0002": solidState("lc-0002"),
    };
    const ranked = rankNewProblems(problems, twoSolid, []);
    expect(ranked.map((r) => r.problem.id)).toContain("lc-0239");
  });
});

describe("rankNewProblems", () => {
  it("excludes seen problems and breaks ties by ascending number", () => {
    const a = problem({ id: "lc-0002", num: 2 });
    const b = problem({ id: "lc-0001", num: 1 });
    const seen = problem({ id: "lc-0003", num: 3 });
    const ranked = rankNewProblems(bank(a, b, seen), {
      "lc-0003": solidState("lc-0003"),
    }, []);
    // identical scores -> lower problem number first
    expect(ranked.map((r) => r.problem.num)).toEqual([1, 2]);
  });

  it("sprint mode is dominated by company demand", () => {
    // wanted: high demand, but late curriculum and an already-drilled pattern.
    // normal score 0.4*0.7 + 0.28*0.5 + 0.18*0.056 ≈ 0.43 — loses.
    // sprint score 0.8*0.7 + 0.2*0.056 ≈ 0.57 — wins.
    const wanted = problem({
      id: "lc-0010",
      num: 10,
      neetcode_group: "Bit Manipulation", // late curriculum
      patterns: ["hash-map"], // already seen once below
      company_freq: { google: 0.7 },
    });
    const gapFiller = problem({
      id: "lc-0011",
      num: 11,
      neetcode_group: "Arrays & Hashing", // early curriculum
      patterns: ["never-touched"],
      company_freq: { google: 0.3 },
    });
    const seen = problem({ id: "lc-0012", num: 12, patterns: ["hash-map"] });
    const problems = bank(wanted, gapFiller, seen);
    const reviews = { "lc-0012": solidState("lc-0012") };
    const normal = rankNewProblems(problems, reviews, ["google"]);
    const sprint = rankNewProblems(problems, reviews, ["google"], {
      sprint: true,
    });
    expect(normal[0].problem.id).toBe("lc-0011"); // gap + curriculum win
    expect(sprint[0].problem.id).toBe("lc-0010"); // demand wins
  });
});

describe("estimateMinutes", () => {
  it("maps difficulty to minutes", () => {
    expect(estimateMinutes(problem({ id: "a", num: 1, difficulty: "easy" }))).toBe(20);
    expect(estimateMinutes(problem({ id: "b", num: 2, difficulty: "medium" }))).toBe(28);
    expect(estimateMinutes(problem({ id: "c", num: 3, difficulty: "hard" }))).toBe(38);
  });
});

describe("pickSibling", () => {
  const base = problem({
    id: "lc-0100",
    num: 100,
    difficulty: "medium",
    siblings: ["lc-0101", "lc-0102", "lc-0103"],
  });
  const easier = problem({ id: "lc-0101", num: 101, difficulty: "easy" });
  const samelevel = problem({ id: "lc-0102", num: 102, difficulty: "medium" });
  const harder = problem({ id: "lc-0103", num: 103, difficulty: "hard" });
  const problems = bank(base, easier, samelevel, harder);

  it("prefers the hardest eligible sibling when stretching", () => {
    expect(pickSibling(base, problems, {}, true)?.id).toBe("lc-0103");
  });

  it("prefers the easiest eligible sibling when falling back", () => {
    expect(pickSibling(base, problems, {}, false)?.id).toBe("lc-0101");
  });

  it("skips siblings already seen and returns null when none remain", () => {
    const reviews = {
      "lc-0103": solidState("lc-0103"),
    };
    expect(pickSibling(base, problems, reviews, true)?.id).toBe("lc-0102");
    const allSeen = {
      "lc-0101": solidState("lc-0101"),
      "lc-0102": solidState("lc-0102"),
      "lc-0103": solidState("lc-0103"),
    };
    expect(pickSibling(base, problems, allSeen, true)).toBeNull();
  });
});

describe("patternStats", () => {
  it("counts a failed problem as seen but not solid", () => {
    const p = problem({ id: "lc-0001", num: 1, patterns: ["hash-map"] });
    let st = solidState("lc-0001");
    st = applyGrade(st, "fail", { on: D0 }).next;
    const stats = patternStats(bank(p), { "lc-0001": st });
    expect(stats["hash-map"]).toEqual({ seen: 1, solid: 0, lapses: 1 });
  });
});
