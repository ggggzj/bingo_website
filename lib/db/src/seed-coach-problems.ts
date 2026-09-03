/**
 * Seed (or refresh) the coach problem bank from data/coach-problems.json.
 * Idempotent: upserts by problem id, so re-running updates rows in place and
 * never duplicates. Run with a DATABASE_URL, like set-owner-password:
 *
 *     DATABASE_URL=... pnpm --filter @workspace/db run seed-coach
 */
import { readFileSync } from "node:fs";
import { db, pool } from "./index";
import { coachProblemsTable } from "./schema/coach";

interface BankProblem {
  id: string;
  num: number;
  title: string;
  slug: string;
  difficulty: string;
  neetcode_group: string;
  patterns: string[];
  company_freq: Record<string, number>;
  followups: string[];
  siblings: string[];
}

const bankUrl = new URL("../data/coach-problems.json", import.meta.url);
const bank = JSON.parse(readFileSync(bankUrl, "utf-8")) as {
  problems: BankProblem[];
};

async function main() {
  let seeded = 0;
  for (const p of bank.problems) {
    const row = {
      id: p.id,
      num: p.num,
      title: p.title,
      slug: p.slug,
      difficulty: p.difficulty,
      neetcodeGroup: p.neetcode_group,
      patterns: p.patterns,
      companyFreq: p.company_freq,
      followups: p.followups,
      siblings: p.siblings,
    };
    await db
      .insert(coachProblemsTable)
      .values(row)
      .onConflictDoUpdate({ target: coachProblemsTable.id, set: row });
    seeded += 1;
  }
  console.log(`seeded ${seeded} problems`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
