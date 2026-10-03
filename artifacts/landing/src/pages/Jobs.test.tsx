import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import Jobs from "@/pages/Jobs";
import { renderApp } from "@/test/render";
import { http, HttpResponse, server } from "@/test/server";

/**
 * The two sections of `/jobs`.
 *
 * The internships section is the front page's list, not a filter over this page's
 * feed — so what matters is that it shows exactly what `/api/internships` answered, with
 * that answer's own count, and offers no control that could narrow it further. The
 * `onUnhandledRequest: "error"` setting in `setup.ts` is what makes "and asks nothing
 * else" checkable: a stray request to the other endpoint fails the test.
 */

const INTERN = {
  job_id: 11,
  employer_name: "FIGMA, INC",
  title: "Software Engineer Intern (Summer 2027)",
  url: "https://job-boards.greenhouse.io/figma/jobs/11",
  location: "San Francisco, CA",
  is_remote: false,
  posted_at: "2026-10-01",
  tier: "strong",
  total_h1b_certified: 73,
  last_active_year: 2026,
  no_sponsor: false,
  location_read: "us",
  names_target_season: true,
};

const OTHER_SEASON = {
  ...INTERN,
  job_id: 12,
  employer_name: "NOTION LABS, INC",
  title: "Software Engineer Intern, Mobile (Winter 2027)",
  names_target_season: false,
};

const BOARD_NOTE =
  "Built from the employer job boards we poll. Employers running their own careers " +
  "site — TikTok, ByteDance, Amazon, Apple, Google and others — are not among them, " +
  "so this list is not all of the market.";

const ROLE = {
  ...INTERN,
  job_id: 21,
  employer_name: "STRIPE, INC",
  title: "Backend Engineer",
};

function withInternships(body: Record<string, unknown>) {
  server.use(http.get("/api/internships", () => HttpResponse.json(body)));
}

function withJobs(total: number, postings: unknown[]) {
  server.use(http.get("/api/jobs", () => HttpResponse.json({ total, postings })));
}

/** Where the router ended up, as a query string — `Jobs` reads and writes it there. */
function sectionOf(path: string | undefined) {
  return new URLSearchParams((path ?? "").split("?")[1] ?? "").get("section");
}

describe("the Summer 2027 internships section", () => {
  it("lists what /api/internships answered, with its total, and no filter row", async () => {
    withInternships({
      total: 2,
      postings: [INTERN, OTHER_SEASON],
      newest_posted_at: "2026-10-01",
      board_note: BOARD_NOTE,
      preview: false,
    });
    renderApp(<Jobs />, { path: "/jobs?section=summer-2027" });

    const list = await screen.findByTestId("posting-list");
    expect(await within(list).findByText(INTERN.title)).toBeInTheDocument();
    expect(within(list).getByText(OTHER_SEASON.title)).toBeInTheDocument();
    expect(screen.getByTestId("result-count")).toHaveTextContent("2 internships");
    expect(screen.queryByTestId("job-filter-row")).not.toBeInTheDocument();
    // The name is the list's, not a claim about every row in it.
    expect(screen.getByTestId("section-scope")).toHaveTextContent(
      /Summer 2027 come first; the list is not limited to them/i,
    );
    expect(screen.getByTestId("internships-board-note")).toHaveTextContent(BOARD_NOTE);
  });

  it("opens the same detail pane, with the two sponsorship claims", async () => {
    withInternships({
      total: 1,
      postings: [INTERN],
      newest_posted_at: "2026-10-01",
      board_note: BOARD_NOTE,
      preview: false,
    });
    const { currentPath } = renderApp(<Jobs />, { path: "/jobs?section=summer-2027" });

    await userEvent.click(await screen.findByTestId(`posting-card-${INTERN.job_id}`));

    const detail = await screen.findByTestId("posting-detail");
    expect(within(detail).getByText(INTERN.title)).toBeInTheDocument();
    expect(within(detail).getByTestId("sponsorship-evidence")).toHaveTextContent(
      "73 certified H-1B filings",
    );
    expect(sectionOf(currentPath())).toBe("summer-2027");
  });

  it("says how many a signed-out preview withheld, from the server's own total", async () => {
    withInternships({
      total: 9,
      postings: [INTERN],
      newest_posted_at: "2026-10-01",
      board_note: BOARD_NOTE,
      preview: true,
    });
    renderApp(<Jobs />, { path: "/jobs?section=summer-2027" });

    expect(await screen.findByTestId("internships-more")).toHaveTextContent(
      "8 more. Sign in to see the rest.",
    );
  });

  it("is reached from the switch, which carries the choice in the URL", async () => {
    withJobs(1, [ROLE]);
    withInternships({
      total: 1,
      postings: [INTERN],
      newest_posted_at: "2026-10-01",
      board_note: BOARD_NOTE,
      preview: false,
    });

    const { currentPath } = renderApp(<Jobs />, { path: "/jobs" });
    expect(await screen.findByText(ROLE.title)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: /Summer 2027 internships/i }));

    expect(await screen.findByText(INTERN.title)).toBeInTheDocument();
    expect(sectionOf(currentPath())).toBe("summer-2027");
  });
});

describe("all roles, the regression guard", () => {
  it("renders the feed, its filter row and its count exactly as before", async () => {
    withJobs(1, [ROLE]);

    renderApp(<Jobs />, { path: "/jobs" });

    expect(await screen.findByText(ROLE.title)).toBeInTheDocument();
    expect(screen.getByTestId("job-filter-row")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("result-count")).toHaveTextContent("1 roles"));
    expect(screen.queryByTestId("section-scope")).not.toBeInTheDocument();
  });
});
