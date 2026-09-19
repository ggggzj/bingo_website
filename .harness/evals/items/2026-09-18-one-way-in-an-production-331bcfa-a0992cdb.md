---
type: eval
target: 2026-09-18-one-way-in-and-it-is-google
version_key: 331bcfa
dimension: production
verdict: fail
judge: opus-5
created: 2026-09-18T16:23:13-07:00
created_ns: 1789773793055345000
scope:
---

Must-fix: signInLimiter (10 attempts / 15 min, keyed on IP by express-rate-limit's default) is now shared by /login and the new /google, and /google is the only way in. The limit was sized for a password form where attempts mean guessing; a Google token has nothing to guess. Behind a shared NAT — a university campus, which is this product's stated audience — the eleventh person to sign in within fifteen minutes is refused with 'Too many attempts'. Also low: concurrent first sign-in on one new address races createPasswordlessUser into a unique-constraint violation surfacing as a 500.
