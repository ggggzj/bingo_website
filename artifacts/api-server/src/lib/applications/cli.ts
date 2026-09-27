/**
 * Pushes the owner's job-search folder into their account.
 *
 *   DATABASE_URL=... OWNER_EMAIL=you@example.com \
 *     pnpm --filter @workspace/api-server run import-applications [folder]
 *
 * The folder defaults to `~/Desktop/job_dashboard`. Nothing about this is scheduled or
 * automatic: it runs when the owner runs it, which is why the page it feeds states the date
 * of the last run rather than implying it is live.
 *
 * **What it may write is the point.** `applications` is refreshed wholesale; the status,
 * stage and note the owner typed in the browser are seeded once and never touched again. See
 * `import.ts`.
 *
 * It connects to the database directly rather than posting to the API, which reuses access the
 * owner already has instead of minting a token for a script. A connection string is a broader
 * credential than an API token would be, so it is passed per run and never stored — the narrow
 * token is `.harness/backlogs/025`, deliberately not built yet.
 */

import os from "node:os";
import path from "node:path";
import { exit, argv, env } from "node:process";

import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

import { ownerEmails } from "../auth/owner";
import { importFolder } from "./import";

const DEFAULT_ROOT = path.join(os.homedir(), "Desktop", "job_dashboard");

async function main(): Promise<void> {
  const root = argv[2] ?? env["JOB_DASHBOARD"] ?? DEFAULT_ROOT;

  const owners = [...ownerEmails()];
  if (owners.length === 0) {
    throw new Error("OWNER_EMAIL is not set, so there is nobody to import these for");
  }
  if (owners.length > 1) {
    throw new Error(
      `OWNER_EMAIL lists ${owners.length} addresses. Run this with OWNER_EMAIL set to just the one whose applications these are.`,
    );
  }
  const email = owners[0]!;

  const [user] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);
  if (!user) {
    throw new Error(
      `No account for ${email} in this database. Sign in once on the site first, or check DATABASE_URL points at the surviving database.`,
    );
  }

  const summary = await importFolder({ database: db, root, userId: user.id });

  console.log(`Imported ${root} for ${email}`);
  console.log(
    `  applications: ${summary.inserted} new, ${summary.updated} refreshed` +
      `  ·  JD bodies: ${summary.jdBodies}`,
  );
  console.log(
    `  hand-written rows: ${summary.statusSeeded} seeded, ${summary.statusLeftAlone} left alone` +
      ` (the account owns those)`,
  );
  if (summary.folderUpdatedAt) {
    console.log(`  the folder last regenerated itself on ${summary.folderUpdatedAt}`);
  }

  /**
   * Loud, because this is how the only irreplaceable data goes missing quietly. A key the
   * folder writes in one file and not the other means the two normalisations have drifted,
   * and the row's hand-written history detaches without anything failing.
   */
  for (const [what, keys] of [
    ["overrides.js", summary.unmatchedOverrideKeys],
    ["archive.js", summary.unmatchedArchiveKeys],
  ] as const) {
    if (keys.length === 0) continue;
    console.warn(
      `\n  ⚠️  ${keys.length} key(s) in ${what} match no application and were not imported:`,
    );
    for (const key of keys) console.warn(`      ${key}`);
    console.warn("      Nothing was lost in the folder — but nothing reached the account either.");
  }
}

main()
  .then(() => exit(0))
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    exit(1);
  });
