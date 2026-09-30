import { useState } from "react";
import { Link } from "wouter";
import { SiGooglechrome } from "react-icons/si";
import { Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { CHROME_STORE_URL } from "@/lib/links";

/**
 * The header is the store listing and one door into the account.
 *
 * That door is "Dashboard" for someone signed in and "Log in" for everyone
 * else, never both. It used to be "Log in" unconditionally, which invited a
 * signed-in visitor to sign in again; the coach link that sat beside it is gone
 * because there is no longer an allowlist to be on.
 *
 * It used to carry four anchors into the home page as well. They went when the
 * front page stopped being one long document to scroll: `/` now opens on the
 * jobs and the way in, and an anchor that jumps past both is pointing at the
 * part a visitor came for last.
 */

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  // Shares the query key every page uses for "who am I", so this adds no
  // request of its own.
  const { isSignedIn } = useAuth();
  const door = isSignedIn
    ? { href: "/dashboard", label: "Dashboard", testId: "dashboard" }
    : { href: "/login", label: "Log in", testId: "login" };

  return (
    <header className="sticky top-0 z-50 w-full bg-background/85 backdrop-blur-md border-b border-border/60">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-bold text-foreground tracking-tight"
          data-testid="link-home"
        >
          <span
            className="w-8 h-8 rounded-lg bg-primary text-primary-foreground grid place-items-center text-sm font-extrabold shrink-0"
            aria-hidden
          >
            B
          </span>
          BingoCareer
        </Link>


        <div className="flex items-center gap-2">
          <Link
            href={door.href}
            className="hidden sm:inline-flex text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2"
            data-testid={`link-${door.testId}`}
          >
            {door.label}
          </Link>

          <Button asChild size="sm" className="h-9 px-4">
            <a
              href={CHROME_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-header-add-to-chrome"
            >
              <SiGooglechrome className="w-4 h-4 shrink-0" aria-hidden />
              {/* Full label pushes the hamburger off a 320px screen. */}
              <span className="sm:hidden">Add</span>
              <span className="hidden sm:inline">Add to Chrome</span>
            </a>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            data-testid="button-menu-toggle"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {menuOpen && (
        <div
          className="md:hidden border-t border-border/60 bg-background px-6 py-4"
          data-testid="menu-mobile"
        >
          <nav className="flex flex-col gap-1" aria-label="Account">
            <Link
              href={door.href}
              onClick={() => setMenuOpen(false)}
              className="py-2 text-sm font-medium text-foreground"
              data-testid={`link-mobile-${door.testId}`}
            >
              {door.label}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
