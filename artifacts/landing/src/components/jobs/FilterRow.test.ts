import { describe, expect, it } from "vitest";

import { CATEGORY_PRESETS, ROLE_PRESETS } from "@/components/jobs/FilterRow";

/**
 * The pickers are title searches, and the upstream matches a title search as
 * `ilike '%text%'` — `jobfeed/adapters.py` in the extension repo, pinned there by
 * `test_title_text_is_a_substring_match`. There is no word boundary available, so a
 * short search term is a promise the page cannot keep: `intern` reaches
 * `International`, `Internal` and `Database Internals`.
 *
 * Measured against production on 2026-09-20 (`GET /api/jobs?title=intern&limit=100`):
 * 18 of 100 rows were not internships. Two of them were a Senior and a Principal role,
 * offered to a reader who asked for internships — which is the exact failure the
 * component's own header comment says this page exists not to commit.
 */

/** What the upstream does with a title search. Case-insensitive substring, no boundary. */
function upstreamWouldMatch(term: string, title: string): boolean {
  return title.toLowerCase().includes(term.toLowerCase());
}

/**
 * Real titles, read from the live feed on 2026-09-20. Each is keyed to the picker
 * option that must never return it.
 *
 * Note what is deliberately absent: no title here is listed under "Senior" or "Staff
 * and above" merely for containing those words, because for those options the match is
 * correct. Only the options whose term hides inside an unrelated word are a hazard.
 */
const MUST_NOT_RETURN: Record<string, string[]> = {
  Internship: [
    "Director, US International Tax Planning",
    "International Payroll Analyst",
    "Sr. Legal Counsel, International Public Sector Compliance",
    "Internal Audit - Regulatory Lead, EMEA",
    "Senior Software Engineer, Internal Fraud Platform",
    "Principal Software Developer - Query Engine, Database Internals - Elasticsearch",
  ],
};

describe("the experience and category pickers", () => {
  it("offers no option whose search returns roles of another kind", () => {
    for (const preset of [...ROLE_PRESETS, ...CATEGORY_PRESETS]) {
      for (const title of MUST_NOT_RETURN[preset.label] ?? []) {
        expect(
          upstreamWouldMatch(preset.title, title),
          `"${preset.label}" searches for "${preset.title}", which returns "${title}"`,
        ).toBe(false);
      }
    }
  });

  /**
   * Removed 2026-09-20 rather than narrowed, and this pins it.
   *
   * The cheap repair — searching `internship` instead of `intern` — was measured and
   * is worse: it takes the feed from 194 rows to 23, and all 82 real internships in a
   * 100-row sample are titled `... Intern` rather than `... Internship`. Filtering the
   * fetched page in the browser is the other obvious repair and is forbidden by
   * `openspec/specs/jobs-page/spec.md`, which removed a control of exactly that shape
   * at review because it breaks the result count.
   *
   * So the option is gone until the feed can express the filter. `.harness/backlogs/021`
   * is the ticket that builds the real Summer 2027 section; **whoever lands it deletes
   * this test on purpose**, having answered the count question rather than around it.
   */
  it("offers no internship option at all, until the feed can express one", () => {
    expect(ROLE_PRESETS.map((p) => p.label)).not.toContain("Internship");
  });
});
