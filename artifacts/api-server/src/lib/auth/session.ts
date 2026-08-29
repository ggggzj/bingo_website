/**
 * Sessions are rows, not signed cookies.
 *
 * The cookie carries an opaque random value and the database stores only its SHA-256,
 * so a copy of the table cannot be replayed as a login. The cost is a lookup per
 * request; what it buys is the ability to actually end a session — signing out, or
 * cutting off a machine — which a self-contained signed cookie cannot do until it
 * expires on its own.
 */

import { createHash, randomBytes } from "node:crypto";
import type { CookieOptions } from "express";

export const SESSION_COOKIE = "bingo_session";
export const SESSION_TTL_DAYS = 30;

export function newSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function sessionExpiry(now: Date): Date {
  return new Date(now.getTime() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * httpOnly so page scripts cannot read it, sameSite lax so it does not ride along on
 * a cross-site request, secure everywhere but development — local dev is http, and a
 * Secure cookie there is silently dropped, which looks exactly like a broken login.
 */
export function sessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  };
}
