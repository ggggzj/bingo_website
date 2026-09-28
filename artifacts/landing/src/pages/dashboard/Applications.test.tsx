import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("changes a status and shows what the row now says", async () => {
    const user = userEvent.setup();
    const patched: unknown[] = [];
    let current = application({ id: 1, status: "applied", status_source: "import" });
    server.use(
      http.get("/api/applications", () =>
        HttpResponse.json({ applications: [current], imported_at: "2026-09-24T12:00:00.000Z" }),
      ),
      http.patch("/api/applications/1", async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        patched.push(body);
        current = { ...current, ...body, status_source: "owner" };
        return HttpResponse.json(current);
      }),
    );
    renderApp(<Applications />);

    const status = await screen.findByTestId("status-select-1");
    await user.selectOptions(status, "interview");

    expect(patched).toEqual([{ status: "interview" }]);
    // And the marker goes away, because the answer is now the owner's.
    await waitFor(() =>
      expect(screen.queryByTestId("status-from-import")).not.toBeInTheDocument(),
    );
  });

  it("saves a note when the field is left, and sends nothing when it is unchanged", async () => {
    const user = userEvent.setup();
    const patched: unknown[] = [];
    server.use(
      http.get("/api/applications", () =>
        HttpResponse.json({
          applications: [application({ id: 1, note: null })],
          imported_at: "2026-09-24T12:00:00.000Z",
        }),
      ),
      http.patch("/api/applications/1", async ({ request }) => {
        patched.push(await request.json());
        return HttpResponse.json(application({ id: 1, note: "rejected, no sponsorship" }));
      }),
    );
    renderApp(<Applications />);

    await user.click(await screen.findByTestId("open-row-1"));
    const note = await screen.findByTestId("note-input-1");
    await user.click(note);
    await user.tab();
    expect(patched).toEqual([]); // nothing typed, nothing sent

    await user.click(note);
    await user.type(note, "rejected, no sponsorship");
    await user.tab();

    await waitFor(() => expect(patched).toEqual([{ note: "rejected, no sponsorship" }]));
  });

  it("says so when a change could not be saved", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/applications", () =>
        HttpResponse.json({
          applications: [application({ id: 1 })],
          imported_at: "2026-09-24T12:00:00.000Z",
        }),
      ),
      http.patch("/api/applications/1", () => new HttpResponse(null, { status: 500 })),
    );
    renderApp(<Applications />);

    const status = await screen.findByTestId("status-select-1");
    await user.selectOptions(status, "closed");

    await waitFor(() =>
      expect(screen.getByTestId("save-failed-1")).toBeInTheDocument(),
    );
  });

  it("opens the archived description from the row", async () => {
    const user = userEvent.setup();
    list({ applications: [application({ id: 1, has_jd: true })] });
    server.use(
      http.get("/api/applications/1/jd", () =>
        HttpResponse.json({
          markdown: "Job Description:\n\nWe are looking for an associate engineer.",
          trimmed: false,
          full_markdown: "Job Description:\n\nWe are looking for an associate engineer.",
          source: "Ashby API",
        }),
      ),
    );
    renderApp(<Applications />);

    await user.click(await screen.findByTestId("open-jd-1"));

    expect(await screen.findByText(/looking for an associate engineer/)).toBeInTheDocument();
    expect(screen.getByTestId("jd-source")).toHaveTextContent("Ashby API");
  });

  /**
   * The archive is the point of the column: a posting's page 404s when the req closes, and
   * two of the owner's did within five days. A row with nothing kept says so rather than
   * offering a control that opens nothing.
   */
  it("says no copy was kept rather than offering a dead control", async () => {
    list({ applications: [application({ id: 1, has_jd: false })] });
    renderApp(<Applications />);

    expect(await screen.findByTestId("no-jd-1")).toBeInTheDocument();
    expect(screen.queryByTestId("open-jd-1")).not.toBeInTheDocument();
  });

  it("says when a scraped page was skipped past, and can show the whole thing", async () => {
    const user = userEvent.setup();
    list({ applications: [application({ id: 1, has_jd: true })] });
    server.use(
      http.get("/api/applications/1/jd", () =>
        HttpResponse.json({
          markdown: "About the job\n\nWingspan engineers build things.",
          trimmed: true,
          full_markdown: "3,293 jobs matched\n\nAbout the job\n\nWingspan engineers build things.",
          source: "HTML 抓取",
        }),
      ),
    );
    renderApp(<Applications />);

    await user.click(await screen.findByTestId("open-jd-1"));
    expect(await screen.findByTestId("jd-trimmed")).toBeInTheDocument();
    expect(screen.queryByText(/3,293 jobs matched/)).not.toBeInTheDocument();

    await user.click(screen.getByTestId("show-full-jd"));
    expect(await screen.findByText(/3,293 jobs matched/)).toBeInTheDocument();
  });
});

/**
 * 76 of the owner's 94 rows have nothing written on them. An empty box on each was the page
 * asking 76 questions at once; the answer is to ask when the row is opened.
 */
describe("a row opens to be written on", () => {
  it("shows no empty boxes until the row is opened", async () => {
    const user = userEvent.setup();
    list({ applications: [application({ id: 1, stage: null, note: null })] });
    renderApp(<Applications />);

    await screen.findByText("Solace Health");
    expect(screen.queryByTestId("stage-input-1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("note-input-1")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("open-row-1"));

    expect(await screen.findByTestId("stage-input-1")).toBeInTheDocument();
    expect(screen.getByTestId("note-input-1")).toBeInTheDocument();
  });

  it("shows what is written without opening anything", async () => {
    list({
      applications: [
        application({ id: 1, stage: "简历被拒", note: "2026-09-23 拒信：identified other candidates" }),
      ],
    });
    renderApp(<Applications />);

    // Readable at a glance — the reason to open a row is to change it, not to read it.
    expect(await screen.findByText("简历被拒")).toBeInTheDocument();
    expect(screen.getByText(/identified other candidates/)).toBeInTheDocument();
    expect(screen.queryByTestId("note-input-1")).not.toBeInTheDocument();
  });

  it("does not open the row when the status dropdown is used", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/applications", () =>
        HttpResponse.json({
          applications: [application({ id: 1 })],
          imported_at: "2026-09-24T12:00:00.000Z",
        }),
      ),
      http.patch("/api/applications/1", () => HttpResponse.json(application({ id: 1 }))),
    );
    renderApp(<Applications />);

    await user.selectOptions(await screen.findByTestId("status-select-1"), "interview");

    // Changing a status is one click and must stay one click.
    expect(screen.queryByTestId("note-input-1")).not.toBeInTheDocument();
  });

  it("closes again when the row is clicked a second time", async () => {
    const user = userEvent.setup();
    list({ applications: [application({ id: 1 })] });
    renderApp(<Applications />);

    await user.click(await screen.findByTestId("open-row-1"));
    expect(await screen.findByTestId("note-input-1")).toBeInTheDocument();

    await user.click(screen.getByTestId("open-row-1"));
    expect(screen.queryByTestId("note-input-1")).not.toBeInTheDocument();
  });
});
