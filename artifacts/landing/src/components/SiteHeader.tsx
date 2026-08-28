import { useState } from "react";
import { Link } from "wouter";
import { SiGooglechrome } from "react-icons/si";
import { Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CHROME_STORE_URL } from "@/lib/links";

/**
 * The home page is one long document, so the nav is anchors into it plus the one
 * thing that leaves: the store listing.
 *
 * There is deliberately no "Log in" entry. `/login` exists in this repo but the
 * deployed site is static — `vercel.json` rewrites every path to `index.html` and
 * there is no API behind it — so the page would load and then fail every request.
 * Add the link back in the same change that puts an API behind `/api`.
 */
const SECTIONS = [
  { href: "#badges", label: "Badges" },
  { href: "#where", label: "Where it works" },
  { href: "#how", label: "How it works" },
  { href: "#data", label: "The data" },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

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
          </nav>
        </div>
      )}
    </header>
  );
}
