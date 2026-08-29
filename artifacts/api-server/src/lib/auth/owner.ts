/**
 * Who is allowed to see the growth dashboard.
 *
 * Configuration, not a column: the owner is a property of this deployment, and
 * keeping it out of the database means no row can ever be edited into an admin.
 * Comma-separated so a second person can be added without a code change.
 */

export function ownerEmails(): Set<string> {
  const raw = process.env["OWNER_EMAIL"] ?? "";
  return new Set(
    raw
      .split(",")
      .map((part) => part.trim().toLowerCase())
      .filter((part) => part.length > 0),
  );
}

/**
 * Blank entries are dropped above, so an unset or empty OWNER_EMAIL means nobody —
 * never "the account whose address is the empty string".
 */
export function isOwner(email: string): boolean {
  return ownerEmails().has(email.trim().toLowerCase());
}
