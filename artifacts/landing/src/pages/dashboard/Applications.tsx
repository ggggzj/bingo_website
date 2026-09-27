import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetApplicationsQueryKey,
  useGetApplications,
  useUpdateApplication,
  type Application,
  type ApplicationEdit,
  type ApplicationEditStatus,
} from "@workspace/api-client-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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

/** The four this tracker uses, which are the four the owner's own folder uses. */
const STATUSES = ["saved", "applied", "interview", "closed"] as const satisfies readonly ApplicationEditStatus[];

function knownStatus(value: string): value is ApplicationEditStatus {
  return (STATUSES as readonly string[]).includes(value);
}

function Row({
  application,
  onEdit,
  failed,
}: {
  application: Application;
  onEdit: (id: number, edit: ApplicationEdit) => void;
  failed: boolean;
}) {
  /**
   * Local copies for the two text fields, so typing does not fight the refetch. They are
   * sent on blur and only when they actually changed — leaving a field alone must not write
   * a trail row saying it changed.
   */
  const [stage, setStage] = useState(application.stage ?? "");
  const [note, setNote] = useState(application.note ?? "");

  function commit(field: "stage" | "note", value: string, was: string | null | undefined) {
    const next = value.trim();
    const before = (was ?? "").trim();
    if (next === before) return;
    onEdit(application.id, { [field]: next.length > 0 ? next : null });
  }

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
          <select
            className="w-full rounded-md border bg-background px-2 py-1 text-sm"
            data-testid={`status-select-${application.id}`}
            aria-label={`Status for ${application.company}`}
            value={application.status}
            onChange={(event) => {
              // Narrowed rather than cast: the server refuses anything outside the four, so
              // sending an unknown value would be asking for a 400 the owner cannot act on.
              const picked = event.target.value;
              if (knownStatus(picked)) onEdit(application.id, { status: picked });
            }}
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
            {/* A value the folder produced that this vocabulary does not contain stays
                visible — the row is not silently rewritten to something the owner never
                chose — but cannot be picked again, because the server would refuse it. */}
            {knownStatus(application.status) ? null : (
              <option value={application.status} disabled>
                {application.status} (from the folder)
              </option>
            )}
          </select>
          {/* Said plainly: this one is a line from a CSV, not something you decided. */}
          {application.status_source === "import" ? (
            <span
              className="text-[11px] text-muted-foreground"
              data-testid="status-from-import"
            >
              from the import
            </span>
          ) : null}
          <Input
            className="h-7 w-full text-xs"
            placeholder="stage"
            data-testid={`stage-input-${application.id}`}
            aria-label={`Stage for ${application.company}`}
            value={stage}
            onChange={(event) => setStage(event.target.value)}
            onBlur={() => commit("stage", stage, application.stage)}
          />
          {failed ? (
            <span
              className="text-[11px] text-destructive"
              data-testid={`save-failed-${application.id}`}
            >
              Not saved — try again
            </span>
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
        <Input
          className="h-8 w-full text-xs"
          placeholder="note"
          data-testid={`note-input-${application.id}`}
          aria-label={`Note for ${application.company}`}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          onBlur={() => commit("note", note, application.note)}
        />
      </TableCell>
      <TableCell className="align-top text-right whitespace-nowrap">
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
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useGetApplications();
  /**
   * Which rows failed to save. Kept per row rather than as one banner: at 94 rows a page-level
   * "something went wrong" does not say which change was lost, and a change the owner believes
   * they made is worse than one they know failed.
   */
  const [failed, setFailed] = useState<Set<number>>(new Set());
  const update = useUpdateApplication({
    mutation: {
      onSuccess: (_result, variables) => {
        setFailed((was) => {
          const next = new Set(was);
          next.delete(variables.id);
          return next;
        });
        return queryClient.invalidateQueries({ queryKey: getGetApplicationsQueryKey() });
      },
      onError: (_error, variables) =>
        setFailed((was) => new Set(was).add(variables.id)),
    },
  });

  function edit(id: number, data: ApplicationEdit) {
    update.mutate({ id, data });
  }

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

          {/* table-fixed, or the percentages below are only a suggestion: with auto layout
              the other columns' content decides, and the note ends up 20px wide. */}
          <Table className="table-fixed">
            <TableHeader>
              {/* Widths, because the default shares them evenly and the note is where the
                  rejection emails get pasted — it needs the room, and Sent needs almost none. */}
              <TableRow>
                <TableHead className="w-[23%]">Where</TableHead>
                <TableHead className="w-[13%]">Location</TableHead>
                <TableHead className="w-[15%]">Status</TableHead>
                <TableHead className="w-[9%]">Sent</TableHead>
                <TableHead className="w-[29%]">Note</TableHead>
                <TableHead className="w-[11%]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.applications.map((application) => (
                <Row
                  key={application.id}
                  application={application}
                  onEdit={edit}
                  failed={failed.has(application.id)}
                />
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  );
}

export default Applications;
