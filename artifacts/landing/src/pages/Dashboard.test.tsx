import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Dashboard from "@/pages/Dashboard";
import { renderApp } from "@/test/render";
import { http, HttpResponse, server } from "@/test/server";

/**
 * The growth view, now that the shell owns the frame. Two things matter here
 * and neither is a chart: the server's refusal still stands on its own, and
 * the view no longer carries chrome the shell renders once.
 */
const TOTALS = {
  total_clients: 12,
  weekly_active: 5,
  total_registrations: 3,
  total_followers: 1,
  checks_7d: 40,
  referral_sources: { chrome: 9 },
};

function signedIn(isOwner: boolean) {
  server.use(
    http.get("/api/auth/me", () =>
      HttpResponse.json({ email: "someone@example.com", isOwner }),
    ),
  );
}

/** Totals live at `/api/stats` itself; only daily and registrations are nested. */
function statsRefused() {
  server.use(
    http.get("/api/stats", () =>
      HttpResponse.json({ error: "Not found" }, { status: 404 }),
    ),
    http.get("/api/stats/daily", () =>
      HttpResponse.json({ error: "Not found" }, { status: 404 }),
    ),
    http.get("/api/stats/registrations", () =>
      HttpResponse.json({ error: "Not found" }, { status: 404 }),
    ),
  );
}

function statsServed() {
  server.use(
    http.get("/api/stats", () => HttpResponse.json(TOTALS)),
    http.get("/api/stats/daily", () =>
      HttpResponse.json({ days: 30, series: [] }),
    ),
    http.get("/api/stats/registrations", () =>
      HttpResponse.json({ total: 0, rows: [] }),
    ),
  );
}

describe("the growth view", () => {
  it("still answers a refusal with the ordinary not-found page", async () => {
    // The client-side entitlement is not what protects this. Even told it is
    // the owner, the view shows nothing once the server says 404.
    signedIn(true);
    statsRefused();
    renderApp(<Dashboard />);

    expect(await screen.findByText("Page not found")).toBeInTheDocument();
    expect(screen.queryByText("Installs, all time")).not.toBeInTheDocument();
  });

  it("renders its numbers without chrome the shell already owns", async () => {
    signedIn(true);
    statsServed();
    renderApp(<Dashboard />);

    expect(await screen.findByText("Installs, all time")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.queryByTestId("button-signout")).not.toBeInTheDocument();
  });
});
