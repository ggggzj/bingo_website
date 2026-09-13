import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { WaitlistForm } from "@/components/WaitlistForm";
import { renderApp } from "@/test/render";
import { http, HttpResponse, server } from "@/test/server";

/**
 * The first test in this package, and deliberately not about the dashboard
 * work that installed the runner. It covers what a new frontend test setup
 * usually gets wrong rather than what a feature is doing: a component
 * rendering under the query client, a generated mutation hook issuing a real
 * request through the custom fetch mutator, and a typed user event.
 *
 * If this file passes, the harness works. If it fails, nothing else in this
 * package is worth reading yet.
 */
describe("WaitlistForm", () => {
  it("posts the address and then says you are on the list", async () => {
    let received: unknown = null;
    server.use(
      http.post("/api/waitlist", async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({ id: 1, email: "you@example.com" }, { status: 201 });
      }),
    );

    renderApp(<WaitlistForm />);
    await userEvent.type(
      screen.getByTestId("input-waitlist-email"),
      "you@example.com",
    );
    await userEvent.click(screen.getByTestId("button-waitlist-submit"));

    await waitFor(() =>
      expect(screen.getByTestId("status-waitlist-success")).toBeInTheDocument(),
    );
    expect(received).toEqual({ email: "you@example.com" });
  });

  it("keeps the form and shows the server's reason when the post fails", async () => {
    server.use(
      http.post("/api/waitlist", () =>
        HttpResponse.json({ error: "Already on the list" }, { status: 409 }),
      ),
    );

    renderApp(<WaitlistForm />);
    await userEvent.type(
      screen.getByTestId("input-waitlist-email"),
      "you@example.com",
    );
    await userEvent.click(screen.getByTestId("button-waitlist-submit"));

    await waitFor(() =>
      expect(screen.getByTestId("error-waitlist-submit")).toHaveTextContent(
        "Already on the list",
      ),
    );
    expect(screen.getByTestId("form-waitlist")).toBeInTheDocument();
  });
});
