import { screen } from "@testing-library/react";
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
