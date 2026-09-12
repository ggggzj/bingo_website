# Proposal — jobs-page

## Why

The website has accounts and nothing behind them. `/account` says who you are and offers a
way out. The owner decided on 2026-09-10 that a job feed is what an account holds, and
lifted the standing instruction in `replit.md` that had kept the feed off this site.

The feed itself has been built and running in `../h1_checker` since P0–P2: 8,607 open
postings from 43 boards, each joined to an employer with certified DOL filings. Until
2026-09-11 there was no way to read it from here; `GET /api/postings` shipped that day
(DECISIONS D-044 there) and this page is what it exists to serve.

**The gap this page fills, in the owner's words.** Reading a competitor's highest-traffic
job list on 2026-09-11 they said: *"我不知道这些是不是 sponsor 的."* That page shows company,
title, location, ATS source, date and skill tags, and nothing about sponsorship — the
competitor keeps its sponsorship database on a different page entirely. This page puts the
employer's certified filing count and years **on the row**, which is the one thing this
product has that theirs does not.

Origin: `.harness/backlogs/001-jobs-page-split-pane.md`, counterpart
`../h1_checker/.harness/backlogs/004-publish-the-feed-as-a-github-job-list.md`.

## What Changes

- **`/jobs`** — a split-pane page, read off the two reference products the owner supplied.
  Left: a scrolling column of posting cards. Right: a sticky detail pane with a primary
  apply button that leaves for the employer's own posting.
- **A filter row** in the shape of the owner's third reference image, with the option values
  fixed against what upstream actually stores: company, location text, posted-within,
  remote, and a sponsorship control. **Seniority and category are title searches, not
  classifications** — upstream classifies nothing, and the reference image demonstrates why
  (it tags "Sr. Solutions Architect" as Entry-Level).
- **`GET /api/jobs`** on the api-server, proxying upstream the way `stats.ts` proxies
  `/stats`. It crosses the **shared-secret upstream seam**, with `POSTINGS_TOKEN` — a
  different secret from `STATS_TOKEN` by deliberate design upstream, so rotating one does
  not close the other.
- **The forwarded-parameter allowlist widens from numbers to text.** `stats.ts` forwards two
  bounds-checked integers and builds the upstream path itself "so it can never be steered
  into asking that service for something the dashboard did not ask for". This route keeps
  that rule and extends it: each parameter is named, typed, bounded and re-encoded here, and
  anything unrecognised is dropped rather than passed through.
- **`lib/api-spec/openapi.yaml`** gains the route, with codegen run in the same task so the
  frontend hooks and Zod schemas come from the contract rather than by hand.
- **Sponsorship evidence renders where the competitors put a paywall.** Simplify's detail
  pane carries one flat line, "H1B Sponsorship Available", beside two blurred "Unlock with
  Simplify+" cards. This pane shows the filings behind the claim, free.

## Non-goals

- **Personalisation and the logged-in layer.** No saved jobs, no preferences, no "already
  applied", no digest. This page is read-only and identity-free, which is also what keeps
  the ticket's open question about two account systems from having to be answered now
  (`.harness/backlogs/001`, note 3). A later change adds the logged-in layer.
- **Deciding whether the page is public or gated.** Read-only and unauthenticated is what
  this change ships; that is the cheapest thing that works and it forecloses nothing.
- **Coverage.** 43 boards means no FAANG and none of the largest filers. Not fixed here —
  the page is framed as a filtered feed rather than a search engine, and says so on itself.
  The routes to close it are the counterpart ticket's decision 1.
- **The employer section.** `.harness/backlogs/002` is a different page over a different
  table, blocked on its own upstream work.
- **Classifying seniority or category.** Upstream serves neither and this page must not
  invent them.
- **Touching `AuthStore`, sessions, or the owner gate.** Nothing here reads a user.

## Capabilities

### New Capabilities

- `jobs-page`: the public job feed on this site — what the page renders, which filters it
  offers and what backs each one, how a posting is linked to, what it claims about
  sponsorship, and what it says about its own coverage.
