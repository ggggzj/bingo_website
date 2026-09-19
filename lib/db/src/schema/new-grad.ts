import { integer, jsonb, pgTable, timestamp } from "drizzle-orm/pg-core";

import { usersTable } from "./auth";

/**
 * What the owner had already seen on their new-grad list, so the page can say what
 * arrived since and what closed.
 *
 * **Why rows and not a timestamp.** The obvious design is "remember when they last
 * looked" and compare it to each posting's first-seen date. It does not work here for
 * two reasons, both about the upstream rather than about us: the browse route returns
 * no first-seen field at all, and it returns **open postings only** — so a posting that
 * closed is simply absent, and absence is indistinguishable from never having existed.
 * Holding the rows is what makes "this one closed" a fact we can state.
 *
 * Deliberately small: enough of a posting to render a row the reader can recognise and
 * click, and nothing more. This is a snapshot for comparison, not a second copy of the
 * job feed.
 *
 * One row per user. Per-user and cascades with the account, the same shape every
 * `coach_*` table already has.
 */
export const newGradSeenTable = pgTable("new_grad_seen", {
  userId: integer("user_id")
    .primaryKey()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  /** When the owner last acknowledged. Its presence is what makes anything "new". */
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  listed: jsonb("listed")
    .$type<
      { job_id: number; employer_name: string; title: string; url: string | null }[]
    >()
    .notNull()
    .default([]),
});

export type NewGradSeenRow = typeof newGradSeenTable.$inferSelect;
