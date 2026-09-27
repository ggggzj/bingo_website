import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { readableJd } from "./jd";

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");
const read = (name: string) => fs.readFileSync(path.join(FIXTURES, name), "utf8");

/**
 * Measured on the owner's real archive, 2026-09-27: **73 of 80 bodies come from an ATS API**
 * (Greenhouse 25, Workday 20, Ashby 17, plus structured-data and vendor endpoints) and are
 * already clean prose. **7 were scraped from HTML**, and those carry the whole page — Google's
 * is 420 lines of which the job description starts at line 282, behind a site menu and a list
 * of 3,293 other jobs.
 *
 * So the rule is narrow on purpose: only a body whose own archive header says it was scraped
 * is touched at all. The 73 clean ones cannot be damaged by a heuristic they never meet.
 */
describe("readableJd", () => {
  it("leaves an API-sourced body exactly as the employer wrote it", () => {
    const raw = read("api-jd.md");

    const jd = readableJd(raw);

    expect(jd.trimmed).toBe(false);
    expect(jd.markdown).toBe(raw);
    expect(jd.source).toBe("Workday API");
  });

  /**
   * The clean bodies contain "Responsibilities" too, part-way down, after an intro worth
   * reading. Cutting at the first heading everywhere would throw that intro away — which is
   * why the source line, not the text, decides whether anything is cut.
   */
  it("does not cut an API-sourced body at a heading that appears inside it", () => {
    const jd = readableJd(read("api-jd.md"));

    expect(jd.markdown).toContain("The Engineering Excellence team provides leadership");
  });

  it("cuts a scraped body back to where the job description starts", () => {
    const jd = readableJd(read("scraped-jd.md"));

    expect(jd.trimmed).toBe(true);
    expect(jd.markdown).toContain("Minimum qualifications:");
    expect(jd.markdown).toContain("Wingspan engineers develop the next-generation");
    // The page's own furniture, and somebody else's job listings, are gone.
    expect(jd.markdown).not.toContain("Skip navigation links");
    expect(jd.markdown).not.toContain("3,293 jobs matched");
    expect(jd.markdown).not.toContain("Senior Network Engineer");
  });

  it("keeps the archive's own header, which says where the text came from and when", () => {
    const jd = readableJd(read("scraped-jd.md"));

    expect(jd.markdown).toContain("# Wingspan — Software Engineer, Early Career");
    expect(jd.markdown).toContain("原始链接");
    expect(jd.source).toBe("HTML 抓取");
  });

  /**
   * Four of the seven scraped bodies have no heading worth cutting at. Showing them whole is
   * the honest failure: the text is there to be read, and a cleaner that guessed would be
   * deciding which part of a job description the owner is allowed to see.
   */
  it("shows a scraped body whole when it has no recognisable starting point", () => {
    const raw = read("scraped-jd.md").replace(/Minimum qualifications:|About the job|Responsibilities/g, "Something else");

    const jd = readableJd(raw);

    expect(jd.trimmed).toBe(false);
    expect(jd.markdown).toBe(raw);
  });

  it("hands back the whole archive as well, so nothing is only hidden", () => {
    const raw = read("scraped-jd.md");

    const jd = readableJd(raw);

    expect(jd.fullMarkdown).toBe(raw);
  });

  it("survives a body with no archive header at all", () => {
    const jd = readableJd("just some text, no header, no separator");

    expect(jd.trimmed).toBe(false);
    expect(jd.source).toBeNull();
    expect(jd.markdown).toBe("just some text, no header, no separator");
  });
});
