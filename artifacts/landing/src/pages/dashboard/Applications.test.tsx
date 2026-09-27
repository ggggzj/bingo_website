import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Applications from "@/pages/dashboard/Applications";
import { renderApp } from "@/test/render";
import { http, HttpResponse, server } from "@/test/server";

/**
 * The owner's sent applications, as a page.
 *
 * What is under test is the same thing the server's shape is careful about: that the page
 * never presents an import's default as something the owner said, and that it states how old
 * the imported half is. Everything about *which* rows exist is the import's business and is
 * tested there.
 */

const application = (over: Record<string, unknown> = {}) => ({
  id: 1,
  company: "Solace Health",
  role: "Associate Software Engineer",
  location: "Redwood City, CA",
  region: "US",
  ats: "Ashby",
  url: "https://jobs.ashbyhq.com/solace/db008474",
  status: "applied",
  status_source: "import",
  stage: null,
  note: null,
  applied_date: "2026-09-10",
  saved_date: "2026-09-10",
  days_waiting: 14,
  has_jd: true,
  ...over,
});

function list(over: Record<string, unknown> = {}) {
  server.use(
    http.get("/api/applications", () =>
      HttpResponse.json({
        applications: [application()],
        imported_at: "2026-09-24T12:00:00.000Z",
        ...over,
      }),
    ),
  );
}

describe("Applications", () => {
  it("lists what was sent, with the company and the role", async () => {
    list({
      applications: [
        application(),
        application({ id: 2, company: "Notion", role: "Software Engineer New Grad" }),
      ],
    });
    renderApp(<Applications />);

    expect(await screen.findByText("Solace Health")).toBeInTheDocument();
    expect(screen.getByText("Notion")).toBeInTheDocument();
    expect(screen.getByText("Associate Software Engineer")).toBeInTheDocument();
  });

  it("counts them by status", async () => {
    list({
      applications: [
        application({ id: 1, status: "applied" }),
        application({ id: 2, status: "applied" }),
        application({ id: 3, status: "closed", status_source: "owner" }),
        application({ id: 4, status: "saved", days_waiting: null, applied_date: null }),
      ],
    });
    renderApp(<Applications />);

    const counts = await screen.findByTestId("status-counts");
    expect(counts).toHaveTextContent("applied 2");
    expect(counts).toHaveTextContent("closed 1");
    expect(counts).toHaveTextContent("saved 1");
  });

  /**
   * The page's half of `status_source`. A status nobody has confirmed is shown as what it is
   * — a line from a CSV export — so the owner is never told they decided something they did
   * not.
   */
  it("marks a status that came from the import rather than from the owner", async () => {
    list({
      applications: [
        application({ id: 1, status: "applied", status_source: "import" }),
        application({
          id: 2,
          company: "Visa",
          status: "closed",
          status_source: "owner",
          stage: "拒信",
        }),
      ],
    });
    renderApp(<Applications />);

    await screen.findByText("Visa");
    expect(screen.getAllByTestId("status-from-import")).toHaveLength(1);
  });

  it("states how old the imported half is", async () => {
    list();
    renderApp(<Applications />);

    const header = await screen.findByTestId("import-age");
    expect(header).toHaveTextContent("2026-09-24");
  });

  it("says nothing has been imported yet rather than showing an empty table", async () => {
    list({ applications: [], imported_at: null });
    renderApp(<Applications />);

    expect(await screen.findByTestId("empty-state")).toHaveTextContent(
      /import-applications/i,
    );
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows how long an application has been waiting, and nothing for one never sent", async () => {
    list({
      applications: [
        application({ id: 1, days_waiting: 14 }),
        application({ id: 2, company: "Garmin", days_waiting: null, applied_date: null }),
      ],
    });
    renderApp(<Applications />);

    expect(await screen.findByText("14 days")).toBeInTheDocument();
    const garmin = screen.getByTestId("application-2");
    expect(garmin).not.toHaveTextContent("days");
  });

  it("says so when the list cannot be loaded", async () => {
    server.use(
      http.get("/api/applications", () => new HttpResponse(null, { status: 500 })),
    );
    renderApp(<Applications />);

    await waitFor(() =>
      expect(screen.getByText(/could not load/i)).toBeInTheDocument(),
    );
  });
});
