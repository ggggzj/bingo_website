/**
 * Who may use the interview coach while it is in development.
 *
 * Same shape as owner.ts, for the same reason: access is a property of this
 * deployment, not a column, so no row can be edited into an allowlisted user.
 * Comma-separated so a second tester can be added without a code change.
 */

export function coachEmails(): Set<string> {
  const raw = process.env["COACH_EMAILS"] ?? "";
  return new Set(
    raw
      .split(",")
      .map((part) => part.trim().toLowerCase())
      .filter((part) => part.length > 0),
  );
}

/**
 * Blank entries are dropped above, so an unset or empty COACH_EMAILS means the
 * coach is closed for everyone — never "the account whose address is empty".
 */
export function isCoachUser(email: string): boolean {
  return coachEmails().has(email.trim().toLowerCase());
}
