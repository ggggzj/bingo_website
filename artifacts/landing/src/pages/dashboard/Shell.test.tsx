import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppRoutes } from "@/App";
import { VIEWS as SHIPPED_VIEWS, type DashboardView } from "@/pages/dashboard/views";
import { renderApp } from "@/test/render";
import { http, HttpResponse, server } from "@/test/server";

/**
 * The shell's own behaviour: which entries the rail draws, where an
 * unaddressed or unentitled view goes, and that a single entitlement renders
 * no switcher at all.
 *
 * The views are stubs rather than the real growth and practice pages. The
 * registry is a parameter of the shell for the same reason the coach router
 * takes a store: the thing under test here is the frame, and pulling in two
 * dashboards' worth of endpoints would test them instead. What the real
 * registry declares is covered by each view's own tests, and by typecheck.
 */
const VIEWS: DashboardView[] = [
  {
    id: "growth",
    label: "Growth",
    blurb: "Installs and registrations.",
    entitled: (viewer) => viewer.isOwner,
    Component: () => <p>growth view</p>,
  },
  {
    id: "practice",
    label: "Practice",
    blurb: "Today's plan.",
    entitled: (viewer) => viewer.isSignedIn,
    Component: () => <p>practice view</p>,
  },
];

function signedIn(isOwner: boolean) {
  server.use(
    http.get("/api/auth/me", () =>
      HttpResponse.json({ email: "someone@example.com", isOwner }),
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

describe("the dashboard shell", () => {
  it("draws one rail entry per view the owner may use", async () => {
    signedIn(true);
    renderApp(<AppRoutes views={VIEWS} />, { path: "/dashboard/growth" });

    expect(await screen.findByText("growth view")).toBeInTheDocument();
    const rail = screen.getByTestId("nav-dashboard-rail");
    expect(rail).toHaveTextContent("Growth");
    expect(rail).toHaveTextContent("Practice");
  });

  it("gives a viewer with one view no switcher at all", async () => {
    signedIn(false);
    renderApp(<AppRoutes views={VIEWS} />, { path: "/dashboard/practice" });

    expect(await screen.findByText("practice view")).toBeInTheDocument();
    expect(screen.queryByTestId("nav-dashboard-rail")).not.toBeInTheDocument();
    // Not merely hidden: nothing names the view they cannot use.
    expect(screen.queryByText("Growth")).not.toBeInTheDocument();
    // The frame still belongs to the shell.
    expect(screen.getByTestId("button-signout")).toBeInTheDocument();
  });

  it("sends an unaddressed dashboard to the first view this viewer may use", async () => {
    signedIn(false);
    const { currentPath } = renderApp(<AppRoutes views={VIEWS} />, {
      path: "/dashboard",
    });

    expect(await screen.findByText("practice view")).toBeInTheDocument();
    expect(currentPath()).toBe("/dashboard/practice");
  });

  it("shows the ordinary not-found page for a view this viewer may not use", async () => {
    signedIn(false);
    renderApp(<AppRoutes views={VIEWS} />, { path: "/dashboard/growth" });

    // The wording the whole site uses for an address that is not a page —
    // anything that read as "you were refused" would confirm there is
    // something here to be refused.
    expect(await screen.findByText("Page not found")).toBeInTheDocument();
    expect(screen.queryByText("growth view")).not.toBeInTheDocument();
    // The not-found page stands alone — no rail, no frame around it.
    expect(screen.queryByTestId("nav-dashboard-rail")).not.toBeInTheDocument();
  });

  it("keeps the old coach address working", async () => {
    signedIn(false);
    const { currentPath } = renderApp(<AppRoutes views={VIEWS} />, {
      path: "/coach",
    });

    expect(await screen.findByText("practice view")).toBeInTheDocument();
    expect(currentPath()).toBe("/dashboard/practice");
  });

  it("sends a signed-out visitor to the login page", async () => {
    signedOut();
    const { currentPath } = renderApp(<AppRoutes views={VIEWS} />, {
      path: "/dashboard/practice",
    });

    await waitFor(() => expect(currentPath()).toBe("/login"));
    expect(screen.queryByText("practice view")).not.toBeInTheDocument();
  });
});

/**
 * The real registry, not the stubs above.
 *
 * The shell's behaviour is tested with stand-ins so it can be exercised without two
 * dashboards' worth of endpoints. What that cannot catch is an entitlement written
 * wrongly on a real entry — `entitled` is convenience for drawing the rail, but an
 * entry that offers itself to the wrong viewer is still a bug worth failing on, and
 * this is the only place the shipped array is read.
 */
describe("the shipped registry", () => {
  const owner = { isSignedIn: true, isOwner: true };
  const stranger = { isSignedIn: true, isOwner: false };
  // Aliased on import: this file already has a local `VIEWS` of stand-ins, and reading
  // that one here would assert the stubs are right rather than the shipped array.
  const view = (id: string) => SHIPPED_VIEWS.find((v) => v.id === id)!;

  it("offers the new-grad list to the owner and to nobody else", () => {
    expect(view("new-grad")).toBeDefined();
    expect(view("new-grad").entitled(owner)).toBe(true);
    expect(view("new-grad").entitled(stranger)).toBe(false);
    expect(view("new-grad").entitled({ isSignedIn: false, isOwner: false })).toBe(false);
  });

  it("leaves growth owner-only and practice open to everyone signed in", () => {
    /* Pinned beside the new entry: adding one to this array is how the next feature
       arrives, and the cheapest way to break the other two is to edit around them. */
    expect(view("growth").entitled(stranger)).toBe(false);
    expect(view("practice").entitled(stranger)).toBe(true);
  });
});
