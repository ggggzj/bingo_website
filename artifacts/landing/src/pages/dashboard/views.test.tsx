import { describe, expect, it } from "vitest";

import { VIEWS, viewsFor } from "@/pages/dashboard/views";

/**
 * The registry itself, not the shell's mechanics — `Shell.test.tsx` covers those against a
 * fake array, which is right for the shell and useless for this question: whether the views
 * this deployment actually has are entitled to the people they should be.
 *
 * `entitled` draws the rail and is never the boundary. Each of these views keeps its own
 * server-side refusal, so this file is about what the owner can *find*, not what they can
 * reach.
 */
describe("VIEWS", () => {
  it("gives the owner every view, including their own applications", () => {
    const ids = viewsFor({ isSignedIn: true, isOwner: true }).map((view) => view.id);

    expect(ids).toEqual(["growth", "new-grad", "practice", "applications"]);
  });

  it("gives a signed-in stranger practice and nothing of the owner's", () => {
    const ids = viewsFor({ isSignedIn: true, isOwner: false }).map((view) => view.id);

    expect(ids).toEqual(["practice"]);
  });

  it("gives an anonymous visitor nothing", () => {
    expect(viewsFor({ isSignedIn: false, isOwner: false })).toEqual([]);
  });

  it("addresses every view by a distinct path segment", () => {
    const ids = VIEWS.map((view) => view.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});
