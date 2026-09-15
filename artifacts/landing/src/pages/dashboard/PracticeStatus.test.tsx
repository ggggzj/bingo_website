import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppRoutes } from "@/App";
import { PracticeStatus } from "@/pages/dashboard/PracticeStatus";
import type { DashboardView } from "@/pages/dashboard/views";
import { renderApp } from "@/test/render";
import { http, HttpResponse, server } from "@/test/server";

/**
 * The line under the practice entry. The rail is drawn only for a viewer with
 * somewhere else to be, so every case here is the owner standing on the growth
 * view and reading the practice entry across the rail.
 *
 * Stub views, real status: the growth and practice components are one-line
 * stubs so that the only request on the wire is the plan. The status
 * component is the real one, because its wording is the thing under test.
 */
const VIEWS: DashboardView[] = [
  {
    id: "growth",
    label: "Growth",
    blurb: "Installs and registrations.",
    entitled: (viewer) => viewer.isOwner,
    Component: () => <p>growth view</p>,
  },
  {
    id: "practice",
    label: "Practice",
    blurb: "Today's plan.",
    entitled: (viewer) => viewer.isSignedIn,
    Status: PracticeStatus,
    Component: () => <p>practice view</p>,
  },
];

const PLAN = {
  date: "2026-09-15",
  budget: 60,
  plannedMinutes: 40,
  reviews: [],
  new: [],
  deferredReviews: 0,
  sprint: false,
  sprintDays: null,
  totalSeen: 12,
  totalProblems: 120,
  doneToday: 2,
  solvedToday: 3,
  assignedToday: 5,
};

function owner() {
  server.use(
    http.get("/api/auth/me", () =>
      HttpResponse.json({ email: "owner@example.com", isOwner: true }),
    ),
  );
}

describe("the practice entry's progress line", () => {
  it("reads graded-of-assigned and what is solved but not grilled", async () => {
    owner();
    server.use(http.get("/api/coach/plan", () => HttpResponse.json(PLAN)));
    renderApp(<AppRoutes views={VIEWS} />, { path: "/dashboard/growth" });

    expect(await screen.findByText("growth view")).toBeInTheDocument();
    const entry = screen.getByTestId("link-view-practice");
    await waitFor(() =>
      expect(entry).toHaveTextContent(
        "Today: 2 of 5 graded · 1 solved but not grilled",
      ),
    );
  });

  it("says so when nothing is due", async () => {
    owner();
    server.use(
      http.get("/api/coach/plan", () =>
        HttpResponse.json({ ...PLAN, doneToday: 0, solvedToday: 0, assignedToday: 0 }),
      ),
    );
    renderApp(<AppRoutes views={VIEWS} />, { path: "/dashboard/growth" });

    expect(await screen.findByText("growth view")).toBeInTheDocument();
    const entry = screen.getByTestId("link-view-practice");
    await waitFor(() => expect(entry).toHaveTextContent("Nothing due today"));
    expect(entry).not.toHaveTextContent("graded");
  });

  it("shows the label alone when the plan is refused", async () => {
    owner();
    server.use(
      http.get("/api/coach/plan", () =>
        HttpResponse.json({ error: "Not found" }, { status: 404 }),
      ),
    );
    renderApp(<AppRoutes views={VIEWS} />, { path: "/dashboard/growth" });

    expect(await screen.findByText("growth view")).toBeInTheDocument();
    // Let the refusal land before asserting on what did not appear.
    await waitFor(() =>
      expect(screen.getByTestId("link-view-practice")).toBeInTheDocument(),
    );
    const entry = screen.getByTestId("link-view-practice");
    expect(entry).toHaveTextContent(/^Practice$/);
    expect(screen.queryByText(/error|not found/i)).not.toBeInTheDocument();
  });
});
