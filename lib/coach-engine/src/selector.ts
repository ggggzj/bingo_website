/**
 * Choosing which unseen problem to hand over next — port of selector.py.
 *
 * Ranking blends four signals: company demand, pattern gap, weak-pattern
 * pull, and curriculum order (NeetCode groups are roughly prerequisite-
 * ordered). Hard problems stay locked until the pattern has some solid
 * ground under it.
 */
import { pythonSum } from "./round";
import type { Difficulty, Problem, ReviewState } from "./types";

// Rough prerequisite order of the NeetCode 150 groups.
export const GROUP_ORDER = [
  "Arrays & Hashing",
  "Two Pointers",
  "Sliding Window",
  "Stack",
  "Binary Search",
  "Linked List",
  "Trees",
  "Heap / Priority Queue",
  "Backtracking",
  "Tries",
  "Graphs",
  "1-D Dynamic Programming",
  "Intervals",
  "Greedy",
  "Advanced Graphs",
  "2-D Dynamic Programming",
  "Math & Geometry",
  "Bit Manipulation",
] as const;

const GROUP_RANK = new Map(GROUP_ORDER.map((g, i) => [g as string, i]));

export const DIFFICULTY_MINUTES: Record<Difficulty, number> = {
  easy: 20,
  medium: 28,
  hard: 38,
};

// A pattern needs this many non-failing sessions before its hard problems unlock.
export const HARD_UNLOCK_SOLID = 2;

export interface PatternStat {
  seen: number;
  solid: number;
  lapses: number;
}
export type PatternStats = Record<string, PatternStat>;

export function companyDemand(problem: Problem, companies: string[]): number {
  const freq = problem.company_freq ?? {};
  const keys = Object.keys(freq);
  if (!keys.length) return 0.3;
  const vals = companies.length
    ? companies.map((c) => freq[c] ?? 0.0)
    : keys.map((k) => freq[k]);
  if (!vals.length) return 0.3;
  const mean = pythonSum(vals) / vals.length;
  // A problem one company loves is still worth doing, so let the max pull up.
  return 0.65 * mean + 0.35 * Math.max(...vals);
}

/** Per-pattern exposure and trouble, derived from review states. */
export function patternStats(
  problems: Record<string, Problem>,
  reviews: Record<string, ReviewState>,
): PatternStats {
  const stats: PatternStats = {};
  for (const [pid, st] of Object.entries(reviews)) {
    const problem = problems[pid];
    if (!problem) continue;
    for (const pat of problem.patterns) {
      const s = (stats[pat] ??= { seen: 0, solid: 0, lapses: 0 });
      s.seen += 1;
      s.lapses += st.lapses;
      if (
        (st.state === "review" || st.state === "mastered") &&
        st.last_grade !== "fail"
      ) {
        s.solid += 1;
      }
    }
  }
  return stats;
}

/** 1.0 for a pattern never touched, decaying as exposure accumulates. */
function patternGapScore(problem: Problem, stats: PatternStats): number {
  const pats = problem.patterns.length ? problem.patterns : ["unknown"];
  return Math.max(...pats.map((pat) => 1.0 / (1.0 + (stats[pat]?.seen ?? 0))));
}

function weakPatternScore(problem: Problem, stats: PatternStats): number {
  let worst = 0.0;
  for (const pat of problem.patterns) {
    const s = stats[pat];
    if (!s || !s.seen) continue;
    worst = Math.max(worst, s.lapses / s.seen);
  }
  return Math.min(1.0, worst);
}

function curriculumScore(problem: Problem): number {
  const rank = GROUP_RANK.get(problem.neetcode_group) ?? GROUP_ORDER.length;
  return 1.0 - rank / Math.max(1, GROUP_ORDER.length);
}

function hardIsLocked(problem: Problem, stats: PatternStats): boolean {
  if (problem.difficulty !== "hard") return false;
  for (const pat of problem.patterns) {
    if ((stats[pat]?.solid ?? 0) >= HARD_UNLOCK_SOLID) return false;
  }
  return true;
}

export function scoreProblem(
  problem: Problem,
  stats: PatternStats,
  companies: string[],
  sprint: boolean,
): number {
  const demand = companyDemand(problem, companies);
  if (sprint) {
    // Interview in two weeks: nothing matters except what they ask.
    return 0.8 * demand + 0.2 * curriculumScore(problem);
  }
  return (
    0.4 * demand +
    0.28 * patternGapScore(problem, stats) +
    0.14 * weakPatternScore(problem, stats) +
    0.18 * curriculumScore(problem)
  );
}

export interface RankOptions {
  sprint?: boolean;
  limit?: number;
}

/** Unseen problems, best first. Ties break by ascending problem number so the
 * ranking is stable. */
export function rankNewProblems(
  problems: Record<string, Problem>,
  reviews: Record<string, ReviewState>,
  companies: string[],
  opts: RankOptions = {},
): Array<{ problem: Problem; score: number }> {
  const { sprint = false, limit } = opts;
  const stats = patternStats(problems, reviews);
  const ranked: Array<{ problem: Problem; score: number }> = [];
  for (const [pid, problem] of Object.entries(problems)) {
    if (pid in reviews) continue;
    if (hardIsLocked(problem, stats)) continue;
    ranked.push({ problem, score: scoreProblem(problem, stats, companies, sprint) });
  }
  ranked.sort((a, b) => b.score - a.score || a.problem.num - b.problem.num);
  return limit ? ranked.slice(0, limit) : ranked;
}

export function estimateMinutes(problem: Problem): number {
  return DIFFICULTY_MINUTES[problem.difficulty] ?? 28;
}

/** A same-pattern variant to stretch into, or an easier one to fall back on. */
export function pickSibling(
  problem: Problem,
  problems: Record<string, Problem>,
  reviews: Record<string, ReviewState>,
  harder: boolean,
): Problem | null {
  const order: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };
  const here = order[problem.difficulty] ?? 1;
  const candidates: Array<{ key: number; sib: Problem }> = [];
  for (const sid of problem.siblings) {
    const sib = problems[sid];
    if (!sib || sid in reviews) continue;
    const there = order[sib.difficulty] ?? 1;
    if (harder && there >= here) {
      candidates.push({ key: there, sib });
    } else if (!harder && there <= here) {
      candidates.push({ key: -there, sib });
    }
  }
  if (!candidates.length) return null;
  // Stable sort by key descending, like Python's sort on -key.
  candidates.sort((a, b) => b.key - a.key);
  return candidates[0].sib;
}
