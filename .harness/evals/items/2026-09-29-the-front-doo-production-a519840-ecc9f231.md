---
type: eval
target: 2026-09-29-the-front-door-shows-the-jobs
version_key: a519840
dimension: production
verdict: fail
judge: opus-5
created: 2026-09-30T17:18:56-07:00
created_ns: 1790813936780543000
scope:
---

Production lens (public API surface + shared infra). The busiest page gained an uncached synchronous upstream call sharing one rate-limit budget across all visitors; past it the upstream 429s, the route 502s, and the front page degrades for everybody. Fixed by a 60s identity-free cache that never stores failures. Residual advisory, not fixed here: the api-server still has no rate limiting or response caching of its own (grep of app.ts: no hits).
