/**
 * Making an archived job description readable.
 *
 * The archive exists because postings die: two of the owner's 404'd within five days of
 * applying, and their text is gone for good. What `archive_jds.py` saved is therefore the only
 * copy, and the rule here follows from that — **nothing is rewritten, only skipped past.** A
 * summary of a job description is a different artifact from the job description, and the one
 * worth keeping for an interview is what the employer actually wrote.
 *
 * Measured across the owner's 80 bodies on 2026-09-27:
 *
 * | Source | Bodies | State |
 * |---|---|---|
 * | Greenhouse / Workday / Ashby / other APIs and structured data | 73 | clean prose already |
 * | HTML scraped from the page | 7 | the whole page: menus, footers, other job listings |
 *
 * Google's scraped archive is 420 lines and the job description starts at line 282, behind a
 * site menu and a list of 3,293 unrelated jobs. That is what this skips.
 *
 * **Only a scraped body is touched**, decided by the archive's own header line rather than by
 * the text. The clean bodies also contain the word "Responsibilities" part-way down, after an
 * introduction worth reading, so a rule that cut at the first heading everywhere would throw
 * away the beginning of 73 good documents to tidy up 7 bad ones.
 */

export type ReadableJd = {
  /** What to show: the archive's header, then the description from where it starts. */
  markdown: string;
  /** Whether anything was skipped. The page says so rather than quietly serving less. */
  trimmed: boolean;
  /** Everything the archive holds, so what was skipped is reachable and not merely hidden. */
  fullMarkdown: string;
  /** "Greenhouse API", "HTML 抓取", … — as `archive_jds.py` recorded it. */
  source: string | null;
};

/** `- 归档时间：2026-09-24（来源：Greenhouse API）` */
const SOURCE_LINE = /^-\s*归档时间：.*（来源：(.+?)）\s*$/m;

const SCRAPED = "HTML 抓取";

/**
 * Where a job description starts, in the words employers actually use. Matched at the start of
 * a line and case-insensitively, longest-standing first. This list is allowed to miss: four of
 * the seven scraped bodies match nothing here and are shown whole, which is the honest failure
 * — the alternative is a cleaner deciding which part of a job description may be read.
 */
const STARTS = [
  "minimum qualifications",
  "basic qualifications",
  "about the job",
  "about the role",
  "about this role",
  "about the position",
  "job description",
  "the role",
  "what you'll do",
  "what you will do",
  "who we are",
  "responsibilities",
  "requirements",
  "qualifications",
];

function startOfDescription(body: string): number {
  let earliest = -1;
  for (const phrase of STARTS) {
    const pattern = new RegExp(`^#{0,4}\\s*\\*{0,2}${phrase}\\b`, "im");
    const found = pattern.exec(body);
    if (found && (earliest === -1 || found.index < earliest)) earliest = found.index;
  }
  return earliest;
}

export function readableJd(raw: string): ReadableJd {
  const source = SOURCE_LINE.exec(raw)?.[1]?.trim() ?? null;
  const unchanged = { markdown: raw, trimmed: false, fullMarkdown: raw, source };

  if (source === null || !source.includes(SCRAPED)) return unchanged;

  /**
   * The header `archive_jds.py` writes — title, original link, location, when it was archived
   * — ends at the first `---`. It is kept whatever happens to the body: where a copy came from
   * and when is part of what makes it trustworthy a year later.
   */
  const separator = raw.indexOf("\n---\n");
  if (separator === -1) return unchanged;

  const header = raw.slice(0, separator + "\n---\n".length);
  const body = raw.slice(separator + "\n---\n".length);

  const start = startOfDescription(body);
  if (start <= 0) return unchanged;

  return {
    markdown: `${header}${body.slice(start)}`,
    trimmed: true,
    fullMarkdown: raw,
    source,
  };
}
