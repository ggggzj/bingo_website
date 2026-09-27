import { Router, type IRouter } from "express";

import { isOwner } from "../lib/auth/owner";
import { hashToken } from "../lib/auth/session";
import type { AuthStore } from "../lib/auth/store";
import { readableJd } from "../lib/applications/jd";
import type { TokenStore } from "../lib/tokens/store";
import { currentUser } from "./auth";

/**
 * The applications the owner has already sent, as the account holds them.
 *
 * Two halves with two owners (see `lib/db/src/schema/applications.ts`): the import writes
 * company, role, location, link, dates and the archived description; the account writes
 * status, stage and note. This route reads both and is careful, in the shape it returns, to
 * say which is which.
 */

/** One row as the store hands it over — the two halves still distinguishable. */
export type ApplicationRecord = {
  id: number;
  company: string;
  role: string;
  location: string | null;
  region: string | null;
  ats: string | null;
  url: string | null;
  /** What the CSV said: `applied` or `saved`. */
  importedStatus: string;
  /** What the owner said, when they have said anything. Null is "they have not". */
  status: string | null;
  stage: string | null;
  note: string | null;
  appliedDate: string | null;
  savedDate: string | null;
  /** Whether a body was archived. The body itself is fetched one row at a time. */
  hasJd: boolean;
  importedAt: Date;
};

/**
 * What the browser may write. A key's **absence means "leave it"; null means "clear it"**, so
 * this is an optional-key type rather than a nullable one: `{}` and `{ note: null }` are
 * different instructions, and a type that could not tell them apart would erase a note every
 * time a status changed.
 */
export type ApplicationEdit = {
  status?: string | null;
  stage?: string | null;
  note?: string | null;
};

/** Which hand made a change. `script` arrives with `.harness/backlogs/025`. */
export type EditHand = "browser" | "script";

export interface ApplicationStore {
  list(userId: number): Promise<ApplicationRecord[]>;
  /**
   * Returns the row as it now stands, or null when it is not this user's — which the route
   * answers as 404, the same answer a row that does not exist gets. Ownership is checked in
   * the query, not after it.
   */
  update(
    userId: number,
    id: number,
    edit: ApplicationEdit,
    hand: EditHand,
  ): Promise<ApplicationRecord | null>;
  /**
   * The archived body, or null when this row is not theirs or nothing was archived for it.
   * Its own query rather than a column on the list: 80 bodies are 400 kB, and the list needs
   * only to know that one exists.
   */
  jd(userId: number, id: number): Promise<string | null>;
}

/**
 * The four states this tracker uses, which are the four the owner's own folder uses. A value
 * outside them is refused rather than stored: a vocabulary drifts one typo at a time, and a
 * column holding both `closed` and `Closed` cannot be counted.
 */
const STATUSES = new Set(["saved", "applied", "interview", "closed"]);

const EDITABLE = ["status", "stage", "note"] as const;

type EditProblem = { error: string };

/** Reads the body into an edit, or says why it will not. */
export function readEdit(body: unknown): ApplicationEdit | EditProblem {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { error: "Expected an object" };
  }
  const given = body as Record<string, unknown>;

  const unknownKeys = Object.keys(given).filter(
    (key) => !(EDITABLE as readonly string[]).includes(key),
  );
  // Refused rather than ignored: a caller that sent a field believes it was written, and
  // silently dropping it is how a note goes missing with nothing to point at.
  if (unknownKeys.length > 0) {
    return { error: `Cannot change: ${unknownKeys.join(", ")}` };
  }

  const edit: ApplicationEdit = {};
  if ("status" in given) {
    const status = given["status"];
    if (typeof status !== "string" || !STATUSES.has(status)) {
      return { error: `Status must be one of: ${[...STATUSES].join(", ")}` };
    }
    edit.status = status;
  }
  for (const field of ["stage", "note"] as const) {
    if (!(field in given)) continue;
    const value = given[field];
    if (value !== null && typeof value !== "string") {
      return { error: `${field} must be text or null` };
    }
    edit[field] = value;
  }
  return edit;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Days since the application was sent, or null when it never was.
 *
 * Null rather than 0 for a saved row: zero reads as "sent today", which is a different and
 * wrong fact. This is arithmetic on two dates and stays arithmetic — nothing here predicts a
 * deadline or scores a wait, because no posting in this market publishes one.
 */
export function daysWaiting(appliedDate: string | null, now: Date = new Date()): number | null {
  if (!appliedDate) return null;
  const applied = new Date(`${appliedDate}T00:00:00Z`);
  if (Number.isNaN(applied.getTime())) return null;
  const midnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.max(0, Math.round((midnight - applied.getTime()) / MS_PER_DAY));
}

function present(record: ApplicationRecord) {
  return {
    id: record.id,
    company: record.company,
    role: record.role,
    location: record.location,
    region: record.region,
    ats: record.ats,
    url: record.url,
    /**
     * The owner's answer wins, and `status_source` says so. Collapsing these two into one
     * field would let an export's default pass for the owner's judgement — the page shows
     * this difference rather than hiding it.
     */
    status: record.status ?? record.importedStatus,
    status_source: record.status === null ? "import" : "owner",
    stage: record.stage,
    note: record.note,
    applied_date: record.appliedDate,
    saved_date: record.savedDate,
    days_waiting: daysWaiting(record.appliedDate),
    has_jd: record.hasJd,
  };
}

function bearerToken(req: { headers: Record<string, unknown> }): string | null {
  const header = req.headers["authorization"];
  if (typeof header !== "string") return null;
  const [scheme, value] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !value) return null;
  return value;
}

export function createApplicationsRouter(
  store: AuthStore,
  applications: ApplicationStore,
  tokens: TokenStore,
): IRouter {
  const router: IRouter = Router();

  /**
   * Who is calling, and **by which hand** — the session cookie, or a personal token scoped to
   * applications. The hand is not a parameter anyone sends: it is which credential was
   * accepted, which is what makes the trail's attribution worth anything.
   *
   * Uniform 404 for everyone else — no session, an expired one, somebody else's account, or a
   * token issued for practice. The same refusal `new-grad.ts` and the coach routes make.
   */
  async function owner(
    req: Parameters<Parameters<IRouter["get"]>[1]>[0],
  ): Promise<{ id: number; email: string; hand: EditHand } | null> {
    const signedIn = await currentUser(store, req);
    if (signedIn) {
      return isOwner(signedIn.email)
        ? { id: signedIn.id, email: signedIn.email, hand: "browser" }
        : null;
    }

    const token = bearerToken(req as unknown as { headers: Record<string, unknown> });
    if (!token) return null;
    const byToken = await tokens.findUserByLiveToken(
      hashToken(token),
      "applications",
      new Date(),
    );
    if (!byToken || !isOwner(byToken.email)) return null;
    return { id: byToken.id, email: byToken.email, hand: "script" };
  }

  router.get("/", async (req, res) => {
    let signedIn;
    try {
      signedIn = await owner(req);
    } catch (err) {
      req.log?.error({ err }, "Failed to read session");
      res.status(500).json({ error: "Internal server error" });
      return;
    }
    if (!signedIn) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    try {
      const rows = await applications.list(signedIn.id);
      /**
       * The age of the imported half, carried rather than inferred. Null when there is
       * nothing yet, which the page says out loud — an empty table with no explanation
       * reads as "you have applied to nothing".
       */
      const importedAt = rows.reduce<Date | null>(
        (latest, row) => (latest === null || row.importedAt > latest ? row.importedAt : latest),
        null,
      );
      res.json({
        applications: rows.map(present),
        imported_at: importedAt ? importedAt.toISOString() : null,
      });
    } catch (err) {
      req.log?.error({ err }, "Failed to list applications");
      res.status(500).json({ error: "Internal server error" });
    }
  });

  router.patch("/:id", async (req, res) => {
    let signedIn;
    try {
      signedIn = await owner(req);
    } catch (err) {
      req.log?.error({ err }, "Failed to read session");
      res.status(500).json({ error: "Internal server error" });
      return;
    }
    if (!signedIn) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const id = Number(req.params["id"]);
    if (!Number.isInteger(id)) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const edit = readEdit(req.body);
    // Refused before the store is touched, so a rejected value never reaches the trail.
    if ("error" in edit) {
      res.status(400).json({ error: edit.error });
      return;
    }

    try {
      const row = await applications.update(signedIn.id, id, edit, signedIn.hand);
      if (!row) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      res.json(present(row));
    } catch (err) {
      req.log?.error({ err }, "Failed to update application");
      res.status(500).json({ error: "Internal server error" });
    }
  });

  router.get("/:id/jd", async (req, res) => {
    let signedIn;
    try {
      signedIn = await owner(req);
    } catch (err) {
      req.log?.error({ err }, "Failed to read session");
      res.status(500).json({ error: "Internal server error" });
      return;
    }
    if (!signedIn) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const id = Number(req.params["id"]);
    if (!Number.isInteger(id)) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    try {
      const raw = await applications.jd(signedIn.id, id);
      // Nothing archived is the same answer as not yours: neither tells a stranger which.
      if (raw === null) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      const jd = readableJd(raw);
      res.json({
        markdown: jd.markdown,
        trimmed: jd.trimmed,
        full_markdown: jd.fullMarkdown,
        source: jd.source,
      });
    } catch (err) {
      req.log?.error({ err }, "Failed to read the archived description");
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}
