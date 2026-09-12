import type { JobPosting } from "@workspace/api-client-react";

import { Badge } from "@/components/ui/badge";

/**
 * The two sponsorship facts, kept apart.
 *
 * This is the whole reason the page exists. A competitor's job list at the same scale
 * shows company, title, location, source, date and skill tags, and nothing about
 * sponsorship — its sponsorship database lives on a different page entirely. Here the
 * filings are on the row.
 *
 * Two claims, never merged into one verdict:
 *
 *   the EMPLOYER's claim — how many certified H-1B filings the Department of Labor
 *   recorded for this company, and through which year. A fact with a source.
 *
 *   THIS POSTING's claim — whether its own job description refuses sponsorship. A
 *   different statement about a different thing.
 *
 * They can disagree for one company: an employer with 137 filings can post a role
 * whose text says it will not sponsor. A reader has to be able to see which is which,
 * so this renders them as two separate lines and never as a single badge.
 *
 * `no_sponsor` has three states and the third is the one that gets mishandled:
 *
 *   true  → this posting's text refuses
 *   false → its text was read and does not refuse
 *   null  → NOBODY HAS READ IT YET
 *
 * Null renders nothing. Treating "we have not looked" as "does not sponsor" would be
 * a false claim about a real employer, and it is the exact mistake this component
 * exists to make impossible.
 */

function filingYears(posting: JobPosting): string | null {
  return posting.last_active_year ? `through ${posting.last_active_year}` : null;
}

export function SponsorshipEvidence({ posting }: { posting: JobPosting }) {
  const filings = posting.total_h1b_certified;
  const years = filingYears(posting);
  const refuses = posting.no_sponsor === true;

  return (
    <div className="flex flex-col gap-1" data-testid="sponsorship-evidence">
      {filings > 0 ? (
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={posting.tier === "strong" ? "default" : "secondary"}>
            {filings.toLocaleString()} certified H-1B filings
          </Badge>
          {years ? (
            <span className="text-xs text-muted-foreground">{years}</span>
          ) : null}
        </div>
      ) : (
        // Zero filings is itself a fact, and a different one from "we did not check".
        <span className="text-xs text-muted-foreground">
          No certified H-1B filings on record
        </span>
      )}

      {/* Only `true` draws anything. `false` needs no line — the absence of a refusal
          is not news — and `null` must not draw one, because no description has been
          read. */}
      {refuses ? (
        <span
          className="text-xs text-destructive"
          data-testid="posting-refuses-sponsorship"
        >
          This posting says it will not sponsor
        </span>
      ) : null}
    </div>
  );
}

export default SponsorshipEvidence;
