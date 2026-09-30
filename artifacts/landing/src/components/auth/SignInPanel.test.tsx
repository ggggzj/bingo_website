import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { describe, expect, it, vi } from "vitest";

import { SignInPanel } from "@/components/auth/SignInPanel";
import { Toaster } from "@/components/ui/toaster";
import { renderApp } from "@/test/render";
import { http, HttpResponse, server } from "@/test/server";

/**
 * The three things a copy of this component would lose.
 *
 * `Login.test.tsx` covers the sign-in that ships; these are about the component being one
 * component. Each is a branch that exists for a failure nobody sees in normal use — the
 * unlinked back door, the dead end when Google is misconfigured, and the notice for
 * somebody whose password stopped working — so each is exactly the kind of thing a second
 * copy silently drops.
 *
 * `destination` is asserted alongside, because the whole reason this is a component rather
 * than a page is that two callers disagree about where you end up.
 */
describe("SignInPanel", () => {
  it("reaches the password form through the unlinked ?password=1 door", () => {
    /*
     * The client id is stubbed **on purpose**, and it is the whole point of the test.
     * Under vitest `VITE_GOOGLE_CLIENT_ID` is empty, which turns on the other branch that
     * shows this same form — so without a client id here, deleting the `?password=1` door
     * entirely leaves this test green. It did: mutation-checked 2026-09-30, and this is
     * the rewrite. With an id present, the form can only be the door.
     */
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "1069740098250-test.apps.googleusercontent.com");

    const withDoor = renderApp(<SignInPanel />, { path: "/login?password=1" });
    expect(screen.getByTestId("form-signin")).toBeInTheDocument();
    expect(screen.getByTestId("input-email")).toBeInTheDocument();
    expect(screen.getByTestId("input-password")).toBeInTheDocument();
    withDoor.unmount();

    // And without it, the form is not on the page at all — one control, by decision.
    renderApp(<SignInPanel />, { path: "/login" });
    expect(screen.queryByTestId("form-signin")).not.toBeInTheDocument();
    expect(screen.getByTestId("google-signin")).toBeInTheDocument();

    vi.unstubAllEnvs();
  });

  it("shows the form rather than a dead end when there is no client id", () => {
    /*
     * `VITE_GOOGLE_CLIENT_ID` is unset under vitest, which is the empty-client-id branch
     * itself: with no id there is no button Google could draw, and a page with neither a
     * button nor a form is a page nobody can sign in on. The form stands in.
     */
    expect(import.meta.env["VITE_GOOGLE_CLIENT_ID"] ?? "").toBe("");

    renderApp(<SignInPanel />, { path: "/" });

    expect(screen.getByTestId("form-signin")).toBeInTheDocument();
  });

  it("says so when the account's password has just been removed", async () => {
    /*
     * The notice hangs off the **Google** path, not the form — a password sign-in never
     * clears a password. So the only honest way to reach it is through Google's own
     * library, stubbed here to hand back the callback it would have called. The first
     * draft of this test drove the password form, saw no toast, and was right to fail.
     */
    let handOverCredential: ((r: { credential?: string }) => void) | null = null;
    (window as unknown as { google: unknown }).google = {
      accounts: {
        id: {
          initialize: ({ callback }: { callback: (r: { credential?: string }) => void }) => {
            handOverCredential = callback;
          },
          renderButton: () => {},
        },
      },
    };

    server.use(
      http.post("/api/auth/google", () =>
        HttpResponse.json({
          email: "someone@example.com",
          isOwner: false,
          passwordCleared: true,
        }),
      ),
      http.get("/api/auth/me", () =>
        HttpResponse.json({ email: "someone@example.com", isOwner: false }),
      ),
    );

    // A client id, so the panel draws the Google control rather than the fallback form.
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "1069740098250-test.apps.googleusercontent.com");

    renderApp(
      <>
        <SignInPanel />
        <Toaster />
      </>,
      { path: "/" },
    );

    await waitFor(() => expect(handOverCredential).not.toBeNull());
    act(() => handOverCredential!({ credential: "a-google-id-token" }));

    await waitFor(() =>
      expect(screen.getByText("This account now signs in with Google")).toBeInTheDocument(),
    );

    vi.unstubAllEnvs();
    delete (window as unknown as { google?: unknown }).google;
  });

  it("goes where the caller says, and stays put when the caller says null", async () => {
    server.use(
      http.post("/api/auth/login", () =>
        HttpResponse.json({ email: "someone@example.com", isOwner: false }),
      ),
      http.get("/api/auth/me", () =>
        HttpResponse.json({ email: "someone@example.com", isOwner: false }),
      ),
    );

    const { currentPath } = renderApp(<SignInPanel destination={() => null} />, {
      path: "/?password=1",
    });

    await userEvent.type(screen.getByTestId("input-email"), "someone@example.com");
    await userEvent.type(screen.getByTestId("input-password"), "a-long-enough-password");
    await userEvent.click(screen.getByTestId("button-submit"));

    // The signed-in answer arrived and the page did not move: group 5's whole requirement.
    await waitFor(() => expect(screen.queryByTestId("error-auth")).not.toBeInTheDocument());
    expect(currentPath()).toBe("/?password=1");
  });

  it("carries the line about the extension having its own sign-in", () => {
    renderApp(<SignInPanel />, { path: "/" });

    expect(screen.getByTestId("text-extension-signin")).toBeInTheDocument();
  });
});
