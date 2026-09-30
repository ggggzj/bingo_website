import { ExternalLink, Loader2, MapPin } from "lucide-react";
import {
  getGetInternshipsQueryKey,
  useGetInternships,
} from "@workspace/api-client-react";
import type { InternshipPosting } from "@workspace/api-client-react";

import { SponsorshipEvidence } from "@/components/jobs/SponsorshipEvidence";

/**
 * The US software internships, on the front page.
 *
 * Its own file rather than another hundred lines of `Home.tsx`, which is already 450.
 * Tested through `Home.test.tsx`, because what matters is what a visitor to `/` sees.
 *
 * **What this block may not say.** Not "live", not "daily", not "updated". It states the
 * date of the newest row it is actually showing and stops there. The reason is measured
 * rather than stylistic: on 2026-09-30 the feed's newest posting was 2026-09-18, twelve
 * days old, because the ingest next door had stopped. A block headed "latest, updated
 * daily" over rows nobody had refreshed in twelve days is a lie the page tells by
 * default, and the only defence that survives a stopped feed is to print the date.
 *
 * **What it may not merge.** The employer's filings and the posting's own refusal stay
 * two claims, rendered by `SponsorshipEvidence`, imported rather than re-implemented —
 * so `no_sponsor: null` keeps meaning nobody has read it rather than "does not sponsor".
 */

/** Only http and https ever become an href; a `javascript:` URL executes in this origin. */
function safeHref(url: string | null | undefined): string | null {
  if (!url) return null;
  return /^https?:\/\//i.test(url) ? url : null;
}

function Row({ posting }: { posting: InternshipPosting }) {
  const href = safeHref(posting.url);

  return (
    <li
      className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4"
      data-testid={`internship-${posting.job_id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-foreground">{posting.title}</p>
          <p className="text-sm text-muted-foreground">{posting.employer_name}</p>
        </div>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground inline-flex items-center gap-1"
            data-testid={`internship-apply-${posting.job_id}`}
          >
            Open
            <ExternalLink className="w-3 h-3" aria-hidden />
          </a>
        ) : null}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <MapPin className="w-3 h-3 shrink-0" aria-hidden />
        {/* Marked, never assumed American — the same three words the contract uses. */}
        {posting.location_read === "unknown" ? (
          <span data-testid={`internship-location-unknown-${posting.job_id}`}>
            Location could not be read
          </span>
        ) : (
          <span>{posting.location ?? "Location not stated"}</span>
        )}
      </div>

      <SponsorshipEvidence posting={posting} />
    </li>
  );
}

export function InternshipBlock() {
  const { data, isPending, error } = useGetInternships({
    query: {
      // The generated options type demands a key once any option is passed; taken from
      // the generator so the two cannot drift (`replit.md`).
      queryKey: getGetInternshipsQueryKey(),
      // A 502 from a stopped feed is an ordinary answer here, not a flake worth retrying.
      retry: false,
    },
  });

  if (isPending) {
    return (
      <div
        className="flex items-center gap-2 text-sm text-muted-foreground"
        data-testid="internships-loading"
      >
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> Loading internships…
      </div>
    );
  }

  /*
   * A failure here must not take the page with it. The introduction and the way in are
   * the rest of `/`, and both still work when the job feed does not — so this says so
   * and renders nothing else.
   */
  if (error || !data) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="internships-unavailable">
        The internship list could not be loaded just now.
      </p>
    );
  }

  const { postings, total, newest_posted_at, board_note, preview } = data;
  const more = total - postings.length;

  return (
    <section className="flex flex-col gap-4" data-testid="internship-block">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-foreground">
          US software internships at employers that sponsor
        </h2>
        {/* The vintage, stated. Every row here is from an employer with certified DOL
            filings, which is the one thing a job board normally cannot promise. */}
        <p className="text-xs text-muted-foreground" data-testid="internships-vintage">
          {newest_posted_at
            ? `Newest posting shown: ${newest_posted_at}.`
            : "No postings to show right now."}
        </p>
      </div>

      {postings.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-testid="internships-empty">
          Nothing matched right now.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {postings.map((posting) => (
            <Row key={posting.job_id} posting={posting} />
          ))}
        </ul>
      )}

      {/* Only when the preview actually cut something, and it names the real number —
          the server sends `total` before the cut so this cannot be a guess. */}
      {preview && more > 0 ? (
        <p className="text-sm text-muted-foreground" data-testid="internships-more">
          {more} more. Sign in to see the rest.
        </p>
      ) : null}

      <p className="text-xs text-muted-foreground" data-testid="internships-board-note">
        {board_note}
      </p>
    </section>
  );
}

export default InternshipBlock;
