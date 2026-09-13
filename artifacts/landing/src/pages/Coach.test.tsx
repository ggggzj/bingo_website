import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Coach from "@/pages/Coach";
import { renderApp } from "@/test/render";
import { http, HttpResponse, server } from "@/test/server";

/**
 * The practice view on its first day, which — now that every signed-in user
 * may reach it — is the state most people will ever see it in.
 *
 * The thing being tested is honesty. Grades come from a grilling session, and
 * grading is what moves `due`, `ease` and `state`; a user with no local
 * grilling bridge can tick problems for a week and never be scheduled a
 * single review. The view has to say so on the way in rather than render
 * three empty panels and let them work it out.
 */
const FRESH_PLAN = {
  date: "2026-09-12",
  budget: 60,
  plannedMinutes: 50,
  reviews: [],
  new: [
    {
      problem: {
        id: "lc-0001",
        num: 1,
        title: "Two Sum",
        slug: "two-sum",
        difficulty: "easy",
        patterns: ["hash-map"],
      },
      minutes: 25,
      score: null,
      done: false,
      solved: false,
      grade: null,
    },
  ],
  deferredReviews: 0,
  sprint: false,
  sprintDays: null,
  totalSeen: 0,
  totalProblems: 150,
  doneToday: 0,
  solvedToday: 0,
  assignedToday: 1,
};

const FRESH_INSIGHTS = {
  guidance: [],
  openGaps: [],
  clearedGaps: [],
  patterns: [],
  ungraded: [],
  overview: {
    seen: 0,
    bank: 150,
    streak: 0,
    solved7d: 0,
    todayAssigned: 1,
    todayDone: 0,
    todaySolved: 0,
    todayStatus: "pending",
  },
};

function freshAccount() {
  server.use(
    http.get("/api/auth/me", () =>
      HttpResponse.json({ email: "someone@example.com", isOwner: false }),
    ),
    http.get("/api/coach/plan", () => HttpResponse.json(FRESH_PLAN)),
    http.get("/api/coach/insights", () => HttpResponse.json(FRESH_INSIGHTS)),
    http.get("/api/coach/config", () =>
      HttpResponse.json({
        dailyMinutes: 60,
        newPerDay: 2,
        sprintWindowDays: 14,
        interviewDate: null,
        activeTrack: "sde",
        targetCompanies: [],
        knownCompanies: [],
      }),
    ),
    http.get("/api/coach/log", () =>
      HttpResponse.json({
        days: [],
        streak: 0,
        adherence: {
          window: 14,
          assignedDays: 0,
          finishedDays: 0,
          workedDays: 0,
          rate: 0,
        },
      }),
    ),
    http.get("/api/coach/forecast", () => HttpResponse.json({ days: [] })),
  );
}

describe("the practice view, on a fresh account", () => {
  it("says the schedule only moves when a grilling grades you", async () => {
    freshAccount();
    renderApp(<Coach />);

    const notice = await screen.findByTestId("text-practice-zero-state");
    expect(notice).toHaveTextContent(/grill/i);
    expect(notice).toHaveTextContent(/local/i);
  });

  it("still deals today's problems — this is not an error state", async () => {
    freshAccount();
    renderApp(<Coach />);

    expect(await screen.findByText(/Two Sum/)).toBeInTheDocument();
  });

  it("offers no way to grade yourself", async () => {
    freshAccount();
    renderApp(<Coach />);

    await screen.findByText(/Two Sum/);
    for (const grade of [/^pass$/i, /^partial$/i, /^fail$/i]) {
      expect(screen.queryByRole("button", { name: grade })).toBeNull();
    }
  });

  it("carries no chrome the shell already owns", async () => {
    freshAccount();
    renderApp(<Coach />);

    await screen.findByText(/Two Sum/);
    expect(screen.queryByTestId("button-signout")).not.toBeInTheDocument();
  });
});
