import { SiGooglechrome } from "react-icons/si";

import { CHROME_STORE_URL, PRIVACY_POLICY_URL } from "@/lib/links";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 font-bold text-foreground tracking-tight">
              <span
                className="w-7 h-7 rounded-lg bg-primary text-primary-foreground grid place-items-center text-xs font-extrabold shrink-0"
                aria-hidden
              >
                B
              </span>
              BingoCareer
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              H1B sponsorship intel, on the job boards you already use.
            </p>
          </div>

          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2" aria-label="Footer">
            <a
              href={CHROME_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              data-testid="link-footer-chrome-store"
            >
              <SiGooglechrome className="w-4 h-4 shrink-0" aria-hidden />
              Chrome Web Store
            </a>
            {/* Served by the extension's API, not by this site. */}
            <a
              href={PRIVACY_POLICY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              data-testid="link-footer-privacy"
            >
              Privacy policy
            </a>
          </nav>
        </div>

        <p className="text-xs text-muted-foreground/80 leading-relaxed mt-8 pt-8 border-t border-border/60 max-w-3xl">
          BingoCareer summarizes public U.S. Department of Labor H-1B LCA disclosure
          data. It is an information tool, not legal or immigration advice. Confirm
          sponsorship with the employer before you rely on it.
        </p>
      </div>
    </footer>
  );
}
