import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppRoutes } from "@/App";
import { renderApp } from "@/test/render";
import { http, HttpResponse, server } from "@/test/server";

/**
 * Where the two addresses send somebody, and — the one that has actually bitten this
 * repo — where they do *not* send somebody while the answer to "who am I" is still in
 * flight.
 *
 * `/login` is an address rather than a destination now: the way in is on `/`. The form
 * stays reachable at `?password=1`, unlinked, because nine identities hold passwords and
 * because it is the way in on the day Google's configuration is wrong.
 */

function signedOut() {
  server.use(
    http.get("/api/auth/me", () =>
      HttpResponse.json({ error: "Not signed in" }, { status: 401 }),
    ),
  );
}

function signedIn() {
  server.use(
    http.get("/api/auth/me", () =>
      HttpResponse.json({ email: "someone@example.com", isOwner: false }),
    ),
  );
}

function noInternships() {
  server.use(
    http.get("/api/internships", () =>
      HttpResponse.json({
        total: 0,
        postings: [],
        newest_posted_at: null,
        board_note: "Built from the employer job boards we poll.",
        preview: true,
      }),
    ),
  );
}

describe("/login", () => {
  it("sends everybody to the front page", async () => {
    signedOut();
    noInternships();

    const { currentPath } = renderApp(<AppRoutes views={[]} />, { path: "/login" });

    await waitFor(() => expect(currentPath()).toBe("/"));
  });

  it("still renders the password form behind ?password=1", async () => {
    signedOut();

    const { currentPath } = renderApp(<AppRoutes views={[]} />, {
      path: "/login?password=1",
    });

    expect(await screen.findByTestId("form-signin")).toBeInTheDocument();
    expect(currentPath()).toBe("/login?password=1");
  });
});

describe("/", () => {
  it("keeps a signed-in visitor where they are", async () => {
    signedIn();
    noInternships();

    const { currentPath, history } = renderApp(<AppRoutes views={[]} />, { path: "/" });

    await screen.findByTestId("internship-block");
    expect(currentPath()).toBe("/");
    // Not merely "ended up at /" — never went anywhere at all.
    expect(history).toEqual(["/"]);
  });

  it("navigates nowhere while who-am-I is still unresolved", async () => {
    /*
     * The bug this whole test exists for, and the one that has happened here before: a
     * redirect that reads `isSignedIn` before `/auth/me` has answered sees `false` and
     * bounces a signed-in visitor off the page. `/auth/me` never resolves below, so if
     * anything navigates on a half-known identity, `history` grows and this fails.
     */
    server.use(http.get("/api/auth/me", () => new Promise(() => {})));
    noInternships();

    const { history } = renderApp(<AppRoutes views={[]} />, { path: "/" });

    await screen.findByTestId("internship-block");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(history).toEqual(["/"]);
  });
});
