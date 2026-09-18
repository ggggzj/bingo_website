import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Account from "@/pages/Account";
import { renderApp } from "@/test/render";
import { http, HttpResponse, server } from "@/test/server";

/**
 * `/account` after the shell took over the logged-in area: who you are, a way
 * out, and one way in. It deliberately does not enumerate the views — the rail
 * does that, and two places listing them is how they come to disagree.
 *
 * It is also the page an ordinary user lands on, so it has to be useful
 * without knowing anything about what they are entitled to. That it asks for
 * nothing but `/auth/me` is enforced here by the setup's unhandled-request
 * error: any extra call fails these tests.
 */
function signedIn(isOwner: boolean) {
  server.use(
    http.get("/api/auth/me", () =>
      HttpResponse.json({ email: "someone@example.com", isOwner }),
    ),
  );
}

describe("the account page", () => {
  it("shows who you are, one way in, and a way out", async () => {
    signedIn(false);
    renderApp(<Account />);

    expect(await screen.findByTestId("text-account-email")).toHaveTextContent(
      "someone@example.com",
    );
    expect(screen.getByTestId("link-dashboard")).toBeInTheDocument();
    expect(screen.getByTestId("button-signout")).toBeInTheDocument();
  });

  it("lists no views, not even for the owner", async () => {
    signedIn(true);
    renderApp(<Account />);

    await screen.findByTestId("link-dashboard");
    expect(screen.queryByText("Growth dashboard")).not.toBeInTheDocument();
    expect(screen.queryByText("Interview practice")).not.toBeInTheDocument();
    expect(screen.queryByTestId("link-coach-console")).not.toBeInTheDocument();
  });
});
