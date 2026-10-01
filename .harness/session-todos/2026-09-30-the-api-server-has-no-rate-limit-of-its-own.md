---
title: The api-server has no rate limiting or response caching of its own
status: open
origin: Residual from the close-out review of `2026-09-29-the-front-door-shows-the-jobs`
  (2026-09-30). The review's production finding was fixed for the one route that caused it;
  this is the part that was deliberately left, because fixing it properly is not that
  change's business. Recorded per `session-eval`'s rule that a fail verdict's follow-up
  belongs in the actionable net, not in the eval row.
---

## What is true now

Grepped 2026-09-30: `artifacts/api-server/src/app.ts` has **no rate limiting and no response
caching**. Not a middleware, not a header.

That was defensible while every narrowed route answered a stranger with 404 — nothing a
visitor could do made this server spend anything. It stopped being true on 2026-09-30, when
`GET /api/internships` became public and landed on `/`, the busiest address the site has.

`/api/internships` now holds a 60-second in-process cache, so **the specific amplification
the review found is closed**: upstream cost is a function of time rather than traffic. What is
not closed is the general shape.

## Why it is still worth a ticket

- **`GET /api/jobs` has the same exposure and no cache.** It is public, identity-free, and
  proxies straight through to the upstream with the shared `POSTINGS_TOKEN`. Lower traffic
  than `/`, which is the only reason it has not mattered.
- **The upstream's limit is per client IP** (`../h1_checker/main.py:106`,
  `key_func=_client_ip`), and this server is one IP. Every public route that proxies shares a
  single allowance. A second uncached public proxy would re-open exactly what was just closed.
- **The cache is per process.** Railway running two instances doubles the upstream calls. Fine
  at 60s and one route; it is a number to know before adding a third.
- A per-route in-process cache is the right fix **once**. Repeated three times it is the wrong
  shape, and the moment to notice that is before the third.

## Where to start

- One place that owns "public, proxied, cacheable" rather than each route owning its own
  `cached` variable — `lib/jobs/upstream.ts` is the seam that already holds the secret and
  already knows every call going out.
- A basic `express-rate-limit` on the public surface. Note `TRUST_PROXY` is already a
  deliberate setting here (`replit.md`), and a rate limiter behind a proxy that trusts the
  wrong header limits the proxy rather than the visitor — get that right or the limiter is
  decoration.
- **Do not** add a limiter that counts the *owner's* dashboard calls against the same bucket
  as anonymous traffic.

## Not urgent

Nothing is currently broken: the one route that would have hit the ceiling no longer can, and
`/jobs` is not on a page anyone lands on by default. This is the thing to do before the next
public proxied route, not before the next deploy.
