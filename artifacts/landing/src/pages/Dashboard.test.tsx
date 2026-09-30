import { cleanup, screen } from "@testing-library/react";
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

/**
 * `extra` carries the feed-freshness fields. They are deliberately absent from TOTALS:
 * upstream sends them, but a body without them is legal, and the view must survive one.
 */
function statsServed(extra: Record<string, unknown> = {}) {
  server.use(
    http.get("/api/stats", () => HttpResponse.json({ ...TOTALS, ...extra })),
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

/**
 * The feed stopped twice — 20 days in August, 12 in September — and both times nobody
 * noticed, because this page said nothing about it. The hour numbers below are literals
 * on purpose: the threshold lives in Dashboard.tsx and is deliberately NOT imported here.
 * A test that reads 30 from the page can only ever agree with the page, and the number the
 * owner chose would stop being checked by anything.
 */
describe("the growth view says when the job feed last moved", () => {
  async function freshness(extra: Record<string, unknown>) {
    signedIn(true);
    statsServed(extra);
    renderApp(<Dashboard />);
    return screen.findByTestId("feed-freshness");
  }

  it("names the job feed, so it cannot be read as a claim about the other numbers", async () => {
    const line = await freshness({
      feed_last_sync: "2026-09-30T09:00:00Z",
      feed_hours_stale: 2,
    });

    expect(line).toHaveTextContent(/job feed/i);
    expect(line).toHaveTextContent(/2 hours/);
    expect(line).toHaveAttribute("data-state", "fresh");
  });

  it("marks a stopped feed as an alarm and says how stale", async () => {
    // 288 hours is the twelve days the feed was actually frozen for.
    const line = await freshness({
      feed_last_sync: "2026-09-18T11:00:00Z",
      feed_hours_stale: 288,
    });

    expect(line).toHaveAttribute("data-state", "stale");
    expect(line).toHaveTextContent(/12 days/);
  });

  it("puts the line at thirty hours, not near it", async () => {
    const under = await freshness({
      feed_last_sync: "2026-09-29T06:00:00Z",
      feed_hours_stale: 29,
    });
    expect(under).toHaveAttribute("data-state", "fresh");

    cleanup();

    const over = await freshness({
      feed_last_sync: "2026-09-29T04:00:00Z",
      feed_hours_stale: 31,
    });
    expect(over).toHaveAttribute("data-state", "stale");
  });

  it("treats never-synced as its own state and never prints it as a number", async () => {
    // Both fields are null together upstream when no sync has ever run. Rendering that
    // as 0 would read as "just now" — the exact inverse of the truth.
    const line = await freshness({ feed_last_sync: null, feed_hours_stale: null });

    expect(line).toHaveAttribute("data-state", "never");
    expect(line).toHaveTextContent(/never/i);
    expect(line.textContent).not.toMatch(/\d/);
  });

  it("survives a body that carries neither field", async () => {
    signedIn(true);
    statsServed();
    renderApp(<Dashboard />);

    expect(await screen.findByText("Installs, all time")).toBeInTheDocument();
    expect(screen.getByTestId("feed-freshness")).toHaveAttribute(
      "data-state",
      "never",
    );
  });
});
