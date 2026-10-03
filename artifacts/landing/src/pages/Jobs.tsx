import { useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { ExternalLink, Loader2, MapPin } from "lucide-react";
import {
  getGetInternshipsQueryKey,
  getGetJobsQueryKey,
  useGetInternships,
  useGetJobs,
  type GetJobsParams,
  type JobPosting,
} from "@workspace/api-client-react";

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
 *
 * **Two sections, two sources.** *All roles* is this page's feed and its filters. *Summer
 * 2027 internships* is the front page's list (`/api/internships`), shown as it arrives:
 * the precise intern test runs on the server, where the count is computed, so this page
 * offers no filter over it — a filter here could only narrow rows already fetched, the
 * shape the `jobs-page` spec forbids. That is also why it is a section and not a preset
 * in the picker, which still has none (`FilterRow.tsx`).
 */

const PAGE_SIZE = 20;

/** The `section` value in the URL that selects the internships list. */
export const INTERNSHIPS_SECTION = "summer-2027";

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
  // How many pages have been asked for. Reset whenever the filters change, because
  // page three of one search is meaningless in another.
  const [pages, setPages] = useState(1);
  const search = useSearch();
  const [pathname, navigate] = useLocation();
  const query = useMemo(() => new URLSearchParams(search), [search]);

  // The section lives in the URL beside the selection, for the same reasons.
  const inInternships = query.get("section") === INTERNSHIPS_SECTION;

  // The selected posting lives in the URL so a role can be linked to and shared, and
  // so the back button means what a reader expects.
  const selectedId = useMemo(() => {
    const raw = query.get("job");
    const id = raw ? Number(raw) : NaN;
    return Number.isInteger(id) ? id : null;
  }, [query]);

  const { employer, title, location, remote_only, posted_within_days, include_refusals } =
    filters;

  const jobsParams: GetJobsParams = {
    ...(employer ? { employer } : {}),
    ...(title ? { title } : {}),
    ...(location ? { location } : {}),
    ...(remote_only ? { remote_only: true } : {}),
    ...(posted_within_days ? { posted_within_days } : {}),
    ...(include_refusals ? { include_refusals: true } : {}),
    limit: PAGE_SIZE * pages,
  };

  // Each section asks only its own endpoint. The generated options type demands a key
  // once any option is passed; taken from the generator so the two cannot drift.
  const jobs = useGetJobs(jobsParams, {
    query: { queryKey: getGetJobsQueryKey(jobsParams), enabled: !inInternships },
  });
  const internships = useGetInternships({
    query: {
      queryKey: getGetInternshipsQueryKey(),
      enabled: inInternships,
      // A 502 from a stopped feed is an ordinary answer, not a flake worth retrying.
      retry: false,
    },
  });

  const active = inInternships ? internships : jobs;
  const isLoading = active.isLoading;
  const isError = active.isError;
  const shown: JobPosting[] = active.data?.postings ?? [];
  const total = active.data?.total ?? 0;
  const hasMore = shown.length < total;
  const noun = inInternships ? "internships" : "roles";

  const selected = shown.find((p) => p.job_id === selectedId) ?? null;

  const changeFilters = (next: JobFilters) => {
    setPages(1);
    setFilters(next);
  };

  // Through the router, not `window.history`: `useSearch` reads the router's location,
  // which is the browser's in the app and a memory one in tests. Either way the panes
  // swap in place — wouter pushes a history entry, it does not reload.
  const go = (next: URLSearchParams) => {
    const qs = next.toString();
    navigate(`${pathname}${qs ? `?${qs}` : ""}`);
  };

  const select = (job_id: number) => {
    const next = new URLSearchParams(search);
    next.set("job", String(job_id));
    go(next);
  };

  const showSection = (internshipsSection: boolean) => {
    const next = new URLSearchParams(search);
    if (internshipsSection) next.set("section", INTERNSHIPS_SECTION);
    else next.delete("section");
    // A selection made in one list means nothing in the other.
    next.delete("job");
    go(next);
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

      <div role="tablist" aria-label="Sections" className="mb-4 flex gap-2">
        {[
          { label: "All roles", internshipsSection: false },
          { label: "Summer 2027 internships", internshipsSection: true },
        ].map(({ label, internshipsSection }) => (
          <Button
            key={label}
            type="button"
            role="tab"
            aria-selected={inInternships === internshipsSection}
            variant={inInternships === internshipsSection ? "default" : "outline"}
            size="sm"
            onClick={() => showSection(internshipsSection)}
          >
            {label}
          </Button>
        ))}
      </div>

      {inInternships ? (
        // The section's name is the list's, not a claim about each row: on 2026-10-02
        // it held a Winter 2027 internship too. One line says so.
        <p className="text-sm text-muted-foreground mb-4" data-testid="section-scope">
          US software internships at employers that sponsor. Those naming Summer 2027
          come first; the list is not limited to them.
        </p>
      ) : (
        <div className="mb-4">
          <FilterRow
            filters={filters}
            onChange={changeFilters}
            onReset={() => {
              setPages(1);
              setFilters({});
            }}
          />
        </div>
      )}

      <div className="text-sm text-muted-foreground mb-3" data-testid="result-count">
        {isLoading
          ? "Loading…"
          : isError
            ? inInternships
              ? "The internships could not be loaded just now."
              : "The job feed could not be reached."
            : hasMore
              ? // Say both numbers. A bare "8,607 roles" over a list of twenty is a
                // count that describes something the reader cannot reach.
                `Showing ${shown.length.toLocaleString()} of ${total.toLocaleString()} ${noun}`
              : `${total.toLocaleString()} ${noun}`}
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
              {inInternships ? "No internships matched right now." : "No roles match these filters."}
            </div>
          ) : (
            <>
              {shown.map((posting) => (
                <PostingCard
                  key={posting.job_id}
                  posting={posting}
                  selected={posting.job_id === selectedId}
                  onSelect={() => select(posting.job_id)}
                />
              ))}
              {/* The internships list has no further page to ask for: a signed-out
                  answer is a preview, and what it withheld is said below instead. */}
              {hasMore && !inInternships ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPages((n) => n + 1)}
                  data-testid="load-more"
                >
                  Show more roles
                </Button>
              ) : null}
            </>
          )}
        </div>

        <div className="rounded-lg border md:sticky md:top-6 md:max-h-[70vh] md:overflow-y-auto">
          <DetailPane posting={selected} />
        </div>
      </div>

      {/* A requirement, not copy. Saying what the feed does not cover is what keeps
          the limit a stated scope rather than something a reader finds by searching
          for a company and getting nothing back. */}
      {inInternships && internships.data ? (
        <div className="mt-4 flex flex-col gap-2">
          {/* Only when the preview actually cut something, from the server's own total. */}
          {internships.data.preview && total > shown.length ? (
            <p className="text-sm text-muted-foreground" data-testid="internships-more">
              {total - shown.length} more. Sign in to see the rest.
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground" data-testid="internships-board-note">
            {internships.data.board_note}
          </p>
        </div>
      ) : null}

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
