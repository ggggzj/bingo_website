/**
 * One-shot import of a local AceLeetcode data/ directory into the coach
 * tables for one existing user. Idempotent with "import wins" semantics:
 * review state and events are replaced, day-log rows and config upserted —
 * running it twice leaves the same end state, never duplicates.
 *
 *     DATABASE_URL=... pnpm --filter @workspace/db run import-coach -- \
 *         --email you@example.com --dir ~/Desktop/AceLeetcode/data
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { eq } from "drizzle-orm";

import { db, pool } from "./index";
import {
  coachConfigTable,
  coachDailyLogTable,
  coachProblemsTable,
  coachReviewsTable,
  coachReviewEventsTable,
} from "./schema/coach";
import { usersTable } from "./schema/auth";

interface HistoryEvent {
  date: string;
  mode: string;
  grade: string;
  interval_days: number;
  failed_on?: string[];
  notes?: string;
}

interface LocalReview {
  state?: string;
  ease?: number;
  interval_days?: number;
  due?: string | null;
  reps?: number;
  lapses?: number;
  last_grade?: string | null;
  weak_points?: string[];
  history?: HistoryEvent[];
}

interface LocalDay {
  assigned_new?: string[];
  assigned_reviews?: string[];
  planned_minutes?: number;
  solved?: string[];
  done?: Array<{ id: string; grade: string; mode: string }>;
}

function loadJson<T>(dir: string, name: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(join(dir, name), "utf-8")) as T;
  } catch {
    console.log(`  (${name} missing or unreadable — skipping)`);
    return fallback;
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      email: { type: "string" },
      dir: { type: "string" },
    },
    // pnpm forwards its own "--" separator as a positional; tolerate it.
    allowPositionals: true,
  });
  if (!values.email || !values.dir) {
    console.error("Usage: import-coach --email <email> --dir <path-to-data-dir>");
    process.exitCode = 1;
    return;
  }
  const email = values.email.trim().toLowerCase();
  const dir = values.dir;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);
  if (!user) {
    console.error(`No account with email ${email} — sign up on the site first.`);
    process.exitCode = 1;
    return;
  }

  const bank = new Set(
    (await db.select({ id: coachProblemsTable.id }).from(coachProblemsTable)).map(
      (r) => r.id,
    ),
  );
  if (bank.size === 0) {
    console.error("Problem bank is empty — run seed-coach first.");
    process.exitCode = 1;
    return;
  }

  const reviews = loadJson<Record<string, LocalReview>>(dir, "reviews.json", {});
  const daylog = loadJson<Record<string, LocalDay>>(dir, "daily_log.json", {});
  const config = loadJson<Record<string, unknown> | null>(dir, "config.json", null);

  const skipped: string[] = [];
  let reviewCount = 0;
  let eventCount = 0;

  await db.transaction(async (tx) => {
    for (const [pid, raw] of Object.entries(reviews)) {
      if (!bank.has(pid)) {
        skipped.push(pid);
        continue;
      }
      const row = {
        userId: user.id,
        problemId: pid,
        state: raw.state ?? "new",
        ease: raw.ease ?? 2.5,
        intervalDays: raw.interval_days ?? 0,
        due: raw.due ?? null,
        reps: raw.reps ?? 0,
        lapses: raw.lapses ?? 0,
        lastGrade: raw.last_grade ?? null,
        weakPoints: raw.weak_points ?? [],
      };
      const [review] = await tx
        .insert(coachReviewsTable)
        .values(row)
        .onConflictDoUpdate({
          target: [coachReviewsTable.userId, coachReviewsTable.problemId],
          set: row,
        })
        .returning({ id: coachReviewsTable.id });
      reviewCount += 1;

      // Import wins: rebuild this review's events from the local history so a
      // re-run can never stack duplicates.
      await tx
        .delete(coachReviewEventsTable)
        .where(eq(coachReviewEventsTable.reviewId, review!.id));
      for (const ev of raw.history ?? []) {
        await tx.insert(coachReviewEventsTable).values({
          reviewId: review!.id,
          date: ev.date,
          mode: ev.mode,
          grade: ev.grade,
          intervalDays: ev.interval_days,
          failedOn: ev.failed_on ?? [],
          notes: ev.notes ?? "",
        });
        eventCount += 1;
      }
    }

    for (const [day, entry] of Object.entries(daylog)) {
      const row = {
        userId: user.id,
        day,
        assignedNew: (entry.assigned_new ?? []).filter((p) => bank.has(p)),
        assignedReviews: (entry.assigned_reviews ?? []).filter((p) => bank.has(p)),
        plannedMinutes: entry.planned_minutes ?? 0,
        solved: (entry.solved ?? []).filter((p) => bank.has(p)),
        done: (entry.done ?? []).filter((d) => bank.has(d.id)),
      };
      await tx
        .insert(coachDailyLogTable)
        .values(row)
        .onConflictDoUpdate({
          target: [coachDailyLogTable.userId, coachDailyLogTable.day],
          set: row,
        });
    }

    if (config) {
      const row = {
        userId: user.id,
        dailyMinutes: (config["daily_minutes"] as number) ?? 60,
        newPerDay: (config["new_per_day"] as number) ?? 2,
        sprintWindowDays: (config["sprint_window_days"] as number) ?? 14,
        interviewDate: (config["interview_date"] as string | null) ?? null,
        targetCompanies: (config["target_companies"] as string[]) ?? [],
      };
      await tx
        .insert(coachConfigTable)
        .values(row)
        .onConflictDoUpdate({ target: coachConfigTable.userId, set: row });
    }
  });

  console.log(
    `Imported for ${email}: ${reviewCount} reviews, ${eventCount} events, ` +
      `${Object.keys(daylog).length} day rows${config ? ", config" : ""}.`,
  );
  if (skipped.length) {
    console.log(`Skipped (not in the site's bank): ${skipped.join(", ")}`);
  }
  console.log(
    "\nCutover is complete only once the local scripts point here. Add to your" +
      "\nshell profile and the 9:04 scheduled task's environment:" +
      "\n\n  export COACH_API_BASE=<site origin>/api" +
      "\n  export COACH_TOKEN=<issue one at /coach>\n",
  );
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
