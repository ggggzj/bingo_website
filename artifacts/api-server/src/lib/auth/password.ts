/**
 * Password hashing with scrypt from Node's own crypto module.
 *
 * scrypt rather than bcrypt or argon2 because it is built in: those two arrive as
 * native modules, and this server is bundled by esbuild and deployed to a host that
 * would have to compile them. A dependency-free hash that Node maintains is worth
 * more here than a marginally better one that complicates every build.
 *
 * The stored form carries its own parameters — `scrypt$N$r$p$salt$hash` — so the
 * cost can be raised later without invalidating every password already hashed.
 */

import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

type ScryptParams = { N: number; r: number; p: number };

const scrypt = promisify(scryptCallback) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: ScryptParams & { maxmem: number },
) => Promise<Buffer>;

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

// N=2^15 with r=8 needs ~32MB and roughly a tenth of a second per hash — enough to
// make offline guessing expensive, little enough that a login still feels instant.
const CURRENT: ScryptParams = { N: 32768, r: 8, p: 1 };

// Node's default maxmem (32MB) is exactly at the edge of what these parameters need,
// and "exactly at the edge" is how you get an error on one machine and not another.
function maxmemFor({ N, r }: ScryptParams): number {
  return Math.max(32 * 1024 * 1024, 256 * N * r);
}

// Unicode-normalize first: the same password typed on two keyboards can arrive as
// two different byte strings, and the user would have no way to tell why one works.
function normalize(plain: string): string {
  return plain.normalize("NFKC");
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await scrypt(normalize(plain), salt, KEY_LENGTH, {
    ...CURRENT,
    maxmem: maxmemFor(CURRENT),
  });
  return [
    "scrypt",
    CURRENT.N,
    CURRENT.r,
    CURRENT.p,
    salt.toString("base64"),
    key.toString("base64"),
  ].join("$");
}

/**
 * False for a wrong password and false for a stored value this code cannot read —
 * a truncated row, a hash written by some other scheme. Never throws: a caller that
 * has to wrap this in a try/catch will eventually forget, and the forgotten branch
 * is the one that lets someone in.
 */
export async function verifyPassword(
  plain: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, rawN, rawR, rawP, rawSalt, rawKey] = parts;
  const params = { N: Number(rawN), r: Number(rawR), p: Number(rawP) };
  if (!Object.values(params).every((n) => Number.isInteger(n) && n > 0)) {
    return false;
  }

  let expected: Buffer;
  try {
    expected = Buffer.from(rawKey, "base64");
  } catch {
    return false;
  }
  if (expected.length === 0) return false;

  let actual: Buffer;
  try {
    actual = await scrypt(
      normalize(plain),
      Buffer.from(rawSalt, "base64"),
      expected.length,
      { ...params, maxmem: maxmemFor(params) },
    );
  } catch {
    // Parameters this machine cannot satisfy — absurd N, a memory limit. Not a match.
    return false;
  }

  return timingSafeEqual(actual, expected);
}
