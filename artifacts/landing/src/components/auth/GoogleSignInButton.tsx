import { useEffect, useRef } from "react";

/**
 * Google's own sign-in button, rendered by Google's own library.
 *
 * Nothing here draws a button. A control we drew asking somebody for their
 * Google address is the shape of a phishing page whatever the intent, and the
 * ID token this page needs can only come from Google's library anyway.
 *
 * The script is loaded by `index.html` with `async defer`, so it may not have
 * arrived when this mounts. Rather than racing it, this polls briefly and gives
 * up quietly — the page's caller decides what to show when no button appears.
 */

type GoogleIdentity = {
  accounts: {
    id: {
      initialize(config: {
        client_id: string;
        callback: (response: { credential?: string }) => void;
        cancel_on_tap_outside?: boolean;
      }): void;
      renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

export function GoogleSignInButton({
  clientId,
  onCredential,
  disabled,
}: {
  clientId: string;
  onCredential: (credential: string) => void;
  disabled?: boolean;
}) {
  const slot = useRef<HTMLDivElement | null>(null);
  /* Held in a ref so the effect can stay keyed on `clientId` alone: re-running
     it because the parent re-rendered would tear down and redraw Google's
     button under the pointer. */
  const latest = useRef(onCredential);
  latest.current = onCredential;

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;

    function draw(): boolean {
      const identity = window.google?.accounts?.id;
      if (!identity || !slot.current || cancelled) return false;
      identity.initialize({
        client_id: clientId,
        callback: ({ credential }) => {
          if (credential) latest.current(credential);
        },
        // One Tap decides on its own when to appear; this page asks for a button.
        cancel_on_tap_outside: true,
      });
      /* Measured, not fixed. Google's `width` is a pixel number, so a constant
         one overflows any viewport narrower than itself plus the column's
         padding — at 320px a hardcoded 320 gave a 368px page and a horizontal
         scrollbar, which `jobs-page`'s spec forbids and which this page has no
         more right to. Clamped to Google's own 400px ceiling. */
      const available = slot.current.getBoundingClientRect().width;
      const width = Math.floor(Math.min(Math.max(available, 200), 400));

      identity.renderButton(slot.current, {
        theme: "outline",
        size: "large",
        width,
        text: "continue_with",
        shape: "rectangular",
      });
      return true;
    }

    if (draw()) return;

    // ~5s of 100ms checks. Longer than the script needs on any connection worth
    // waiting for, and short enough that a blocked script surfaces as a missing
    // button rather than a page that never settles.
    const timer = setInterval(() => {
      if (draw()) clearInterval(timer);
    }, 100);
    const stop = setTimeout(() => clearInterval(timer), 5000);

    return () => {
      cancelled = true;
      clearInterval(timer);
      clearTimeout(stop);
    };
  }, [clientId]);

  return (
    <div
      ref={slot}
      data-testid="google-signin"
      /* Full width of the column so the measurement above has something real to
         read; without it the div is zero-wide until Google fills it. */
      style={{ width: "100%" }}
      aria-busy={disabled ? "true" : undefined}
      className={disabled ? "pointer-events-none opacity-60" : undefined}
    />
  );
}
