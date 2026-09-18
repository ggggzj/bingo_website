import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { SiteHeader } from "@/components/SiteHeader";
import { renderApp } from "@/test/render";
import { http, HttpResponse, server } from "@/test/server";

/**
 * The marketing header's one job here: offer the right door. It used to offer
 * "Log in" unconditionally — so a signed-in visitor coming back to the home
 * page was invited to sign in again — and a "Coach" link that only appeared
 * for allowlisted users, which is a distinction that no longer exists.
 *
 * Asking for nothing but `/auth/me` is enforced by the setup's
 * unhandled-request error: the coach probe this component used to make would
 * fail these tests.
 */
function signedIn() {
  server.use(
    http.get("/api/auth/me", () =>
      HttpResponse.json({ email: "someone@example.com", isOwner: false }),
    ),
  );
}

function signedOut() {
  server.use(
    http.get("/api/auth/me", () =>
      HttpResponse.json({ error: "Not signed in" }, { status: 401 }),
    ),
  );
}

describe("the site header", () => {
  it("offers the dashboard to someone already signed in", async () => {
    signedIn();
    renderApp(<SiteHeader />);

    expect(await screen.findByTestId("link-dashboard")).toBeInTheDocument();
    expect(screen.queryByTestId("link-login")).not.toBeInTheDocument();
  });

  it("offers the login to a visitor", async () => {
    signedOut();
    renderApp(<SiteHeader />);

    expect(await screen.findByTestId("link-login")).toBeInTheDocument();
    expect(screen.queryByTestId("link-dashboard")).not.toBeInTheDocument();
  });

  it("carries no coach link for anyone", async () => {
    signedIn();
    renderApp(<SiteHeader />);

    await screen.findByTestId("link-dashboard");
    expect(screen.queryByTestId("link-coach")).not.toBeInTheDocument();
    expect(screen.queryByText("Coach")).not.toBeInTheDocument();
  });

  it("says the same thing inside the mobile menu", async () => {
    signedIn();
    renderApp(<SiteHeader />);

    await screen.findByTestId("link-dashboard");
    await userEvent.click(screen.getByTestId("button-menu-toggle"));

    expect(screen.getByTestId("link-mobile-dashboard")).toBeInTheDocument();
    expect(screen.queryByTestId("link-mobile-login")).not.toBeInTheDocument();
    expect(screen.queryByTestId("link-mobile-coach")).not.toBeInTheDocument();
  });
});
