/**
 * Track relevance, defined at the pattern level — 29 reviewable judgments
 * instead of 150 invented ones, and new bank problems inherit relevance
 * from their patterns automatically. Owner-approved 2026-09-09 (see the
 * track-split change's research/track-weights.md for rationales).
 *
 * Boosts only, no penalties: AI interviews still test general coding, so
 * nothing is de-prioritized — ML-adjacent patterns are pulled forward.
 * The `sde` track is 1.0 everywhere BY DEFINITION, which keeps default
 * behavior bit-identical to the pre-track engine (parity fixtures pass
 * untouched).
 */
import type { Problem } from "./types";

export const TRACKS = ["sde", "ai-engineer"] as const;
export type Track = (typeof TRACKS)[number];

export const AI_PATTERN_WEIGHTS: Record<string, number> = {
  matrix: 1.3, // tensor/grid manipulation is daily ML work
  math: 1.3, // numeric and probability-adjacent reasoning
  heap: 1.25, // top-k retrieval / beam-search selection
  quickselect: 1.25, // k-th statistic and percentile computation
  "prefix-sum": 1.2, // cumulative statistics over streams
  "sliding-window": 1.2, // streaming metrics over token/event windows
  "hash-map": 1.15, // feature dictionaries, dedup, caching
};

const FACTOR_MIN = 0.5;
const FACTOR_MAX = 1.5;

/** A problem's factor for a track: max over its patterns' multipliers,
 * clamped. Partly ML-adjacent counts. */
export function trackFactor(problem: Problem, track: Track): number {
  if (track === "sde") return 1.0;
  let factor = 1.0;
  for (const pattern of problem.patterns) {
    factor = Math.max(factor, AI_PATTERN_WEIGHTS[pattern] ?? 1.0);
  }
  return Math.min(FACTOR_MAX, Math.max(FACTOR_MIN, factor));
}
