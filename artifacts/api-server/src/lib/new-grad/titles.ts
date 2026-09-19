/**
 * Whether a posting title is an early-career software role, and which class it names.
 *
 * `/api/postings` takes one `title` and matches it as `ilike '%text%'`, which is why
 * `/jobs`'s seniority control is a substring and says so in its own spec. Against the
 * owner's 376 US new-grad rows that substring reaches 55. This module is the other 321.
 *
 * The split of labour with the upstream matters and is deliberate:
 *
 *   EARLY_CAREER_TERMS goes out as one query each — the coarse net, because ilike has
 *   no word boundary and cannot intersect two conditions.
 *
 *   isEarlyCareerSoftware runs here, on the title string, with boundaries — the precise
 *   test. `engineer i` is the reason: as a substring it matches every `Engineering`
 *   title ever written.
 *
 * Nothing here labels a posting. No seniority is stored, none is rendered, and the page
 * says it is a title search — the line `openspec/specs/jobs-page/spec.md` draws, which
 * is between narrowing and asserting rather than between one term and twelve.
 */

/** The class this list is for. Configuration: this page outlives one hiring season. */
export const TARGET_CLASS_YEAR = 2027;

/**
 * The early-career terms, and also the upstream queries.
 *
 * One list rather than two, because two would drift: a term added here that was never
 * asked of the upstream narrows nothing, and the list would look correct while the page
 * got quietly smaller.
 */
export const EARLY_CAREER_TERMS = [
  "new grad",
  "new graduate",
  "entry level",
  "early career",
  "university graduate",
  "university hire",
  "campus",
  "associate",
  "graduate",
  "junior",
  "engineer i",
  "engineer 1",
  "level 1",
  "class of 20",
] as const;

/** Written as patterns because three of the terms need a boundary the upstream lacks. */
const EARLY_CAREER = [
  /\bnew\s+grads?\b/,
  /\bnew\s+graduates?\b/,
  /\bentry[\s-]level\b/,
  /\bearly[\s-]career\b/,
  /\buniversity\s+(graduate|hire|recruit)\w*\b/,
  /\bcampus\b/,
  /\bassociate\b/,
  /\bgraduates?\b/,
  /\bjunior\b/,
  /\bjr\.?\b/,
  /\bengineer\s+i\b/,
  /\bengineer\s+1\b/,
  /\blevel\s+1\b/,
  /\bclass\s+of\s+20\d{2}\b/,
];

/**
 * A software signal is required, and bare "engineer" is deliberately not one.
 *
 * Without this the list fills with `New Grad Mechanical Engineer`. The owner's own
 * filter rule says the same thing — a title must be software AND early-career — and
 * every accepted title in the tests carries one of these outright.
 */
const SOFTWARE = [
  /\bsoftware\b/,
  /\bdeveloper\b/,
  /\bswe\b/,
  /\bsdet?\b/,
  /\bfull[\s-]?stack\b/,
  /\bfront[\s-]?end\b/,
  /\bback[\s-]?end\b/,
  /\bweb\s+develop\w*\b/,
  /\bmobile\s+(developer|engineer)\b/,
  /\b(ios|android)\s+(developer|engineer)\b/,
  /\bsite\s+reliability\b/,
  /\bsre\b/,
  /\bdevops\b/,
  /\bplatform\s+engineer\w*\b/,
  /\bdata\s+engineer\w*\b/,
  /\bmachine\s+learning\s+engineer\w*\b/,
  /\bprogrammer\b/,
];

/**
 * Applied last, and they win.
 *
 * `Senior Software Engineer I` satisfies an early-career term and must still be refused;
 * a list that only added terms would list it. `\bintern\b` rather than `intern` because
 * the owner's own collection run recorded `International` as the mis-match that cost it.
 */
const EXCLUDED = [
  /\bsenior\b/,
  /\bsr\.?\b/,
  /\bstaff\b/,
  /\bprincipal\b/,
  /\blead\b/,
  /\bmanager\b/,
  /\bdirector\b/,
  /\bhead\s+of\b/,
  /\bii+\b/,
  /\bintern\b/,
  /\binternships?\b/,
  /\bph\.?d\b/,
  /\bpostdoc\w*\b/,
];

const normalise = (title: string) => title.toLowerCase();

export function isEarlyCareerSoftware(title: string): boolean {
  const text = normalise(title);
  if (EXCLUDED.some((p) => p.test(text))) return false;
  if (!SOFTWARE.some((p) => p.test(text))) return false;
  return EARLY_CAREER.some((p) => p.test(text));
}

/**
 * Which class a title names, if any.
 *
 * Three states because the data has three, and the third is the common one: 367 of the
 * owner's 376 US rows name no year. A filter on the year would return eight of them, so
 * this fences and sorts and never filters.
 */
export type ClassYear = "target" | "other" | "none";

export function namesTargetClass(title: string): ClassYear {
  // Only 20xx, so `Engineer 1` is a level and `Fleet 1024` is a part number.
  const years = [...normalise(title).matchAll(/\b(20\d{2})\b/g)].map((m) => Number(m[1]));
  if (years.length === 0) return "none";
  return years.includes(TARGET_CLASS_YEAR) ? "target" : "other";
}
