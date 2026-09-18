import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import Login from "@/pages/Login";
import { renderApp } from "@/test/render";
import { http, HttpResponse, server } from "@/test/server";

/**
 * This file carries what `WaitlistForm.test.tsx` was installed to prove
 * (`dashboard-shell` tasks.md 2.2): that the web test harness works end to
 * end — a component rendering under the query client, a generated mutation
 * hook issuing a real request through the custom fetch mutator, and a typed
 * user event. The waitlist form was deleted with its feature; the login form
 * is the same shape and is shipping something the product depends on.
 *
 * If this file passes, the harness works. If it fails, nothing else in this
 * package is worth reading yet.
 *
 * The request body is asserted, not just the outcome: a mutation hook that
 * fired with the wrong payload still resolves, and a test that only watched
 * the screen would call that a pass.
 *
 * **The form moved, so these moved with it.** `/login` carries one Google
 * control and no fields; the form lives at `/login?password=1`, unlinked, as
 * the way in when Google's own configuration is wrong. Deleting this coverage
 * along with the form's place on the page would have shipped that fallback
 * untested, which is the one thing it cannot afford to be.
 */
describe("the password form, at /login?password=1", () => {
  it("posts the credentials and leaves the login page", async () => {
    let received: unknown = null;
    server.use(
      http.post("/api/auth/login", async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({
          email: "someone@example.com",
          isOwner: false,
        });
      }),
      // Invalidated on success, so it is asked for on the way out.
      http.get("/api/auth/me", () =>
        HttpResponse.json({ email: "someone@example.com", isOwner: false }),
      ),
    );

    const { currentPath } = renderApp(<Login />, { path: "/login?password=1" });

    await userEvent.type(
      screen.getByTestId("input-email"),
      "someone@example.com",
    );
    await userEvent.type(
      screen.getByTestId("input-password"),
      "a-long-enough-password",
    );
    await userEvent.click(screen.getByTestId("button-submit"));

    await waitFor(() => expect(currentPath()).toBe("/account"));
    expect(received).toEqual({
      email: "someone@example.com",
      password: "a-long-enough-password",
    });
  });

  it("keeps the form and shows the server's reason when sign-in is refused", async () => {
    server.use(
      http.post("/api/auth/login", () =>
        HttpResponse.json(
          { error: "Email or password is wrong" },
          { status: 401 },
        ),
      ),
    );

    const { currentPath } = renderApp(<Login />, { path: "/login?password=1" });

    await userEvent.type(
      screen.getByTestId("input-email"),
      "someone@example.com",
    );
    await userEvent.type(
      screen.getByTestId("input-password"),
      "a-long-enough-password",
    );
    await userEvent.click(screen.getByTestId("button-submit"));

    await waitFor(() =>
      expect(screen.getByTestId("error-auth")).toHaveTextContent(
        "Email or password is wrong",
      ),
    );
    expect(screen.getByTestId("form-signin")).toBeInTheDocument();
    expect(currentPath()).toBe("/login?password=1");
  });
});

describe("the sign-in page itself", () => {
  const CLIENT_ID = "1069740098250-test.apps.googleusercontent.com";

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("offers Google and no password field", async () => {
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", CLIENT_ID);
    renderApp(<Login />, { path: "/login" });

    /* The slot Google's library draws into is present; the fields are not. If
       this ever regresses the page quietly offers a path the owner removed. */
    expect(screen.getByTestId("google-signin")).toBeInTheDocument();
    expect(screen.queryByTestId("input-password")).not.toBeInTheDocument();
    expect(screen.queryByTestId("input-email")).not.toBeInTheDocument();
    expect(screen.queryByTestId("tab-signup")).not.toBeInTheDocument();
  });

  it("links to no other way of signing in", async () => {
    /* `?password=1` is reachable by typing, never by clicking — a link would
       put the form back on the page by the back door. */
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", CLIENT_ID);
    const { container } = renderApp(<Login />, { path: "/login" });
    const hrefs = Array.from(container.querySelectorAll("a")).map((a) =>
      a.getAttribute("href"),
    );
    expect(hrefs.some((href) => href?.includes("password"))).toBe(false);
  });

  it("falls back to the form when no client id is configured", async () => {
    /* A page with no working button and no form is a dead end, so the form
       stands in. This is the branch the first draft of the component could not
       be tested for, because it read the id at import. */
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "");
    renderApp(<Login />, { path: "/login" });

    expect(screen.getByTestId("input-email")).toBeInTheDocument();
    expect(screen.queryByTestId("google-signin")).not.toBeInTheDocument();
  });
});
