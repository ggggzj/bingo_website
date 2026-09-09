import { describe, expect, it } from "vitest";
import { rankNewProblems, scoreProblem, patternStats } from "../src/selector";
import { trackFactor } from "../src/trackWeights";
import type { Problem } from "../src/types";

function problem(
  over: Partial<Problem> & { id: string; num: number },
): Problem {
  return {
    title: over.id,
    slug: over.id,
    difficulty: "medium",
    neetcode_group: "Arrays & Hashing",
    patterns: ["dfs"],
    company_freq: {},
    followups: [],
    siblings: [],
    ...over,
  };
}

const bank = (...ps: Problem[]) => Object.fromEntries(ps.map((p) => [p.id, p]));

describe("trackFactor", () => {
  it("is exactly 1.0 for every problem on the sde track", () => {
    for (const patterns of [["matrix"], ["math", "heap"], ["dfs"], []]) {
      expect(trackFactor(problem({ id: "x", num: 1, patterns }), "sde")).toBe(1);
    }
  });

  it("takes the max multiplier across a problem's patterns", () => {
    expect(
      trackFactor(
        problem({ id: "a", num: 1, patterns: ["dfs", "matrix"] }),
        "ai-engineer",
      ),
    ).toBe(1.3);
    expect(
      trackFactor(
        problem({ id: "b", num: 2, patterns: ["hash-map", "heap"] }),
        "ai-engineer",
      ),
    ).toBe(1.25);
  });

  it("leaves unlisted patterns at 1.0 — boosts only, no penalties", () => {
    expect(
      trackFactor(
        problem({ id: "c", num: 3, patterns: ["linked-list", "trie"] }),
        "ai-engineer",
      ),
    ).toBe(1);
  });
});

describe("track-aware scoring", () => {
  const ml = problem({ id: "lc-0001", num: 1, patterns: ["matrix"] });
  const general = problem({ id: "lc-0002", num: 2, patterns: ["linked-list"] });

  it("sde scores are unchanged by the track parameter", () => {
    const stats = patternStats({}, {});
    const withDefault = scoreProblem(ml, stats, [], false);
    const withSde = scoreProblem(ml, stats, [], false, "sde");
    expect(withSde).toBe(withDefault);
  });

  it("ai-engineer pulls an ML-adjacent problem ahead of a tie", () => {
    // Same group, same (absent) company data, same gap: the only
    // difference is the pattern's track relevance.
    const problems = bank(ml, general);
    const sde = rankNewProblems(problems, {}, [], { track: "sde" });
    const ai = rankNewProblems(problems, {}, [], { track: "ai-engineer" });
    // On sde the tie breaks by problem number (1 before 2) — same order
    // here, so assert on the scores rather than the ordering alone.
    expect(sde[0].score).toBe(sde[1].score);
    expect(ai[0].problem.id).toBe("lc-0001");
    expect(ai[0].score).toBeGreaterThan(ai[1].score);
  });

  it("reorders when the ML problem would otherwise lose", () => {
    // general sorts first on sde (lower number); ai boost flips it.
    const first = problem({ id: "lc-0003", num: 3, patterns: ["linked-list"] });
    const second = problem({ id: "lc-0004", num: 4, patterns: ["math"] });
    const problems = bank(first, second);
    expect(
      rankNewProblems(problems, {}, [], { track: "sde" })[0].problem.num,
    ).toBe(3);
    expect(
      rankNewProblems(problems, {}, [], { track: "ai-engineer" })[0].problem
        .num,
    ).toBe(4);
  });
});
