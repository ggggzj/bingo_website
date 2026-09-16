import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

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
 */
describe("Login", () => {
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

    const { currentPath } = renderApp(<Login />, { path: "/login" });

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

    const { currentPath } = renderApp(<Login />, { path: "/login" });

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
    expect(currentPath()).toBe("/login");
  });
});
