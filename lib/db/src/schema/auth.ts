import {
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * An account. The email is stored already normalized (trimmed, lowercased) by the
 * route that writes it, so the unique index is what actually stops one person
 * holding two accounts that differ only in capitals.
 *
 * There is no admin column on purpose: who may see the growth dashboard is read from
 * the OWNER_EMAIL setting, so no row in this table can be edited into an owner.
 */
export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  // scrypt, in the self-describing form written by the api-server's password module.
  //
  // Nullable, because an identity proven by Google has no password at all — that is the
  // point of signing in that way, and the database this repo is merging into
  // (`.harness/backlogs/018`) already permits it. Until that merge and until Google
  // sign-in lands (`.harness/backlogs/011`), nothing here writes a null; the column is
  // declared for rows that are coming, not for rows that are here.
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLoginAt: timestamp("last_login_at"),
});

/**
 * One row per signed-in browser. Only the SHA-256 of the cookie's value is kept, so
 * a copy of this table cannot be replayed as a login, and a session can be ended for
 * real — by revoking the row — rather than waited out.
 */
export const sessionsTable = pgTable(
  "sessions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    revokedAt: timestamp("revoked_at"),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
);

export type User = typeof usersTable.$inferSelect;
export type Session = typeof sessionsTable.$inferSelect;
