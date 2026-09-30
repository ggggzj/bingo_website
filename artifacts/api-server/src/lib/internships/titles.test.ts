/**
 * What counts as a software internship title, and what does not.
 *
 * Every string below is a real title, pulled from the live feed on 2026-09-30 with
 * `GET /api/jobs?title=intern` — 188 distinct titles, of which these are the shapes that
 * decide the module. The sibling `new-grad/titles.test.ts` states the reason for that rule
 * and it holds harder here: an `intern` substring search is unusually good at matching
 * things that are not internships, and titles somebody invented would not have found them.
 *
 * The four that matter, all real, all returned by the upstream's own `intern` query:
 *
 *   International Accountant                      — `intern` inside `International`
 *   Internal Audit Manager                        — inside `Internal`
 *   Software Engineer - Database Engine Internals — inside `Internals`
 *   Software Engineer, Internal Systems           — software, and still not an internship
 *
 * All four must be absent. Absent, not labelled: the spec's own line is that the list is
 * narrowed by absence and never by assertion.
 */

import { describe, expect, it } from "vitest";

import { SOFTWARE, isEarlyCareerSoftware } from "../new-grad/titles";
import { INTERN_TERMS, isSoftwareInternship, namesTargetSeason } from "./titles";

describe("isSoftwareInternship", () => {
  it("accepts a software internship naming the target season", () => {
    const title = "Software Engineer Intern (Summer 2027)";

    expect(isSoftwareInternship(title)).toBe(true);
    expect(namesTargetSeason(title)).toBe(true);
  });

  it("refuses a seniority the intern term does not cancel", () => {
    /*
     * The one constructed string in this file, and it is constructed because the feed has
     * no example — which is the reason to keep it. `Senior` and `Intern` in one title is
     * rare enough that nobody would think to exclude it, and a list that only added terms
     * would return it: `\bintern\b` matches and `\bsoftware\b` matches. The sibling module
     * hit the same case from the other side with `Senior Software Engineer I`.
     */
    expect(isSoftwareInternship("Senior Software Engineer Intern")).toBe(false);
  });

  it("refuses the titles that matched the upstream on a word boundary alone", () => {
    // All four real, all four returned by the upstream's own `intern` query on 2026-09-30.
    for (const title of [
      "International Accountant",
      "International Program Manager",
      "Internal Audit Manager",
      "Software Engineer - Database Engine Internals",
      "Software Engineer, Internal Systems",
    ]) {
      expect(isSoftwareInternship(title), title).toBe(false);
    }
  });

  it("refuses an internship with no software signal", () => {
    for (const title of ["Marketing Intern", "Accounting Intern (Summer 2027)", "Product Designer, Internship"]) {
      expect(isSoftwareInternship(title), title).toBe(false);
    }
  });

  it("accepts the software shapes that are not the word 'software'", () => {
    for (const title of [
      "Data Engineer Intern",
      "Machine Learning Engineer Intern",
      "Software Developer Intern, Backend (Summer 2027)",
      "Forward Deployed Software Engineer, Internship - Commercial",
    ]) {
      expect(isSoftwareInternship(title), title).toBe(true);
    }
  });
});

describe("namesTargetSeason", () => {
  it("is false for a title naming no season, which is still listed", () => {
    const title = "Software Engineer Intern";

    expect(isSoftwareInternship(title)).toBe(true);
    expect(namesTargetSeason(title)).toBe(false);
  });

  it("is false for a year without the season and a season without the year", () => {
    // Real, both of them. The constant is a season, so a bare year is not it.
    expect(namesTargetSeason("Software Engineer Intern (Winter 2027)")).toBe(false);
    expect(namesTargetSeason("Data Science Intern (2027)")).toBe(false);
    expect(namesTargetSeason("Software Engineer, Intern (Summer or Winter)")).toBe(false);
  });
});

describe("the software half, shared with the new-grad list", () => {
  /**
   * The two modules ask different questions — is this an internship, is this early-career —
   * but they ask the *same* question about software, because `SOFTWARE` is one exported
   * array and not two copies. This test is what makes that load-bearing: the day somebody
   * pastes the patterns into this directory "to decouple them", the two lists start
   * drifting and one of these pairs stops agreeing.
   *
   * Compared as pairs rather than directly, because a bare role name satisfies neither
   * function on its own: each phrase is asked once as an internship and once as a new-grad
   * title, and the two answers must match.
   */
  it("answers the same for a role whether it is asked as an internship or a new grad", () => {
    const roles = [
      // Real, and software by different patterns each time.
      "Software Engineer",
      "Software Developer",
      "Data Engineer",
      "Machine Learning Engineer",
      "Full Stack Engineer",
      "Backend Engineer",
      "Platform Engineer",
      // Real, and not software. Both functions must refuse them for the same reason.
      "Marketing",
      "Accounting",
      "Product Designer",
      "Mechanical Engineer",
      "Business Analyst",
    ];

    for (const role of roles) {
      expect(
        isSoftwareInternship(`${role} Intern`),
        `${role}: internship and new-grad disagree on the software half`,
      ).toBe(isEarlyCareerSoftware(`${role} New Grad`));
    }
  });

  it("asks the upstream for every term it later tests against", () => {
    // The one-list rule, asserted rather than trusted: a term this module filters on but
    // never queries would narrow nothing, and the page would quietly shrink.
    expect(INTERN_TERMS.length).toBeGreaterThan(0);
    for (const term of INTERN_TERMS) {
      expect(isSoftwareInternship(`Software Engineer ${term}`), term).toBe(true);
    }
  });

  it("keeps the software patterns reachable as one shared array", () => {
    expect(SOFTWARE.length).toBeGreaterThan(0);
    expect(SOFTWARE.some((p) => p.test("software engineer"))).toBe(true);
  });
});
