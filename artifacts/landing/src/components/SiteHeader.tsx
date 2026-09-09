import { useState } from "react";
import { Link } from "wouter";
import { SiGooglechrome } from "react-icons/si";
import { Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCoachAccess } from "@/hooks/use-coach-access";
import { CHROME_STORE_URL } from "@/lib/links";

/**
 * The home page is one long document, so the nav is anchors into it plus the two
 * things that leave: the store listing and the login.
 *
 * Log in is hidden below `sm` and appears in the hamburger sheet instead. Three
 * items plus the hamburger do not fit a 320px bar — the same reason the store
 * button shortens its label there.
 */
const SECTIONS = [
  { href: "#badges", label: "Badges" },
  { href: "#where", label: "Where it works" },
  { href: "#how", label: "How it works" },
  { href: "#data", label: "The data" },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  // Shares the /coach page's query key, so this adds no request of its own;
  // for anyone the server refuses it stays false and no link ever appears.
  const { hasAccess: showCoach } = useCoachAccess();

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

        <nav className="hidden md:flex items-center gap-7" aria-label="Sections">
          {SECTIONS.map((section) => (
            <a
              key={section.href}
              href={section.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              data-testid={`link-nav-${section.href.slice(1)}`}
            >
              {section.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {showCoach && (
            <Link
              href="/coach"
              className="hidden sm:inline-flex text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2"
              data-testid="link-coach"
            >
              Coach
            </Link>
          )}
          <Link
            href="/login"
            className="hidden sm:inline-flex text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2"
            data-testid="link-login"
          >
            Log in
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
          <nav className="flex flex-col gap-1" aria-label="Sections">
            {SECTIONS.map((section) => (
              <a
                key={section.href}
                href={section.href}
                onClick={() => setMenuOpen(false)}
                className="py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                data-testid={`link-mobile-${section.href.slice(1)}`}
              >
                {section.label}
              </a>
            ))}
            {showCoach && (
              <Link
                href="/coach"
                onClick={() => setMenuOpen(false)}
                className="py-2 text-sm font-medium text-foreground"
                data-testid="link-mobile-coach"
              >
                Coach
              </Link>
            )}
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="py-2 text-sm font-medium text-foreground"
              data-testid="link-mobile-login"
            >
              Log in
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
