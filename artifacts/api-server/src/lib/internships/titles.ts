/**
 * Whether a posting title is a software internship, and whether it names the season.
 *
 * The sibling module `../new-grad/titles.ts` explains the division of labour and it is the
 * same one here: the upstream matches `title ilike '%text%'`, which has no word boundary
 * and cannot intersect two conditions, so the terms go out as one coarse query each and
 * the precise test runs on the returned string.
 *
 * The software half is **imported**, not restated. Two lists would drift, and a pattern
 * added to one would silently miss the other — the failure `new-grad/titles.ts` already
 * names above its own one-list rule.
 */

import { SOFTWARE } from "../new-grad/titles";

/** The season this list is for. Configuration: this page outlives one hiring cycle. */
export const TARGET_SEASON = { term: "summer", year: 2027 } as const;

/**
 * The intern terms, and also the upstream queries. One list rather than two, for the reason
 * the sibling module gives: a term added here that was never asked of the upstream narrows
 * nothing, and the list would look correct while the page got quietly smaller.
 *
 * It has one entry, and that is a measurement rather than an oversight. Against the live
 * feed on 2026-09-30, `intern` as a substring returned all 188 intern-matching titles —
 * every `internship`, `internships` and `Intern/Co-op` among them, because it is their stem.
 * The candidates for a second entry were run and each was asked what it added that `intern`
 * had not: `co-op` one *Electrical Engineering Co-Op*, `coop` three *Cooperative AI* roles
 * that are not internships at all, `apprentice` one *Operations Associate, Apprenticeship*,
 * and `summer analyst`, `placement` and `working student` nothing whatsoever. Not one is a
 * software internship, and each would cost an upstream round trip on every page load.
 *
 * It stays an array because that is the extension point: when a term does start earning its
 * request, it is added here and the fan-out in `routes/internships.ts` needs no change.
 */
export const INTERN_TERMS = ["intern"] as const;

const normalise = (title: string) => title.toLowerCase();

/**
 * Written with boundaries because this is the whole difficulty of the module.
 * `International`, `Internal` and `Internals` all contain `intern` and none of them is an
 * internship; every one of the three is a real title the upstream's own `intern` query
 * returns.
 */
const INTERN = [/\bintern\b/, /\binternships?\b/];

/**
 * The sibling module's exclusions minus its two intern patterns, which here are the point
 * rather than the problem. Restated rather than imported for exactly that reason: sharing
 * that list would mean sharing the two entries this module exists to accept, and a shared
 * list with a carve-out is harder to read than two short honest ones. `SOFTWARE` is shared
 * because it has no such split.
 *
 * Applied last, and they win.
 */
const SENIORITY = [
  /\bsenior\b/,
  /\bsr\.?\b/,
  /\bstaff\b/,
  /\bprincipal\b/,
  /\blead\b/,
  /\bmanager\b/,
  /\bdirector\b/,
  /\bhead\s+of\b/,
  /\bii+\b/,
  /\bph\.?d\b/,
  /\bpostdoc\w*\b/,
];

export function isSoftwareInternship(title: string): boolean {
  const text = normalise(title);
  if (SENIORITY.some((p) => p.test(text))) return false;
  if (!INTERN.some((p) => p.test(text))) return false;
  return SOFTWARE.some((p) => p.test(text));
}

/**
 * Whether the title names the target season. A sort key and never a filter — the spec's
 * own words: naming the season sorts a posting ahead of the rest and is not the condition
 * for appearing at all.
 */
export function namesTargetSeason(title: string): boolean {
  const season = new RegExp(`\\b${TARGET_SEASON.term}\\s+${TARGET_SEASON.year}\\b`);
  return season.test(normalise(title));
}
