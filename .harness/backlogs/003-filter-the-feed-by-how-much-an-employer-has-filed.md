---
id: 003
title: Let the feed filter on how much an employer has actually filed
status: open
origin: Cut from `2026-09-11-jobs-page` at its review gate, 2026-09-11. The control was
  built, found to be a client-side lie, and removed rather than shipped.
counterpart: needs upstream work first — see below
---

## Why this is a ticket rather than a line of code

`/jobs` shipped with a two-option sponsorship control: everything, or hide postings whose
description refuses. A third was drafted — **"Only employers with filing history"** — and
cut at review.

It could not work. `GET /api/postings` upstream takes no minimum-filings parameter, so the
page could only filter the rows it had already fetched: twenty out of thousands. Worse, the
result count silently changed meaning when that option was chosen, from "roles matching your
filters" to "roles on this page that survived a second filter". A control that narrows what
you can see rather than what you asked for is worse than no control, so it went.

## Why it is worth having

This is the product's own differentiator pointed at itself. The page already shows every
employer's certified filing count; the one thing a reader cannot do is say *"only show me
companies that have done this more than a handful of times"*.

The counts are wide apart and the distinction is real: a weak employer in this data can mean
two filings in 2021, and a strong one four hundred through 2026. Someone deciding where to
spend an application cares which.

## What has to happen, in order

1. **Upstream, in `../h1_checker`:** `GET /api/postings` gains a minimum-filings floor —
   a number, or the existing `tier` vocabulary (`strong` / `weak`), which `sponsorship.py`
   already owns and which the badge, the digest and the browse route all share. Prefer the
   tier: a second definition of "enough filings" is how the badge and the page start
   disagreeing. That needs its own ticket over there.
2. **Here:** restore the third option, sending the new parameter. Delete nothing else — the
   two existing options are claims about the posting, this one is a claim about the
   employer, and the labels must keep saying which is which.

## Do not

Re-add it as a client-side filter. That is exactly what was cut, and the reason is recorded
in `FilterRow.tsx` beside the two options that remain.
