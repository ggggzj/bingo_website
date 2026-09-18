/**
 * Turning a Google ID token into an address this server can believe.
 *
 * The page hands over a string. Nothing in it is trusted until Google's own
 * signature says so: the address comes out of verified claims, never out of the
 * request body, which is the whole reason this file exists rather than the route
 * reading `req.body.email`.
 *
 * Shaped as a seam for the reason `AuthStore` is: the auth tests run the real
 * routes, the real cookies and the real sessions against memory, and a route that
 * reached accounts.google.com would undo that for the one area this repo says is
 * worth testing hardest. `createGoogleVerifier` takes its key source, so the tests
 * mint tokens with a throwaway key pair and never open a socket.
 */

import {
  createLocalJWKSet,
  createRemoteJWKSet,
  jwtVerify,
  type JWTVerifyGetKey,
} from "jose";

/**
 * Google publishes its keys behind a discovery document rather than at a fixed
 * URL, and says so for a reason: the JWKS location is theirs to move. Reading it
 * costs one request the first time and nothing afterwards; hardcoding the URL
 * buys nothing and fails as an outage nothing in this repo would explain.
 */
const DISCOVERY_URL = "https://accounts.google.com/.well-known/openid-configuration";

/**
 * Both spellings are Google's own. Their documentation states an ID token's `iss`
 * is `accounts.google.com` **or** `https://accounts.google.com`, so accepting one
 * would refuse tokens that are perfectly valid. (`design.md` §3 names only the
 * second; this is the correction, not a widening.)
 */
const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

/** What a caller gets back. Never an exception — see `verifyPassword` for the same stance. */
export type GoogleVerification =
  | { ok: true; email: string }
  | { ok: false; reason: string };

export interface GoogleTokenVerifier {
  verify(credential: string): Promise<GoogleVerification>;
}

/** Read at call time, not at import: tests and deploys set it after this module loads. */
function configuredClientId(): string {
  return (process.env["GOOGLE_CLIENT_ID"] ?? "").trim();
}

let remoteKeys: JWTVerifyGetKey | null = null;

/** Resolved once per process; `createRemoteJWKSet` then caches and rotates the keys itself. */
async function googleKeys(): Promise<JWTVerifyGetKey> {
  if (remoteKeys) return remoteKeys;
  const discovery = await fetch(DISCOVERY_URL);
  if (!discovery.ok) {
    throw new Error(`Google discovery document answered ${discovery.status}`);
  }
  const { jwks_uri: jwksUri } = (await discovery.json()) as { jwks_uri?: string };
  if (!jwksUri) throw new Error("Google discovery document carried no jwks_uri");
  remoteKeys = createRemoteJWKSet(new URL(jwksUri));
  return remoteKeys;
}

export function createGoogleVerifier(options?: {
  /** Injected by the tests. Left out, the keys come from Google's discovery document. */
  keys?: JWTVerifyGetKey;
  /** Injected by the tests so a fixture does not depend on process env. */
  clientId?: () => string;
}): GoogleTokenVerifier {
  const readClientId = options?.clientId ?? configuredClientId;

  return {
    async verify(credential: string): Promise<GoogleVerification> {
      const clientId = readClientId();
      if (!clientId) {
        // Refused rather than skipped. An absent audience is the check that
        // disappears silently when the argument is left off, and a token accepted
        // without one is a token minted by anybody for anything.
        return { ok: false, reason: "GOOGLE_CLIENT_ID is not set" };
      }
      if (!credential) return { ok: false, reason: "no credential" };

      try {
        const keys = options?.keys ?? (await googleKeys());
        const { payload } = await jwtVerify(credential, keys, {
          issuer: ISSUERS,
          audience: clientId,
        });

        // `jwtVerify` has checked the signature, the issuer, the audience and the
        // expiry by here. What it cannot know is whether Google vouches for the
        // address: it asserts one for account types it has never verified, and an
        // unverified address from Google proves no more than a typed one.
        if (payload["email_verified"] !== true) {
          return { ok: false, reason: "email_verified is not true" };
        }
        const email = payload["email"];
        if (typeof email !== "string" || email.length === 0) {
          return { ok: false, reason: "no email claim" };
        }
        return { ok: true, email };
      } catch (err) {
        // Every failure reads the same to the caller. The reason is for the log.
        return { ok: false, reason: err instanceof Error ? err.message : "unverifiable" };
      }
    },
  };
}

/** Test seam: build a verifier over a fixed key set, with no network anywhere. */
export function createLocalGoogleVerifier(
  jwks: { keys: unknown[] },
  clientId: () => string,
): GoogleTokenVerifier {
  return createGoogleVerifier({
    keys: createLocalJWKSet(jwks as Parameters<typeof createLocalJWKSet>[0]),
    clientId,
  });
}
