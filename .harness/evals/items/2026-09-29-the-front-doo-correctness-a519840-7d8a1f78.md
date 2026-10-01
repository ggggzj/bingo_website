---
type: eval
target: 2026-09-29-the-front-door-shows-the-jobs
version_key: a519840
dimension: correctness
verdict: fail
judge: opus-5
created: 2026-09-30T17:18:56-07:00
created_ns: 1790813936673289000
scope:
---

Two confirmed high findings at the close-out review. (1) Signing in on / did not expand the block: useForgetAuth invalidated only the me key, so the jobs query served cached anonymous data with 'N more, sign in to see the rest' to a just-signed-in visitor — the headline behaviour of owner decision 4. Proven by a failing Home.test.tsx that drives the transition; every prior test picked a side and stayed on it. (2) The front page reached the upstream per load against a 60/minute;1000/hour per-client-IP limit shared by all visitors. Both fixed in a519840, each mutation-checked.
