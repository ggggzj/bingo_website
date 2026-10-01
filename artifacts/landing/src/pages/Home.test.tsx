import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import Home from "@/pages/Home";
import { CHROME_STORE_URL } from "@/lib/links";
import { renderApp } from "@/test/render";
import { http, HttpResponse, server } from "@/test/server";

/**
 * What the home page's last section offers.
 *
 * It used to offer a mailing list. Nobody ever joined — the production table
 * held zero rows — so the form, its route and its table are gone, and the
 * section is the Chrome call to action alone.
 *
 * The assertion that matters is the positive one. A test that only checked
 * for the absence of an email box would pass just as happily on a page that
 * threw before rendering anything, which is the usual way a removal test is
 * wrong. So the Chrome link is asserted present, with its real href, in the
 * same test.
 */
function signedOut() {
  server.use(
    http.get("/api/auth/me", () =>
      HttpResponse.json({ error: "Not signed in" }, { status: 401 }),
    ),
  );
}

const POSTING = {
  job_id: 1,
  employer_name: "Figma",
  title: "Software Engineer Intern (Summer 2027)",
  url: "https://job-boards.greenhouse.io/figma/jobs/1",
  location: "San Francisco, CA",
  is_remote: false,
  posted_at: "2026-09-17",
  tier: "strong",
  total_h1b_certified: 137,
  last_active_year: 2026,
  no_sponsor: null,
  location_read: "us",
  names_target_season: true,
};

const BOARD_NOTE =
  "Built from the employer job boards we poll. Employers running their own careers " +
  "site — TikTok, ByteDance, Amazon, Apple, Google and others — are not among them, " +
  "so this list is not all of the market.";

function withInternships(body: Record<string, unknown>) {
  server.use(http.get("/api/internships", () => HttpResponse.json(body)));
}

describe("the internships on the front page", () => {
  it("shows a signed-out visitor the postings, with the employer's filings on the row", async () => {
    signedOut();
    withInternships({
      total: 1,
      postings: [POSTING],
      newest_posted_at: "2026-09-17",
      board_note: BOARD_NOTE,
      preview: true,
    });

    renderApp(<Home />);

    expect(await screen.findByText("Software Engineer Intern (Summer 2027)")).toBeInTheDocument();
    expect(screen.getByText("Figma")).toBeInTheDocument();
    // The fact, not a checkmark — rendered by the shared component, not re-implemented.
    expect(screen.getByTestId("sponsorship-evidence")).toHaveTextContent(
      "137 certified H-1B filings",
    );
  });
});

describe("what the front page is allowed to show and say", () => {
  it("names the real number of hidden rows, and says nothing when none are hidden", async () => {
    signedOut();
    withInternships({
      total: 31,
      postings: [POSTING],
      newest_posted_at: "2026-09-17",
      board_note: BOARD_NOTE,
      preview: true,
    });

    renderApp(<Home />);

    // 31 matched, 1 shown. The server sends the total before the cut so this is a fact.
    expect(await screen.findByTestId("internships-more")).toHaveTextContent("30 more");
  });

  it("offers no 'more' line when the preview is the whole list", async () => {
    signedOut();
    withInternships({
      total: 1,
      postings: [POSTING],
      newest_posted_at: "2026-09-17",
      board_note: BOARD_NOTE,
      preview: true,
    });

    renderApp(<Home />);

    await screen.findByTestId("internship-block");
    expect(screen.queryByTestId("internships-more")).not.toBeInTheDocument();
  });

  it("gives a signed-in visitor every row and no sign-in control", async () => {
    server.use(
      http.get("/api/auth/me", () =>
        HttpResponse.json({ email: "someone@example.com", isOwner: false }),
      ),
    );
    withInternships({
      total: 2,
      postings: [POSTING, { ...POSTING, job_id: 2, title: "Software Developer Intern" }],
      newest_posted_at: "2026-09-17",
      board_note: BOARD_NOTE,
      preview: false,
    });

    renderApp(<Home />);

    expect(await screen.findByTestId("internship-2")).toBeInTheDocument();
    expect(screen.getByTestId("internship-1")).toBeInTheDocument();
    expect(screen.queryByTestId("internships-more")).not.toBeInTheDocument();
    expect(screen.queryByTestId("google-signin")).not.toBeInTheDocument();
    expect(screen.queryByTestId("form-signin")).not.toBeInTheDocument();
  });

  it("says what it cannot see even with nothing to show, and draws no empty frame", async () => {
    signedOut();
    withInternships({
      total: 0,
      postings: [],
      newest_posted_at: null,
      board_note: BOARD_NOTE,
      preview: true,
    });

    renderApp(<Home />);

    expect(await screen.findByTestId("internships-empty")).toBeInTheDocument();
    expect(screen.getByTestId("internships-board-note")).toHaveTextContent(
      "not all of the market",
    );
    expect(screen.queryByTestId("internships-more")).not.toBeInTheDocument();
  });

  it("still renders the introduction and the way in when the list fails to load", async () => {
    signedOut();
    server.use(
      http.get("/api/internships", () =>
        HttpResponse.json({ error: "Could not reach the job feed" }, { status: 502 }),
      ),
    );

    renderApp(<Home />);

    expect(await screen.findByTestId("internships-unavailable")).toBeInTheDocument();
    // The rest of the page is not collateral damage.
    expect(screen.getByTestId("link-download-extension")).toBeInTheDocument();
    expect(screen.getByText(/Know who sponsors/)).toBeInTheDocument();
    expect(screen.getByTestId("link-footer-cta-chrome")).toBeInTheDocument();
  });

  it("dates the block and never calls it live, daily or updated", async () => {
    signedOut();
    withInternships({
      total: 1,
      postings: [POSTING],
      newest_posted_at: "2026-09-17",
      board_note: BOARD_NOTE,
      preview: true,
    });

    const { container } = renderApp(<Home />);

    expect(await screen.findByTestId("internships-vintage")).toHaveTextContent("2026-09-17");
    /*
     * The words, banned on the whole page. The feed was twelve days stale the day this
     * was written, and "updated daily" beside a twelve-day-old row is the page lying on
     * its own. `refreshed quarterly` in the limits section is a different claim about a
     * different dataset and is deliberately not caught: the check is word-bounded.
     */
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/\bdaily\b/i);
    expect(text).not.toMatch(/\bupdated\b/i);
    /*
     * "live" is asserted differently, on purpose. The limits section has said
     * "The data is refreshed quarterly, by hand... It is not live." since long before
     * this block, and that sentence is the opposite of a freshness claim. So the rule is
     * that the word may appear only negated — a bare "live" would be the claim this page
     * must not make, and a blanket ban would have deleted an honest disclaimer instead.
     */
    for (const match of text.matchAll(/\blive\b/gi)) {
      const before = text.slice(Math.max(0, match.index - 12), match.index);
      expect(before, `"live" used as a claim: ...${before}[live]`).toMatch(/\bnot\s+$/i);
    }
  });

  it("expands the block when somebody signs in on the page itself", async () => {
    /*
     * The headline behaviour of the owner's decision 4 — stay on `/` and let the block
     * expand — and it was broken. `useForgetAuth` invalidated only the "who am I" key, so
     * `me` refetched, the panel vanished, and the list went on showing the cached preview
     * with "5 more. Sign in to see the rest." underneath it, to somebody who had just
     * signed in. Nothing refetches a sibling query because another one changed.
     *
     * This drives the real transition rather than starting signed in, which is why the
     * suite missed it: every other test here picks a side and stays on it.
     */
    let signedIn = false;
    server.use(
      http.get("/api/auth/me", () =>
        signedIn
          ? HttpResponse.json({ email: "someone@example.com", isOwner: false })
          : HttpResponse.json({ error: "Not signed in" }, { status: 401 }),
      ),
      http.post("/api/auth/login", () => {
        signedIn = true;
        return HttpResponse.json({ email: "someone@example.com", isOwner: false });
      }),
      http.get("/api/internships", () =>
        HttpResponse.json(
          signedIn
            ? {
                total: 2,
                postings: [POSTING, { ...POSTING, job_id: 2, title: "Software Developer Intern" }],
                newest_posted_at: "2026-09-17",
                board_note: BOARD_NOTE,
                preview: false,
              }
            : {
                total: 2,
                postings: [POSTING],
                newest_posted_at: "2026-09-17",
                board_note: BOARD_NOTE,
                preview: true,
              },
        ),
      ),
    );

    renderApp(<Home />, { path: "/?password=1" });

    expect(await screen.findByTestId("internships-more")).toHaveTextContent("1 more");

    await userEvent.type(screen.getByTestId("input-email"), "someone@example.com");
    await userEvent.type(screen.getByTestId("input-password"), "a-long-enough-password");
    await userEvent.click(screen.getByTestId("button-submit"));

    // The row that was behind the cut arrives without a reload...
    expect(await screen.findByTestId("internship-2")).toBeInTheDocument();
    // ...and nobody is invited to sign in twice.
    await waitFor(() =>
      expect(screen.queryByTestId("internships-more")).not.toBeInTheDocument(),
    );
    expect(screen.queryByTestId("signin-panel")).not.toBeInTheDocument();
  });

  it("keeps the 72,135 database count away from the job rows", async () => {
    signedOut();
    withInternships({
      total: 1,
      postings: [POSTING],
      newest_posted_at: "2026-09-17",
      board_note: BOARD_NOTE,
      preview: true,
    });

    const { container } = renderApp(<Home />);
    await screen.findByTestId("internship-block");

    /*
     * 72,135 is real — `../h1_checker/docs/ARCHITECTURE.md` says the `employers` table
     * holds exactly that — but it counts employers in a DATABASE, not employers hiring.
     * Beside a list of open jobs it reads as the second, so it belongs only to the data
     * section far below. The hero used to carry it and lost it when the jobs moved up.
     */
    const all = Array.prototype.slice.call(container.querySelectorAll("*"));
    const block = all.indexOf(container.querySelector('[data-testid="internship-block"]'));
    const counts = all
      .map((el, i) => [el, i] as const)
      .filter(([el]) => el.children.length === 0 && (el.textContent ?? "").includes("72,135"))
      .map(([, i]) => i);

    expect(counts.length).toBeGreaterThan(0); // it is still on the page, correctly labelled
    for (const at of counts) expect(at).toBeGreaterThan(block);
  });

  it("puts the way in and the extension link before the introduction at 320px", async () => {
    signedOut();
    withInternships({
      total: 1,
      postings: [POSTING],
      newest_posted_at: "2026-09-17",
      board_note: BOARD_NOTE,
      preview: true,
    });

    const { container } = renderApp(<Home />);
    await screen.findByTestId("internship-block");

    /*
     * Asserted as DOM order, which is what a 320px single column renders: jsdom has no
     * layout, so a width assertion here would prove nothing. The order is the owner's,
     * inherited from 2026-09-20 — what this is, the way in, the extension link, the
     * internships, then the introduction.
     */
    const order = (testId: string) =>
      Array.prototype.indexOf.call(
        container.querySelectorAll("*"),
        container.querySelector(`[data-testid="${testId}"]`),
      );

    expect(order("signin-panel")).toBeGreaterThan(-1);
    expect(order("signin-panel")).toBeLessThan(order("link-download-extension"));
    expect(order("link-download-extension")).toBeLessThan(order("internship-block"));
    expect(order("internship-block")).toBeLessThan(order("link-footer-cta-chrome"));
  });
});

describe("the home page's closing section", () => {
  it("offers the extension and no mailing list", async () => {
    signedOut();
    renderApp(<Home />);

    const cta = await screen.findByTestId("link-footer-cta-chrome");
    expect(cta).toHaveAttribute("href", CHROME_STORE_URL);
    expect(cta).toHaveTextContent("Add it to Chrome now");
    // "Or" was the other half of "leave your email, or add it to Chrome". With the
    // form gone it referred to nothing, so the removal has to take it too.
    expect(cta.textContent?.trimStart().startsWith("Or")).toBe(false);

    expect(screen.queryByTestId("input-waitlist-email")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("button-waitlist-submit"),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("form-waitlist")).not.toBeInTheDocument();
  });

  it("says nothing about a mailing list anywhere on the page", async () => {
    signedOut();
    renderApp(<Home />);

    await screen.findByTestId("link-footer-cta-chrome");

    expect(screen.queryByText(/mailing list/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/hear about what comes next/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/keep me posted/i)).not.toBeInTheDocument();
  });
});
