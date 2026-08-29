/**
 * Creates or updates the owner's account.
 *
 * The sign-up form refuses OWNER_EMAIL on purpose — sign-up is open and addresses
 * are not verified, so anyone who guessed that address could otherwise claim the
 * dashboard. This is the way in instead: run it against the deployment's database,
 * type a password, done. Then sign in through the ordinary form.
 *
 *   OWNER_EMAIL=you@example.com DATABASE_URL=... \
 *     pnpm --filter @workspace/api-server run set-owner-password
 *
 * The password is read from a prompt with the echo turned off and is never taken as
 * an argument: a command line ends up in shell history and in the process list.
 */

import { createInterface } from "node:readline";
import { stdin, stdout, exit } from "node:process";

import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

import { hashPassword } from "./lib/auth/password";
import { ownerEmails } from "./lib/auth/owner";

const MIN_PASSWORD_LENGTH = 10;

/**
 * Reads answers from stdin, keeping them off the screen when there is a screen.
 *
 * One reader for the whole run, not one per question: a second readline over the same
 * stdin loses whatever the first had already buffered, which is exactly what happens
 * when the answers arrive down a pipe rather than from a keyboard.
 */
function createReader() {
  const isTerminal = stdin.isTTY === true;
  const rl = createInterface({ input: stdin, terminal: isTerminal });
  const lines = rl[Symbol.asyncIterator]();

  return {
    async hidden(question: string): Promise<string> {
      stdout.write(question);
      if (isTerminal) {
        // readline echoes what is typed through this; a no-op is what hides it.
        // Only meaningful on a terminal — down a pipe there is nothing to hide and
        // nothing echoing it.
        (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput =
          () => {};
      }
      const { value, done } = await lines.next();
      stdout.write("\n");
      if (done || typeof value !== "string") {
        throw new Error("No password was given");
      }
      return value;
    },
    close(): void {
      rl.close();
    },
  };
}

async function main(): Promise<void> {
  const owners = [...ownerEmails()];
  if (owners.length === 0) {
    throw new Error("OWNER_EMAIL is not set, so there is no owner to give a password to");
  }
  if (owners.length > 1) {
    throw new Error(
      `OWNER_EMAIL lists ${owners.length} addresses. Run this once per address, with OWNER_EMAIL set to just that one.`,
    );
  }
  const email = owners[0]!;

  const reader = createReader();
  let password: string;
  let again: string;
  try {
    password = await reader.hidden(`Password for ${email}: `);
    again = await reader.hidden("Again: ");
  } finally {
    reader.close();
  }

  if (password !== again) throw new Error("Those did not match");
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Use at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  const passwordHash = await hashPassword(password);
  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (existing) {
    // Updating rather than refusing: this is also how the owner changes a password
    // they have forgotten, and there is no reset flow for an account with no form.
    await db
      .update(usersTable)
      .set({ passwordHash })
      .where(eq(usersTable.id, existing.id));
    console.log(`Updated the password for ${email}.`);
  } else {
    await db.insert(usersTable).values({ email, passwordHash });
    console.log(`Created ${email}. Sign in at /login.`);
  }

  // Old sessions are left alone deliberately: this is normally the first run on a
  // fresh deploy, and there are none. If it is a password change made because a
  // session was lost, sign out on the other machine, or clear the sessions row.
}

main()
  .then(() => exit(0))
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    exit(1);
  });
