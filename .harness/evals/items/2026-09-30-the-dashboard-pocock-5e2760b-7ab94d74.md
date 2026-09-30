---
type: eval
target: 2026-09-30-the-dashboard-says-when-the-feed-last-moved
version_key: 5e2760b
dimension: pocock
verdict: mixed
judge: opus-5
created: 2026-09-30T12:16:12-07:00
created_ns: 1790795772853337000
scope:
---

TS: the fix's own first draft used a four-key lookup table whose values all evaluate, running staleness() on a null in the never/unknown branches and producing a discarded 'NaN days ago'. Two 'as number' casts hid it from the typechecker, the unused value hid it from the tests. Replaced with narrowing; zero casts in the file, typecheck clean. Also noted: landing typecheck needs 'tsc --build' on the libs first in a fresh worktree - TS6305, not a code error.
