import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetApplicationsQueryKey,
  useGetApplicationJd,
  useGetApplications,
  useUpdateApplication,
  type Application,
  type ApplicationEdit,
  type ApplicationEditStatus,
} from "@workspace/api-client-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

/**
 * The archived job description.
 *
 * This is the column the owner asked for, and its reason is blunt: a posting's page 404s when
 * the req closes — two of theirs did within five days of applying, and those two bodies are
 * gone. So the control opens **our copy**, and the employer's link is the secondary one.
 *
 * Rendered as preformatted text rather than through a markdown library. These bodies are prose
 * with a few dashed lists; a dependency to render them prettier would buy formatting and cost a
 * package, and the thing the owner needs is to read what the employer wrote.
 */
function ArchivedJd({
  application,
  onClose,
}: {
  application: Application;
  onClose: () => void;
}) {
  const [whole, setWhole] = useState(false);
  const { data, isLoading, error } = useGetApplicationJd(application.id);

  return (
    <Dialog open onOpenChange={(next) => (next ? null : onClose())}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {application.company} — {application.role}
          </DialogTitle>
          <DialogDescription data-testid="jd-source">
            {data?.source
              ? `Archived copy, taken from ${data.source}. The posting itself may be gone.`
              : "Archived copy. The posting itself may be gone."}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Opening the archived copy…
          </div>
        ) : error || !data ? (
          <p className="text-sm text-destructive">Could not open the archived copy.</p>
        ) : (
          <>
            {/* Said rather than assumed: a reader who does not know text was skipped cannot
                tell a short job description from a trimmed one. */}
            {data.trimmed ? (
              <div
                className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
                data-testid="jd-trimmed"
              >
                <span>
                  This copy was scraped from the page, so the site&apos;s menus and its other
                  job listings were skipped past.
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  data-testid="show-full-jd"
                  onClick={() => setWhole((was) => !was)}
                >
                  {whole ? "Show just the description" : "Show everything that was kept"}
                </Button>
              </div>
            ) : null}
            <div className="overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed">
              {whole ? data.full_markdown : data.markdown}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** The four this tracker uses, which are the four the owner's own folder uses. */
const STATUSES = ["saved", "applied", "interview", "closed"] as const satisfies readonly ApplicationEditStatus[];

function knownStatus(value: string): value is ApplicationEditStatus {
  return (STATUSES as readonly string[]).includes(value);
}

/**
 * Clicks that belong to a control are the control's, not the row's. Changing a status is one
 * click and has to stay one click — opening the row underneath it would be a second thing
 * happening that nobody asked for.
 */
function fromAControl(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest("select, input, textarea, a, button") !== null;
}

function Row({
  application,
  onEdit,
  onOpenJd,
  open,
  onToggle,
  failed,
}: {
  application: Application;
  onEdit: (id: number, edit: ApplicationEdit) => void;
  onOpenJd: (application: Application) => void;
  open: boolean;
  onToggle: (id: number) => void;
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
    <>
    <TableRow
      data-testid={`application-${application.id}`}
      className="cursor-pointer"
      onClick={(event) => {
        if (!fromAControl(event.target)) onToggle(application.id);
      }}
    >
      <TableCell className="align-top">
        <div className="flex flex-col gap-0.5" data-testid={`open-row-${application.id}`}>
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
          {/* Written: readable at a glance. Empty: nothing, until the row is opened —
              76 of the owner's 94 rows have nothing here, and an empty box on each of them
              was the page asking 76 questions at once. */}
          {application.stage ? (
            <span className="text-xs text-muted-foreground">{application.stage}</span>
          ) : null}
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
      <TableCell className="align-top text-sm text-muted-foreground">
        {application.note ?? null}
      </TableCell>
      <TableCell className="align-top text-right whitespace-nowrap">
        <div className="flex flex-col items-end gap-1">
          {application.has_jd ? (
            <Button
              size="sm"
              variant="outline"
              data-testid={`open-jd-${application.id}`}
              onClick={() => onOpenJd(application)}
            >
              JD
            </Button>
          ) : (
            /* The archive is why this column exists. Nothing kept is a fact worth stating —
               the posting may already be a 404, and then there is nothing anywhere. */
            <span
              className="text-[11px] text-muted-foreground"
              data-testid={`no-jd-${application.id}`}
            >
              no copy kept
            </span>
          )}
          {application.url ? (
            <a
              className="text-xs underline underline-offset-4 text-muted-foreground"
              href={application.url}
              target="_blank"
              rel="noreferrer noopener"
            >
              Posting
            </a>
          ) : null}
        </div>
      </TableCell>
    </TableRow>

    {/* The row, opened. Also where `.harness/backlogs/027` is meant to land: a message from
        the inbox that looks like it is about this application goes beside these two fields,
        for the owner to read and act on — never into them. */}
    {open ? (
      <TableRow data-testid={`open-${application.id}`}>
        <TableCell colSpan={6} className="bg-muted/40">
          <div className="flex flex-col gap-2 py-1">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground" htmlFor={`stage-${application.id}`}>
                Stage — where it stands, in a few words
              </label>
              <Input
                id={`stage-${application.id}`}
                className="h-8 text-sm"
                placeholder="OA · HR 面试 · 拒信 · 不提供 sponsorship"
                data-testid={`stage-input-${application.id}`}
                value={stage}
                onChange={(event) => setStage(event.target.value)}
                onBlur={() => commit("stage", stage, application.stage)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground" htmlFor={`note-${application.id}`}>
                Note — the employer&apos;s own words are worth keeping whole
              </label>
              <Input
                id={`note-${application.id}`}
                className="h-8 text-sm"
                placeholder="拒信原文 / 面试安排 / 你想三个月后还记得的事"
                data-testid={`note-input-${application.id}`}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                onBlur={() => commit("note", note, application.note)}
              />
            </div>
          </div>
        </TableCell>
      </TableRow>
    ) : null}
    </>
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
  const [openJd, setOpenJd] = useState<Application | null>(null);
  /** Which row is open for writing. One at a time: two open rows is a form, not a table. */
  const [openRow, setOpenRow] = useState<number | null>(null);
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
                  onOpenJd={setOpenJd}
                  open={openRow === application.id}
                  onToggle={(id) => setOpenRow((was) => (was === id ? null : id))}
                  failed={failed.has(application.id)}
                />
              ))}
            </TableBody>
          </Table>
        </>
      )}

      {openJd ? (
        <ArchivedJd application={openJd} onClose={() => setOpenJd(null)} />
      ) : null}
    </div>
  );
}

export default Applications;
