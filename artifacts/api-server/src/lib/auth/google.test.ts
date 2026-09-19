/**
 * The verifier's refusals, against locally minted tokens.
 *
 * Every token here is signed with a throwaway RSA key pair whose public half is
 * handed to the verifier as its key set, so these run the real `jose` verification
 * path — real RS256, real claim checks — and never open a socket. A test that
 * mocked the verification would be testing the mock.
 */

import { exportJWK, generateKeyPair, SignJWT, type KeyObject } from "jose";
import { beforeAll, describe, expect, it } from "vitest";

import { createLocalGoogleVerifier } from "./google";

const CLIENT_ID = "1069740098250-test.apps.googleusercontent.com";
const EMAIL = "somebody@usc.edu";

let privateKey: KeyObject | CryptoKey;
let jwks: { keys: unknown[] };
/** A second pair nobody told the verifier about, for the forged-signature case. */
let strangerKey: KeyObject | CryptoKey;

beforeAll(async () => {
  const pair = await generateKeyPair("RS256", { extractable: true });
  privateKey = pair.privateKey;
  jwks = { keys: [{ ...(await exportJWK(pair.publicKey)), alg: "RS256", kid: "test" }] };

  const stranger = await generateKeyPair("RS256", { extractable: true });
  strangerKey = stranger.privateKey;
});

type Claims = Record<string, unknown>;

async function token(
  claims: Claims = {},
  opts: { key?: KeyObject | CryptoKey; expired?: boolean } = {},
) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ email: EMAIL, email_verified: true, ...claims })
    .setProtectedHeader({ alg: "RS256", kid: "test" })
    .setIssuer("https://accounts.google.com")
    .setAudience(CLIENT_ID)
    .setIssuedAt(opts.expired ? now - 7200 : now)
    .setExpirationTime(opts.expired ? now - 3600 : now + 3600)
    .sign(opts.key ?? privateKey);
}

const verifier = () => createLocalGoogleVerifier(jwks, () => CLIENT_ID);

describe("the Google verifier", () => {
  it("a valid token yields the address Google signed", async () => {
    await expect(verifier().verify(await token())).resolves.toEqual({
      ok: true,
      email: EMAIL,
    });
  });

  it("accepts either spelling of the issuer, because Google sends both", async () => {
    const bare = await new SignJWT({ email: EMAIL, email_verified: true })
      .setProtectedHeader({ alg: "RS256", kid: "test" })
      .setIssuer("accounts.google.com")
      .setAudience(CLIENT_ID)
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(privateKey);

    await expect(verifier().verify(bare)).resolves.toMatchObject({ ok: true });
  });

  it("a tampered payload is refused", async () => {
    const [header, , signature] = (await token()).split(".");
    const forged = Buffer.from(
      JSON.stringify({
        email: "attacker@example.com",
        email_verified: true,
        iss: "https://accounts.google.com",
        aud: CLIENT_ID,
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).toString("base64url");

    const result = await verifier().verify(`${header}.${forged}.${signature}`);
    expect(result.ok).toBe(false);
  });

  it("a signature from a key Google did not publish is refused", async () => {
    const result = await verifier().verify(await token({}, { key: strangerKey }));
    expect(result.ok).toBe(false);
  });

  it("a token minted for another application is refused", async () => {
    /* The audience check is the one that vanishes silently when the argument is
       left off — `jose` simply stops comparing — so it gets a test of its own
       rather than riding on the happy path. A correctly signed, unexpired,
       verified-email token still has to be *for us*. */
    const forAnotherApp = createLocalGoogleVerifier(
      jwks,
      () => "someone-elses-client-id.apps.googleusercontent.com",
    );
    const result = await forAnotherApp.verify(await token());
    expect(result.ok).toBe(false);
  });

  it("an expired token is refused", async () => {
    const result = await verifier().verify(await token({}, { expired: true }));
    expect(result.ok).toBe(false);
  });

  it("email_verified false is refused", async () => {
    /* Google asserts an address for account types it has never verified. An
       unverified address from Google proves no more than a typed one, and this
       product's whole reason for preferring Google is that it proves the address. */
    const result = await verifier().verify(await token({ email_verified: false }));
    expect(result).toEqual({ ok: false, reason: "email_verified is not true" });
  });

  it("a token with no email claim is refused", async () => {
    const result = await verifier().verify(await token({ email: undefined }));
    expect(result).toEqual({ ok: false, reason: "no email claim" });
  });

  it("a missing client id is refused, and says so", async () => {
    const unconfigured = createLocalGoogleVerifier(jwks, () => "");
    await expect(unconfigured.verify(await token())).resolves.toEqual({
      ok: false,
      reason: "GOOGLE_CLIENT_ID is not set",
    });
  });

  it("never throws, whatever it is handed", async () => {
    for (const junk of ["", "not-a-jwt", "a.b.c", "....", "null"]) {
      await expect(verifier().verify(junk)).resolves.toMatchObject({ ok: false });
    }
  });
});
