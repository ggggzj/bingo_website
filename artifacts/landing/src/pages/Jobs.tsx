import { useMemo, useState } from "react";
import { useSearch } from "wouter";
import { ExternalLink, Loader2, MapPin } from "lucide-react";
import { useGetJobs, type JobPosting } from "@workspace/api-client-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilterRow, type JobFilters } from "@/components/jobs/FilterRow";
import { SponsorshipEvidence } from "@/components/jobs/SponsorshipEvidence";

/**
 * The public job feed.
 *
 * A feed, deliberately, not a search engine. The postings come from a limited set of
 * employer job boards, so a search box promising to find any company could not keep
 * that promise — the page opens on the list and says on itself what it covers. That
 * sentence near the bottom is a requirement, not copy: it is what makes the coverage
 * limit a stated scope rather than a defect a reader discovers by searching for a
 * company and getting nothing.
 *
 * Read-only and identity-free. Nothing here reads a session or writes anything, so
 * opening it twice returns the same page.
 */

const PAGE_SIZE = 20;

function postedAgo(posted_at: string | null | undefined): string | null {
  if (!posted_at) return null;
  const days = Math.floor(
    (Date.now() - new Date(posted_at).getTime()) / (24 * 60 * 60 * 1000),
  );
  if (!Number.isFinite(days) || days < 0) return null;
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  return `${Math.floor(days / 30)} mo ago`;
}

/**
 * Only http and https are ever rendered as a link.
 *
 * Upstream already withholds anything else, so this is the second of two locks on the
 * same door. It stays because the page is the thing that puts a board's string into
 * an href, and a `javascript:` href executes in this origin.
 */
function safeHref(url: string | null | undefined): string | null {
  if (!url) return null;
  return /^https?:\/\//i.test(url) ? url : null;
}

function PostingCard({
  posting,
  selected,
  onSelect,
}: {
  posting: JobPosting;
  selected: boolean;
  onSelect: () => void;
}) {
  const age = postedAgo(posting.posted_at);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected}
      data-testid={`posting-card-${posting.job_id}`}
      className={`w-full text-left rounded-lg border p-4 transition-colors ${
        selected ? "border-primary bg-accent" : "border-border hover:bg-accent/50"
      }`}
    >
      <div className="font-medium leading-snug">{posting.title}</div>
      <div className="text-sm text-muted-foreground mt-0.5">
        {posting.employer_name}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
        {posting.location ? (
          <span className="inline-flex items-center gap-1">
            <MapPin className="w-3 h-3" aria-hidden />
            {posting.location}
          </span>
        ) : null}
        {posting.is_remote ? <Badge variant="outline">Remote</Badge> : null}
        {age ? <span>{age}</span> : null}
      </div>
      <div className="mt-2">
        <SponsorshipEvidence posting={posting} />
      </div>
    </button>
  );
}

function DetailPane({ posting }: { posting: JobPosting | null }) {
  if (!posting) {
    return (
      <div className="text-sm text-muted-foreground p-6" data-testid="detail-empty">
        Pick a role on the left to see it here.
      </div>
    );
  }

  const href = safeHref(posting.url);

  return (
    <div className="p-6 flex flex-col gap-4" data-testid="posting-detail">
      <div>
        <h2 className="text-xl font-semibold leading-tight">{posting.title}</h2>
        <div className="text-muted-foreground mt-1">{posting.employer_name}</div>
      </div>

      <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground">
        {posting.location ? <span>{posting.location}</span> : null}
        {posting.is_remote ? <Badge variant="outline">Remote</Badge> : null}
        {posting.posted_at ? <span>Posted {posting.posted_at}</span> : null}
      </div>

      {/* Where the reference products put a resume-match gauge and two blurred
          "unlock with premium" cards, this page puts the filings, free. */}
      <div className="rounded-lg border p-4">
        <div className="text-sm font-medium mb-2">Sponsorship evidence</div>
        <SponsorshipEvidence posting={posting} />
        <p className="text-xs text-muted-foreground mt-3">
          Counts come from certified H-1B Labor Condition Applications published by the
          U.S. Department of Labor. Filing history is evidence of past sponsorship, not
          a promise of future sponsorship.
        </p>
      </div>

      {href ? (
        <Button asChild size="lg" data-testid="apply-link">
          <a href={href} target="_blank" rel="noopener noreferrer">
            Apply on the company site
            <ExternalLink className="w-4 h-4 ml-2" aria-hidden />
          </a>
        </Button>
      ) : (
        // Upstream withheld the URL, which it does for any scheme that is not http or
        // https. No substitute is invented from another field; the row stays readable.
        <div className="text-sm text-muted-foreground" data-testid="apply-unavailable">
          This posting did not come with a usable application link.
        </div>
      )}
    </div>
  );
}

export default function Jobs() {
  const [filters, setFilters] = useState<JobFilters>({});
  const search = useSearch();

  // The selected posting lives in the URL so a role can be linked to and shared, and
  // so the back button means what a reader expects.
  const selectedId = useMemo(() => {
    const raw = new URLSearchParams(search).get("job");
    const id = raw ? Number(raw) : NaN;
    return Number.isInteger(id) ? id : null;
  }, [search]);

  const { employer, title, location, remote_only, posted_within_days, include_refusals } =
    filters;

  const { data, isLoading, isError } = useGetJobs({
    ...(employer ? { employer } : {}),
    ...(title ? { title } : {}),
    ...(location ? { location } : {}),
    ...(remote_only ? { remote_only: true } : {}),
    ...(posted_within_days ? { posted_within_days } : {}),
    ...(include_refusals ? { include_refusals: true } : {}),
    limit: PAGE_SIZE,
  });

  const postings: JobPosting[] = data?.postings ?? [];

  // "Only employers with filing history" narrows on the employer's claim, which the
  // upstream route does not take as a parameter, so it is applied here over the page.
  const shown = filters.only_with_filings
    ? postings.filter((p) => p.total_h1b_certified > 0)
    : postings;

  const selected = shown.find((p) => p.job_id === selectedId) ?? null;

  const select = (job_id: number) => {
    const next = new URLSearchParams(search);
    next.set("job", String(job_id));
    // replaceState rather than a navigation: the detail pane swaps in place.
    window.history.pushState({}, "", `${window.location.pathname}?${next}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  return (
    <main className="min-h-[100dvh] px-4 py-6 md:px-8">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold">Jobs that sponsor</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Roles at employers with a record of sponsoring H-1B visas, with the filings
          shown on every listing.
        </p>
      </header>

      <div className="mb-4">
        <FilterRow
          filters={filters}
          onChange={setFilters}
          onReset={() => setFilters({})}
        />
      </div>

      <div className="text-sm text-muted-foreground mb-3" data-testid="result-count">
        {isLoading
          ? "Loading…"
          : isError
            ? "The job feed could not be reached."
            : `${(filters.only_with_filings ? shown.length : (data?.total ?? 0)).toLocaleString()} roles`}
      </div>

      {/* Stacks below md; each pane scrolls on its own above it. */}
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,380px)_minmax(0,1fr)] gap-4">
        <div
          className="flex flex-col gap-3 md:max-h-[70vh] md:overflow-y-auto md:pr-1"
          data-testid="posting-list"
        >
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground p-4">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> Loading roles…
            </div>
          ) : shown.length === 0 ? (
            <div className="text-sm text-muted-foreground p-4">
              No roles match these filters.
            </div>
          ) : (
            shown.map((posting) => (
              <PostingCard
                key={posting.job_id}
                posting={posting}
                selected={posting.job_id === selectedId}
                onSelect={() => select(posting.job_id)}
              />
            ))
          )}
        </div>

        <div className="rounded-lg border md:sticky md:top-6 md:max-h-[70vh] md:overflow-y-auto">
          <DetailPane posting={selected} />
        </div>
      </div>

      {/* A requirement, not copy. Saying what the feed does not cover is what keeps
          the limit a stated scope rather than something a reader finds by searching
          for a company and getting nothing back. */}
      <footer className="mt-8 text-xs text-muted-foreground max-w-3xl">
        <p>
          This feed is drawn from the job boards of employers already known to sponsor,
          not from every employer in the United States. Large filers that do not publish
          a public board are absent, so a company missing here has not been judged — it
          has not been indexed.
        </p>
        <p className="mt-2">
          Sponsorship counts come from certified H-1B Labor Condition Applications
          published by the U.S. Department of Labor. A filing history is a signal, not a
          guarantee: whether a particular role will be sponsored is the employer&apos;s
          decision.
        </p>
      </footer>
    </main>
  );
}
