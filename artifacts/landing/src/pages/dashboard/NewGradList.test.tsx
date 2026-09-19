import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import NewGradList from "@/pages/dashboard/NewGradList";
import { renderApp } from "@/test/render";
import { http, HttpResponse, server } from "@/test/server";

/**
 * The owner's list, as a page.
 *
 * Two things are under test here and nothing else is: that the page never says more
 * than it knows, and that it says out loud what it cannot see. The narrowing is the
 * server's and is tested there.
 */

const BOARD_NOTE =
  "Built from the employer job boards we poll. Employers running their own careers " +
  "site — TikTok, ByteDance, Amazon, Apple, Google and others — are not among them.";

const posting = (over: Record<string, unknown> = {}) => ({
  job_id: 1,
  employer_name: "Notion",
  title: "Software Engineer New Grad",
  url: "https://example.com/apply",
  location: "San Francisco, CA",
  is_remote: false,
  posted_at: "2026-08-15",
  tier: "strong",
  total_h1b_certified: 137,
  last_active_year: 2026,
  no_sponsor: null,
  class_year: "none",
  location_read: "us",
  is_new: false,
  ...over,
});

function list(over: Record<string, unknown> = {}) {
  server.use(
    http.get("/api/new-grad-list", () =>
      HttpResponse.json({
        target_class_year: 2027,
        postings: [posting()],
        closed: [],
        board_note: BOARD_NOTE,
        ...over,
      }),
    ),
  );
}

describe("the owner's new-grad list", () => {
  it("shows the employer, the title and the filings", async () => {
    list();
    renderApp(<NewGradList />);

    expect(await screen.findByText("Software Engineer New Grad")).toBeInTheDocument();
    expect(screen.getByText("Notion")).toBeInTheDocument();
    expect(screen.getByText(/137 certified H-1B filings/)).toBeInTheDocument();
  });

  it("says nothing about refusing when nobody has read the description", async () => {
    /* `no_sponsor: null` is not a no. The same rule the public page is already held
       to, enforced here by rendering the component that already knows it. */
    list();
    renderApp(<NewGradList />);

    await screen.findByText("Software Engineer New Grad");
    expect(screen.queryByTestId("posting-refuses-sponsorship")).not.toBeInTheDocument();
  });

  it("draws the refusal when the description does refuse", async () => {
    list({ postings: [posting({ no_sponsor: true })] });
    renderApp(<NewGradList />);

    expect(await screen.findByTestId("posting-refuses-sponsorship")).toBeInTheDocument();
  });

  it("states what it cannot see, with postings and with none", async () => {
    list();
    renderApp(<NewGradList />);
    expect(await screen.findByText(/careers site/i)).toBeInTheDocument();

    list({ postings: [] });
    renderApp(<NewGradList />);
    await waitFor(() =>
      expect(screen.getAllByText(/careers site/i).length).toBeGreaterThan(1),
    );
  });

  it("marks a row whose location could not be read, and leaves a US row unmarked", async () => {
    list({
      postings: [
        posting({ job_id: 1, location: "2 Locations", location_read: "unknown" }),
        posting({ job_id: 2, location: "Berkeley, CA", location_read: "us" }),
      ],
    });
    renderApp(<NewGradList />);

    await screen.findByText("2 Locations");
    expect(screen.getAllByTestId("location-unconfirmed")).toHaveLength(1);
  });

  it("says why a posting naming the class sorts where it does", async () => {
    /* The ordering is the server's. What must be here is the reason, so the owner can
       disagree with it — the shape their own spreadsheet used when it put its ranking
       rationale in the column beside the rank. */
    list({ postings: [posting({ class_year: "target", title: "SWE - University Hire 2027" })] });
    renderApp(<NewGradList />);

    expect(await screen.findByText(/names the 2027 class/i)).toBeInTheDocument();
  });

  it("separates what is new, and reports what closed rather than dropping it", async () => {
    list({
      postings: [
        posting({ job_id: 1, title: "Old Software Engineer New Grad", is_new: false }),
        posting({ job_id: 2, title: "Fresh Software Engineer New Grad", is_new: true }),
      ],
      closed: [
        { job_id: 3, employer_name: "Scale AI", title: "Gone Software Engineer New Grad", url: null },
      ],
    });
    renderApp(<NewGradList />);

    const fresh = await screen.findByTestId("section-new");
    expect(fresh).toHaveTextContent("Fresh Software Engineer New Grad");
    expect(fresh).not.toHaveTextContent("Old Software Engineer New Grad");

    const gone = screen.getByTestId("section-closed");
    expect(gone).toHaveTextContent("Gone Software Engineer New Grad");
    expect(gone).toHaveTextContent("Scale AI");
  });

  it("only stops calling them new when the owner says so", async () => {
    /* Rendering must not advance the marker — a reload would spend the answer. The
       acknowledgement is a button, and the list refetches after it. */
    let acked = 0;
    server.use(
      http.post("/api/new-grad-list/ack", () => {
        acked += 1;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    list({ postings: [posting({ is_new: true })] });
    renderApp(<NewGradList />);

    await screen.findByTestId("section-new");
    expect(acked).toBe(0);

    await userEvent.click(screen.getByRole("button", { name: /caught up/i }));
    await waitFor(() => expect(acked).toBe(1));
  });

  it("says nothing is new rather than drawing an empty section", async () => {
    list({ postings: [posting({ is_new: false })] });
    renderApp(<NewGradList />);

    await screen.findByText("Software Engineer New Grad");
    expect(screen.queryByTestId("section-new")).not.toBeInTheDocument();
  });
});
