import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { readFolder, readJdBody } from "./folder";

/**
 * Fixtures rather than the owner's live folder, deliberately.
 *
 * The first draft of this task asserted "94 applications" against
 * `~/Desktop/job_dashboard`. That test fails the next morning the owner applies to a job,
 * and fails everywhere that folder does not exist. What is worth pinning is the *shape* of
 * the files — which is what bites — so the fixtures carry the shapes and the live folder is
 * checked by hand, once, as evidence.
 */
const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");

describe("readFolder", () => {
  it("reads JavaScript, not JSON: a comment header and a trailing comma are not errors", () => {
    const folder = readFolder(FIXTURES);

    expect(folder.applications).toHaveLength(3);
    expect(folder.updatedAt).toBe("2026-09-24");
    expect(folder.source).toBe("Simplify_Tracked_Jobs_fixture.csv");
  });

  it("keeps every key shape the folder uses", () => {
    const keys = readFolder(FIXTURES).applications.map((a) => a.sourceKey);

    // A synthetic Ashby key, a "公司名|职位名" key for a posting with no link, and a
    // Workday key — the three the folder actually produces.
    expect(keys).toEqual([
      "ashby:db008474",
      "Zoom|Software Engineer",
      "workday:visa/Visa/Software-Engineer_REF088530W-3",
    ]);
  });

  it("reads an empty string as absent, because the CSV writes one for both", () => {
    const [ashby, zoom] = readFolder(FIXTURES).applications;

    expect(ashby?.appliedDate).toBeNull(); // "" in the file: saved, never applied
    expect(zoom?.url).toBeNull(); // "" in the file: no link at all
    expect(zoom?.appliedDate).toBe("2026-09-22");
  });

  it("defaults dupCount when the row omits it", () => {
    const visa = readFolder(FIXTURES).applications.at(2);

    expect(visa?.dupCount).toBe(1);
  });

  it("attaches the hand-written half by key, and carries `notes` across as the note", () => {
    const zoom = readFolder(FIXTURES).applications.at(1);

    expect(zoom?.override).toEqual({
      status: "closed",
      stage: "简历被拒",
      note: expect.stringContaining("identified other candidates"),
    });
  });

  it("leaves the fields an override does not set as null rather than inventing them", () => {
    const visa = readFolder(FIXTURES).applications.at(2);

    expect(visa?.override).toEqual({
      status: "closed",
      stage: "拒信 · eligibility requirements",
      note: null,
    });
  });

  it("leaves an application with no override alone", () => {
    const ashby = readFolder(FIXTURES).applications.at(0);

    expect(ashby?.override).toBeNull();
  });

  it("attaches the archived JD path where the archive has one", () => {
    const [ashby, zoom] = readFolder(FIXTURES).applications;

    expect(ashby?.jdPath).toBe("jobs/solace-health-82/jd.md");
    expect(zoom?.jdPath).toBeNull();
  });

  /**
   * The alarm this reader exists to raise. All three files are keyed the same way today,
   * so a key that matches nothing means the folder's normalisation and ours have drifted —
   * and drift does not announce itself as a conflict. It produces a row whose hand-written
   * history has quietly detached, which is the one loss this whole change is built to avoid.
   */
  it("reports a key that matches no application instead of dropping it", () => {
    const folder = readFolder(FIXTURES);

    expect(folder.unmatchedOverrideKeys).toEqual([
      "https://example.com/a-posting-that-no-longer-exists",
    ]);
    expect(folder.unmatchedArchiveKeys).toEqual(["ashby:a-key-with-no-application"]);
  });
});

describe("readJdBody", () => {
  it("reads the archived body from the path the archive names", () => {
    const body = readJdBody(FIXTURES, "jobs/solace-health-82/jd.md");

    expect(body).toContain("Associate Software Engineer");
  });

  it("answers null for an archive entry whose file is gone", () => {
    expect(readJdBody(FIXTURES, "jobs/ghost-1/jd.md")).toBeNull();
  });

  it("refuses a path that climbs out of the folder", () => {
    expect(() => readJdBody(FIXTURES, "../../../etc/passwd")).toThrow(/outside/i);
  });
});
