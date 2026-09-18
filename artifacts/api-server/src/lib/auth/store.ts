/**
 * What the auth routes need from storage, and nothing else.
 *
 * The routes take one of these rather than importing `db` themselves. Auth is the part
 * of this server worth testing hardest, and a seam is what lets the tests run the real
 * routes, the real hashing and the real cookies against memory instead of against a
 * Postgres that has to be running and reset.
 */

export type UserRecord = {
  id: number;
  email: string;
  /**
   * Null for an identity that has no password — one proven by Google rather than
   * typed. Nullable here and not only in the column, so the compiler is the thing
   * that finds every reader rather than a null arriving at one at runtime.
   *
   * Two mechanisms already make an absent hash safe, and neither was written for
   * this case: `verifyPassword` refuses any stored value it cannot read, and
   * `routes/auth.ts` passes `?? DECOY_HASH` so an absent one never reaches it and
   * the refusal still costs a full scrypt. Removing either is what
   * `password.test.ts` and `auth.test.ts` now exist to catch.
   */
  passwordHash: string | null;
};

export interface AuthStore {
  /** `email` is already normalized by the caller. Null when nobody has that address. */
  findUserByEmail(email: string): Promise<UserRecord | null>;

  createUser(email: string, passwordHash: string): Promise<UserRecord>;

  /**
   * An identity with no password, for a sign-in that proves an address some other
   * way. Separate from `createUser` rather than an optional parameter: a forgotten
   * argument would silently create an account nobody can sign into with a password,
   * and being unable to is something a caller must ask for rather than omit.
   */
  createPasswordlessUser(email: string): Promise<UserRecord>;

  createSession(
    userId: number,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void>;

  /**
   * The owner of a session that is neither expired nor revoked, or null. One call
   * rather than "find session" then "find user": every caller wants the person, and
   * splitting it invites a route that checks the session and forgets the expiry.
   */
  findUserByLiveSession(tokenHash: string, now: Date): Promise<UserRecord | null>;

  /** Idempotent: revoking an unknown or already-revoked session is a no-op, not an error. */
  revokeSession(tokenHash: string): Promise<void>;

  recordLogin(userId: number, at: Date): Promise<void>;
}
