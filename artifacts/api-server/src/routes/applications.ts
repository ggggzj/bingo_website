import { Router, type IRouter } from "express";

import { isOwner } from "../lib/auth/owner";
import type { AuthStore } from "../lib/auth/store";
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

export interface ApplicationStore {
  list(userId: number): Promise<ApplicationRecord[]>;
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

export function createApplicationsRouter(
  store: AuthStore,
  applications: ApplicationStore,
): IRouter {
  const router: IRouter = Router();

  /**
   * Uniform 404 for everyone who is not the owner — no session, an expired one, or somebody
   * else's perfectly good account. The same refusal `new-grad.ts` and the coach routes make,
   * so the route's existence gives nothing away.
   */
  async function owner(req: Parameters<Parameters<IRouter["get"]>[1]>[0]) {
    const signedIn = await currentUser(store, req);
    return signedIn && isOwner(signedIn.email) ? signedIn : null;
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

  return router;
}
