import { Loader2 } from "lucide-react";
import {
  getGetNewGradListQueryKey,
  useAckNewGradList,
  useGetNewGradList,
  type NewGradClosed,
  type NewGradPosting,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

import { SponsorshipEvidence } from "@/components/jobs/SponsorshipEvidence";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * The owner's own list of US early-career software postings.
 *
 * What this page is for is not the filter — `/jobs` filters too. It is that this one
 * remembers: what arrived since the last look, and what closed since it. A spreadsheet
 * re-run on request can hold neither.
 *
 * Three things it deliberately does not do. It renders no seniority badge and asserts
 * nothing about what a posting "is" — it is a title search and says so, which is the
 * line `openspec/specs/jobs-page/spec.md` already draws. It shows no score and no
 * deadline, because these postings publish none. And it never advances the marker by
 * being looked at: the acknowledgement is a button, so a reload cannot spend the one
 * answer the page exists to give.
 */

function daysSince(posted: string | null | undefined): number | null {
  if (!posted) return null;
  const then = Date.parse(posted);
  if (Number.isNaN(then)) return null;
  return Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
}

function Row({
  posting,
  targetYear,
}: {
  posting: NewGradPosting;
  targetYear: number;
}) {
  const age = daysSince(posting.posted_at);

  return (
    <Card data-testid={`posting-${posting.job_id}`}>
      <CardContent className="flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex flex-col gap-0.5">
            <span className="font-medium">{posting.title}</span>
            <span className="text-sm text-muted-foreground">
              {posting.employer_name}
            </span>
          </div>
          {posting.url ? (
            <Button asChild size="sm" variant="outline">
              <a href={posting.url} target="_blank" rel="noreferrer noopener">
                Apply
              </a>
            </Button>
          ) : null}
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
          <span>{posting.location ?? "Location not stated"}</span>
          {/* Marked, never assumed. The upstream has no country and the string it does
              have is whatever a provider typed, so an unreadable one is shown as
              unreadable rather than quietly counted as American. */}
          {posting.location_read === "unknown" ? (
            <Badge variant="outline" data-testid="location-unconfirmed">
              US? not stated clearly
            </Badge>
          ) : null}
          {posting.posted_at ? (
            <span>
              posted {posting.posted_at}
              {age === null ? "" : ` · ${age} days ago`}
            </span>
          ) : (
            <span>no posted date</span>
          )}
        </div>

        {/* The ordering's reason, on the row, so it can be disagreed with. A req that
            names an intake is a fixed number of seats — an observed property of the
            posting, not a prediction about the reader. */}
        {posting.class_year === "target" ? (
          <span className="text-xs">
            Title names the {targetYear} class — one intake, closes when filled
          </span>
        ) : null}

        <SponsorshipEvidence posting={posting} />
      </CardContent>
    </Card>
  );
}

function ClosedRow({ posting }: { posting: NewGradClosed }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-0.5 p-4">
        <span className="font-medium line-through">{posting.title}</span>
        <span className="text-sm text-muted-foreground">{posting.employer_name}</span>
        <span className="text-xs text-muted-foreground">
          No longer listed on its board
        </span>
      </CardContent>
    </Card>
  );
}

export function NewGradList() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useGetNewGradList();
  const ack = useAckNewGradList({
    mutation: {
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: getGetNewGradListQueryKey() }),
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading the list…
      </div>
    );
  }

  if (error || !data) {
    return (
      <p className="text-sm text-destructive">
        Could not load the list. The job feed may be unreachable.
      </p>
    );
  }

  const fresh = data.postings.filter((p) => p.is_new);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">
          {data.target_class_year} new-grad software roles, US
        </h2>
        {/* Said with postings and with none. A reader who does not know what is
            missing reads an empty list as an answer about the market. */}
        <p className="text-xs text-muted-foreground">{data.board_note}</p>
        <p className="text-xs text-muted-foreground">
          A title search, not a classification — nothing here is labelled by seniority.
        </p>
      </div>

      {fresh.length > 0 ? (
        <section className="flex flex-col gap-3" data-testid="section-new">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="text-sm font-medium">
              New since you last looked ({fresh.length})
            </h3>
            <Button
              size="sm"
              variant="secondary"
              disabled={ack.isPending}
              onClick={() => ack.mutate()}
            >
              I&apos;m caught up
            </Button>
          </div>
          {fresh.map((posting) => (
            <Row
              key={posting.job_id}
              posting={posting}
              targetYear={data.target_class_year}
            />
          ))}
        </section>
      ) : null}

      {data.closed.length > 0 ? (
        <section className="flex flex-col gap-3" data-testid="section-closed">
          <h3 className="text-sm font-medium">
            Closed since you last looked ({data.closed.length})
          </h3>
          {data.closed.map((posting) => (
            <ClosedRow key={posting.job_id} posting={posting} />
          ))}
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">
          Everything open ({data.postings.length})
        </h3>
        {data.postings.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing matches right now.
          </p>
        ) : (
          data.postings.map((posting) => (
            <Row
              key={posting.job_id}
              posting={posting}
              targetYear={data.target_class_year}
            />
          ))
        )}
      </section>
    </div>
  );
}

export default NewGradList;
