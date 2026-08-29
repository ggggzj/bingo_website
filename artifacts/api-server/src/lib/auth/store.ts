/**
 * What the auth routes need from storage, and nothing else.
 *
 * The routes take one of these rather than importing `db` the way the waitlist route
 * does. Auth is the part of this server worth testing hardest, and a seam is what
 * lets the tests run the real routes, the real hashing and the real cookies against
 * memory instead of against a Postgres that has to be running and reset.
 */

export type UserRecord = {
  id: number;
  email: string;
  passwordHash: string;
};

export interface AuthStore {
  /** `email` is already normalized by the caller. Null when nobody has that address. */
  findUserByEmail(email: string): Promise<UserRecord | null>;

  createUser(email: string, passwordHash: string): Promise<UserRecord>;

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
