import { defineConfig } from "drizzle-kit";
import path from "path";

/**
 * After the move onto h1_checker's database (2026-09-20), this file describes **seven**
 * tables — `coach_*` and `new_grad_seen` — in a database that holds twenty-seven. The
 * other twenty-one are h1_checker's application: employers, postings, the job feed,
 * and the `users` and `sessions` rows this repo no longer owns the DDL for.
 *
 * So a whole-schema reconciliation from here does not mean "apply my changes". It means
 * "make that database look like this file", and this file has never heard of
 * `job_postings`. `replit.md` already records a push offering to drop `waitlist` when a
 * single table was missing from a schema; twenty-one would be the same offer at scale.
 *
 * `push` and `push-force` are therefore **gone from package.json**, which is what stops
 * them being run out of habit. This guard is the second line, for anyone reaching for
 * `drizzle-kit` directly — argv rather than an environment variable, because the thing
 * worth catching is the command, and the person typing it has no reason to set a flag
 * they do not know exists.
 *
 * To change a table this repo does own: `pnpm --filter @workspace/db run generate`,
 * read the SQL, and apply it through `railway connect` — the path both production
 * schema changes so far have taken, recorded in `replit.md` under Run & Operate.
 */
if (process.argv.some((arg) => arg === "push")) {
  throw new Error(
    "drizzle-kit push is not available in this repo.\n" +
      "It reconciles the WHOLE schema, and after 2026-09-20 this schema describes seven of " +
      "the surviving database's twenty-seven tables — so a push would offer to drop " +
      "h1_checker's application.\n" +
      "Run `pnpm --filter @workspace/db run generate`, read the SQL, and apply it through " +
      "`railway connect`. See openspec/changes/2026-09-20-move-onto-the-surviving-database.",
  );
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  out: path.join(__dirname, "./drizzle"),
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
