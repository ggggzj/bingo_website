/**
 * An AuthStore that keeps everything in memory.
 *
 * For tests, and for running the server locally without a Postgres. It is a real
 * implementation of the interface, not a stub with canned answers: sessions expire,
 * revoked sessions stay revoked, and a duplicate address collides — so a test that
 * passes here is testing behaviour rather than a mock's script.
 */

import type { AuthStore, UserRecord } from "./store";

type StoredSession = {
  userId: number;
  expiresAt: Date;
  revoked: boolean;
};

export class InMemoryAuthStore implements AuthStore {
  private readonly users = new Map<string, UserRecord>();
  private readonly sessions = new Map<string, StoredSession>();
  readonly lastLoginAt = new Map<number, Date>();
  /** address -> when it was FIRST proved. The tests read this; so does nothing else. */
  readonly provenAddresses = new Map<string, Date>();
  /** How many times a row was actually written, as opposed to asked for. */
  provenRecordCount = 0;
  private nextId = 1;

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    return this.users.get(email) ?? null;
  }

  async createUser(email: string, passwordHash: string): Promise<UserRecord> {
    return this.insert(email, passwordHash);
  }

  async createPasswordlessUser(email: string): Promise<UserRecord> {
    return this.insert(email, null);
  }

  /** Both creation paths, so the duplicate-address collision cannot drift between them. */
  private insert(email: string, passwordHash: string | null): UserRecord {
    if (this.users.has(email)) {
      throw new Error(`duplicate email: ${email}`);
    }
    const user: UserRecord = { id: this.nextId++, email, passwordHash };
    this.users.set(email, user);
    return user;
  }

  async recordProvenAddress(email: string, now: Date): Promise<void> {
    /* Idempotent the way the Postgres side is: a second sign-in writes nothing and
       leaves the first proof where it is. `provenRecordCount` counts writes rather
       than calls, so a test can tell "recorded once" from "called once". */
    if (this.provenAddresses.has(email)) return;
    this.provenAddresses.set(email, now);
    this.provenRecordCount += 1;
  }

  async clearPassword(userId: number): Promise<void> {
    for (const user of this.users.values()) {
      if (user.id === userId) user.passwordHash = null;
    }
  }

  async createSession(
    userId: number,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    this.sessions.set(tokenHash, { userId, expiresAt, revoked: false });
  }

  async findUserByLiveSession(
    tokenHash: string,
    now: Date,
  ): Promise<UserRecord | null> {
    const session = this.sessions.get(tokenHash);
    if (!session || session.revoked || session.expiresAt <= now) return null;
    for (const user of this.users.values()) {
      if (user.id === session.userId) return user;
    }
    return null;
  }

  async revokeSession(tokenHash: string): Promise<void> {
    const session = this.sessions.get(tokenHash);
    if (session) session.revoked = true;
  }

  async recordLogin(userId: number, at: Date): Promise<void> {
    this.lastLoginAt.set(userId, at);
  }

  /**
   * Plant an account directly, the way the owner's is created outside the sign-up
   * form. `null` plants one with no password.
   */
  seedUser(email: string, passwordHash: string | null): UserRecord {
    const user: UserRecord = { id: this.nextId++, email, passwordHash };
    this.users.set(email, user);
    return user;
  }

  /** Test-only reach-in: age a live session so expiry can be exercised without waiting. */
  expireSessionsBefore(when: Date): void {
    for (const session of this.sessions.values()) {
      if (session.expiresAt > when) session.expiresAt = when;
    }
  }
}
