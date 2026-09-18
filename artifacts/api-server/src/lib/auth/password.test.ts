/**
 * `verifyPassword`'s refusals.
 *
 * The round trip is covered where it is used — these tests exist for the other
 * half: what the function does with a stored value it cannot read. That became
 * load-bearing when `UserRecord.passwordHash` was allowed to be null, because the
 * only thing between this function and a null is a `??` at one call site.
 */

import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "./password";

const PASSWORD = "correct horse battery staple";

describe("verifyPassword", () => {
  it("accepts the password it hashed, and refuses a different one", async () => {
    const stored = await hashPassword(PASSWORD);
    await expect(verifyPassword(PASSWORD, stored)).resolves.toBe(true);
    await expect(verifyPassword(PASSWORD + "!", stored)).resolves.toBe(false);
  });

  it("an unreadable stored value is refused rather than thrown", async () => {
    // The empty string is the one that matters now: an identity with no password
    // reaches a caller as `null`, and `routes/auth.ts` substitutes a decoy hash so
    // it never arrives here at all. If that substitution is ever "simplified" away,
    // this is the behaviour that decides whether the result is a refusal or a
    // crash — and a crash in a sign-in route is a 500 where a 401 belongs.
    //
    // The others are the cases the function was written for: a truncated row, a
    // hash from some other scheme, a field somebody padded.
    for (const stored of [
      "",
      "scrypt",
      "scrypt$16384$8$1",
      "bcrypt$2b$12$abcdefghijklmnopqrstuv",
      "scrypt$16384$8$1$notbase64$notbase64",
      "scrypt$0$8$1$c2FsdA==$aGFzaA==",
      "$$$$$",
    ]) {
      await expect(
        verifyPassword(PASSWORD, stored),
        `stored value ${JSON.stringify(stored)}`,
      ).resolves.toBe(false);
    }
  });
});
