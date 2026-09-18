---
type: eval
target: 2026-09-18-a-password-less-identity
version_key: 21297d5
dimension: willison
verdict: pass
judge: opus-5
created: 2026-09-18T12:29:50-07:00
created_ns: 1789759790014613000
scope:
---

Proof is strong and was not taken on trust. verifyPassword's guard made to throw -> password.test.ts fails 'promise rejected instead of resolving'; a null hash made to skip comparison -> auth.test.ts fails 'expected 200 to be 401'. Both green on restore, files verified unmodified. A probe also disproved design.md 4's claim that the tests would catch '' replacing DECOY_HASH; the doc was corrected rather than left.
