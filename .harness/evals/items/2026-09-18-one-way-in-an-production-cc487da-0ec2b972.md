---
type: eval
target: 2026-09-18-one-way-in-and-it-is-google
version_key: cc487da
dimension: production
verdict: pass
judge: opus-5
created: 2026-09-18T18:17:14-07:00
created_ns: 1789780634107112000
scope:
---

Re-judged at cc487da after the must-fix landed. /google now has its own limiter at sixty per quarter hour instead of sharing the password form's ten, so a shared campus egress is normal traffic rather than a lockout; proved by pointing the route back at the old limiter and watching attempt 11 return 429. The concurrent-create race re-reads instead of answering 500, driven by a store that refuses the insert the way Postgres would — its first draft used Promise.all and passed with the fix removed, which the in-memory store's atomic check-then-insert explains. Also fixed the flakiness the twenty-six new tests exposed: unbounded workers failed 3 of 6 runs on 5s timeouts from 64MB scrypt contention, never in anything slow of its own; capped at half the cores it is 6 of 6 green and faster than both alternatives.
