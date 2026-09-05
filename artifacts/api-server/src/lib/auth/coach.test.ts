import { afterEach, describe, expect, it } from "vitest";
import { coachEmails, isCoachUser } from "./coach";

const original = process.env["COACH_EMAILS"];

afterEach(() => {
  if (original === undefined) delete process.env["COACH_EMAILS"];
  else process.env["COACH_EMAILS"] = original;
});

describe("coach allowlist", () => {
  it("unset means nobody", () => {
    delete process.env["COACH_EMAILS"];
    expect(isCoachUser("anyone@example.com")).toBe(false);
    expect(isCoachUser("")).toBe(false);
  });

  it("empty and blank-entry values mean nobody", () => {
    process.env["COACH_EMAILS"] = "";
    expect(coachEmails().size).toBe(0);
    process.env["COACH_EMAILS"] = " , ,";
    expect(coachEmails().size).toBe(0);
    expect(isCoachUser("")).toBe(false);
  });

  it("trims and compares case-insensitively", () => {
    process.env["COACH_EMAILS"] = " Me@Example.COM , other@example.com";
    expect(isCoachUser("me@example.com")).toBe(true);
    expect(isCoachUser("  ME@EXAMPLE.COM  ")).toBe(true);
    expect(isCoachUser("other@example.com")).toBe(true);
    expect(isCoachUser("stranger@example.com")).toBe(false);
  });
});
