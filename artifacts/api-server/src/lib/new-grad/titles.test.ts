/**
 * What counts as an early-career software title, and what does not.
 *
 * Every accepted and rejected string below is a real posting title from the owner's own
 * list of 376 US new-grad roles (gathered 2026-09-11), not an invented one. That matters
 * for the rejections especially: a filter tested against titles somebody made up passes
 * on the cases they thought of.
 *
 * The number this whole module exists for: `title ilike '%new grad%'` — what
 * `/jobs`'s seniority control sends — matches 55 of those 376. The other 321 are
 * what these tests are about.
 */

import { describe, expect, it } from "vitest";

import { TARGET_CLASS_YEAR, isEarlyCareerSoftware, namesTargetClass } from "./titles";

describe("isEarlyCareerSoftware", () => {
  it("accepts early-career software titles that never say 'new grad'", () => {
    // The 321 the substring search misses.
    for (const title of [
      "Entry Level Java Developer Associate",
      "Associate Software Engineer - Pega",
      "EFA Network Software Engineer 1 - Annapurna Labs",
      "Software Engineer Graduate - Global E-commerce-Search - 2027 Start",
      "Software Engineer, Early Career 2027",
      "Software Engineer - University Hire 2027",
      "Software Development Engineer 1 - Early Career - 2027 Starts",
    ]) {
      expect(isEarlyCareerSoftware(title), title).toBe(true);
    }
  });

  it("accepts the titles the substring search already found", () => {
    for (const title of [
      "Software Engineer New Grad",
      "Forward Deployed Software Engineer New Grad - Commercial",
    ]) {
      expect(isEarlyCareerSoftware(title), title).toBe(true);
    }
  });

  it("refuses senior titles, including one that also carries an early-career term", () => {
    // `Senior Software Engineer I` is the case a list that only added terms would get
    // wrong: it satisfies `engineer i` and must still be refused. The exclusions run
    // after the terms and win.
    for (const title of [
      "Senior Software Engineer I",
      "Staff Software Engineer",
      "Principal Engineer, Platform",
      "Software Engineering Manager",
      "Sr. Solutions Architect",
      "Software Engineer II",
      "Software Engineer III",
    ]) {
      expect(isEarlyCareerSoftware(title), title).toBe(false);
    }
  });

  it("refuses internships — that is a different list with its own gate", () => {
    for (const title of [
      "Software Engineering Intern",
      "Software Engineer Internship - Summer 2027",
    ]) {
      expect(isEarlyCareerSoftware(title), title).toBe(false);
    }
  });

  it("refuses early-career roles that are not software", () => {
    for (const title of [
      "Entry Level Sales Associate",
      "New Grad Registered Nurse",
      "Associate Recruiter - Early Career",
    ]) {
      expect(isEarlyCareerSoftware(title), title).toBe(false);
    }
  });

  it("does not let 'engineer i' match 'engineering'", () => {
    // The upstream's ilike has no word boundary, so the query is a coarse net and this
    // is the precise test. Without boundaries every `Engineering` title matches
    // `engineer i` and the list becomes every engineering role at every level.
    expect(isEarlyCareerSoftware("Director of Software Engineering")).toBe(false);
    expect(isEarlyCareerSoftware("Software Engineering Associate")).toBe(true);
  });
});

describe("namesTargetClass", () => {
  it("is configuration, not a literal", () => {
    expect(TARGET_CLASS_YEAR).toBe(2027);
  });

  it("flags a title naming the target class", () => {
    expect(namesTargetClass("Software Engineer - University Hire 2027")).toBe("target");
    expect(namesTargetClass("Software Engineer New Grad - Summer 2027")).toBe("target");
  });

  it("rejects a title naming a different class", () => {
    // The req before this one. Applying to it is wasted attention, and `/jobs`'s
    // substring control cannot tell it apart from the owner's own year.
    expect(namesTargetClass("Software Engineer New Grad - December 2026")).toBe("other");
    expect(namesTargetClass("Software Engineer New Grad 2028")).toBe("other");
  });

  it("passes a title naming no class — which is 97% of the list", () => {
    // 367 of the owner's 376 US rows name no year at all. If this ever returns
    // anything but `none`, the page empties out.
    for (const title of [
      "Entry Level Java Developer Associate",
      "Associate Software Engineer - Pega",
      "Software Engineering Associate",
    ]) {
      expect(namesTargetClass(title), title).toBe("none");
    }
  });

  it("does not read a number that is not a class year", () => {
    // `Engineer 1` is a level, and `Annapurna Labs` postings carry part numbers.
    expect(namesTargetClass("EFA Network Software Engineer 1 - Annapurna Labs")).toBe("none");
    expect(namesTargetClass("Software Engineer, Fleet 1024")).toBe("none");
  });
});
