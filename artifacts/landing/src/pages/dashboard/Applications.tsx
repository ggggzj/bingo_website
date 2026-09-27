import { Loader2 } from "lucide-react";
import { useGetApplications, type Application } from "@workspace/api-client-react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * The applications the owner has already sent.
 *
 * This is the one view here whose rows were not produced by this system. They come from
 * `~/Desktop/job_dashboard`, the folder the owner actually applies from, and arrive when they
 * run the import. Two consequences the page has to carry rather than hide:
 *
 * - **The imported half is exactly as old as the last import.** Stated in the header, because
 *   a week with no new rows is otherwise indistinguishable from a week with no applications.
 * - **Not every status is the owner's.** Most rows carry whatever Simplify's export said.
 *   Those are marked, so the page never reports a default back to them as their own judgement.
 *
 * No score, no match percentage, no predicted reply date. "Applied 14 days ago" is arithmetic
 * on two dates; anything shaped like a probability is the thing this product removed once.
 */

/** The order they are counted in, worst-to-best left aside: this is the funnel's own order. */
const STATUS_ORDER = ["saved", "applied", "interview", "closed"] as const;

function statusCounts(applications: Application[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const application of applications) {
    counts.set(application.status, (counts.get(application.status) ?? 0) + 1);
  }
  const known = STATUS_ORDER.filter((status) => counts.has(status)).map(
    (status) => [status, counts.get(status)!] as [string, number],
  );
  // Anything the folder invents later still gets counted rather than silently dropped.
  const rest = [...counts.entries()].filter(
    ([status]) => !STATUS_ORDER.includes(status as (typeof STATUS_ORDER)[number]),
  );
  return [...known, ...rest];
}

function Row({ application }: { application: Application }) {
  return (
    <TableRow data-testid={`application-${application.id}`}>
      <TableCell className="align-top">
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">{application.company}</span>
          <span className="text-sm text-muted-foreground">{application.role}</span>
        </div>
      </TableCell>
      <TableCell className="align-top text-sm text-muted-foreground">
        <div className="flex flex-col gap-0.5">
          <span>{application.location ?? "Location not stated"}</span>
          {application.ats ? <span className="text-xs">{application.ats}</span> : null}
        </div>
      </TableCell>
      <TableCell className="align-top">
        <div className="flex flex-col items-start gap-1">
          <Badge variant={application.status === "closed" ? "outline" : "secondary"}>
            {application.status}
          </Badge>
          {/* Said plainly: this one is a line from a CSV, not something you decided. */}
          {application.status_source === "import" ? (
            <span
              className="text-[11px] text-muted-foreground"
              data-testid="status-from-import"
            >
              from the import
            </span>
          ) : null}
          {application.stage ? (
            <span className="text-xs text-muted-foreground">{application.stage}</span>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="align-top text-sm text-muted-foreground">
        <div className="flex flex-col gap-0.5">
          <span>{application.applied_date ?? "not sent"}</span>
          {/* Absent rather than zero for a row never sent: zero would read as "today". */}
          {application.days_waiting === null || application.days_waiting === undefined ? null : (
            <span className="text-xs">{application.days_waiting} days</span>
          )}
        </div>
      </TableCell>
      <TableCell className="align-top text-sm">
        {application.note ? (
          <span className="text-muted-foreground">{application.note}</span>
        ) : null}
      </TableCell>
      <TableCell className="align-top text-right">
        {application.url ? (
          <a
            className="text-sm underline underline-offset-4"
            href={application.url}
            target="_blank"
            rel="noreferrer noopener"
          >
            Posting
          </a>
        ) : null}
      </TableCell>
    </TableRow>
  );
}

export function Applications() {
  const { data, isLoading, error } = useGetApplications();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your applications…
      </div>
    );
  }

  if (error || !data) {
    return (
      <p className="text-sm text-destructive">
        Could not load your applications.
      </p>
    );
  }

  const importedOn = data.imported_at ? data.imported_at.slice(0, 10) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">Applications you have sent</h2>
        <p className="text-xs text-muted-foreground" data-testid="import-age">
          {importedOn
            ? `Imported from your job_dashboard folder on ${importedOn}. Company, role, dates and the archived job description come from there; status, stage and notes live here.`
            : "Nothing has been imported yet."}
        </p>
      </div>

      {data.applications.length === 0 ? (
        <div
          className="rounded-md border border-dashed p-6 text-sm text-muted-foreground"
          data-testid="empty-state"
        >
          This fills when you push the folder up:{" "}
          <code className="text-xs">
            pnpm --filter @workspace/api-server run import-applications
          </code>
          , which <code className="text-xs">add_job.py</code> already runs for you after every
          application.
        </div>
      ) : (
        <>
          <div
            className="flex flex-wrap items-center gap-2 text-sm"
            data-testid="status-counts"
          >
            {statusCounts(data.applications).map(([status, count]) => (
              <Badge key={status} variant="outline">
                {status} {count}
              </Badge>
            ))}
            <span className="text-xs text-muted-foreground">
              {data.applications.length} in total
            </span>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Where</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Note</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.applications.map((application) => (
                <Row key={application.id} application={application} />
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  );
}

export default Applications;
