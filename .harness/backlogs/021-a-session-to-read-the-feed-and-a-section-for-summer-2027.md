---
id: 021
title: A session to read the feed, and a section for Summer 2027 — the login wall and the intern preset
status: open
origin: ROADMAP.md 第一步 5 (owner decision 2026-09-17) — "没登录的人打开 /jobs 会被送到首页";
  "/jobs 加一个「Summer 2027 实习」板块，就是一个预设好的筛选（标题匹配 intern，排除 "International"
  这种误匹配）". The roadmap states in the same item that this 反转了 9 月 10 号 "/jobs 公开" 的决定，
  提案里要写明 — see "What this reverses, by name" below.
related: .harness/backlogs/014 — the /go/<job_id> apply redirect. The two are counterparts in one
  repo: 014 is the first thing on the jobs side that reads a session when one exists, this is the
  one that requires one; 014's route must stay reachable **without** a session after this ships,
  and the intern section's rows are what its links will carry. .harness/backlogs/020 — a signed-out
  visitor is sent to the home page, so where that lands depends on 020's open decision.
counterpart: ../h1_checker/.harness/backlogs/021-the-summer-2027-intern-list-on-github.md — the
  public GitHub table whose "N more on bingocareer.com" line becomes "sign in with Google to see
  them" only once this wall exists. That ticket says so in its own "What ships".
blocks: nothing. Blocked by nothing, but see "The count problem" — the easy implementation is
  forbidden by a spec this repo already wrote.
grounded: 2026-09-20 — the mis-match below was measured against production, not assumed.
---

## Two things in one item, and they are independent

The roadmap bundles them because they ship together. They are separable and the proposal may
split them; the wall does not need the section and the section does not need the wall.

The two 顺手 fixes the same roadmap item mentions — 按申请量筛选 and 地点框说清楚能搜什么 — are
already `.harness/backlogs/003` and `005`. This ticket does not absorb them.

---

# Part 1 — the login wall

## What this reverses, by name

`openspec/config.yaml` requires a proposal that reverses a recorded architecture decision to
name it and say why. There are **three** places, not one, and they do not all reverse equally.

1. **`replit.md`: "`/jobs` is public and identity-free, and its secret is a third one."**
   Reversed in its first half. The reason it gives is worth reading before writing the
   proposal: *"The page reads no session and writes nothing, which is what kept the two-account-
   systems question out of shipping it."* That question — two databases, two `users` tables —
   is still open (`018`, grill-stopped 2026-09-20). A wall on this site's own sessions does not
   reopen it, because the session this site issues is this site's. Say that explicitly; it is
   the thing the original decision was protecting.

2. **`openspec/specs/jobs-page/spec.md`, Purpose:** *"Read-only and identity-free. No session is
   read, nothing is written."* This text changes. Note `014` pushes on the same sentence from
   the other side (it reads a session when one exists); whichever lands first should not leave
   the other's edit half-applied.

3. **`routes/index.ts:27`** carries the decision as a code comment — *"Public and identity-free
   — no auth store, because it reads nothing about a user."* The wall means
   `createJobsRouter` takes an `AuthStore`, and that comment becomes false. A line of prose
   that contradicts the wiring beside it is how the next reader learns the wrong thing.

**What does NOT reverse, and should be said so it is not re-litigated:** `POSTINGS_TOKEN` stays
a separate secret from `STATS_TOKEN` (the blast-radius reason still holds); the proxy keeps
building its own allowlist rather than forwarding the caller's query; and nothing on the page
starts classifying a posting.

**The 2026-09-10 instruction is not reversed.** `replit.md` records the owner lifting a ban —
"解除禁令,网站 /jobs" — that had kept the feed off this site entirely, including out of any
roadmap or coming-soon block. The feed still ships here. What changes is who may read it. The
proposal should draw that distinction rather than claim it is undoing the owner's own lift.

## The wall is the server, not the redirect

The established rule in this repo, stated in `use-auth.ts`: `isOwner` decides what to render,
never what the server will hand over. `Shell.tsx` navigates a signed-out visitor away *and*
every view keeps its own server-side refusal.

So: **`GET /api/jobs` refuses without a session.** The client-side send-to-the-home-page is
courtesy. Without the server half the feed is still public to anyone who opens the network tab,
and the wall is decoration.

Open question for the proposal: 401, or 404 the way `/api/stats/registrations` does? The 404
rule exists because a 403 confirms a route exists and has something behind it
(`replit.md`). `/api/jobs` is already known to exist and has been public for nine days, so the
argument that produced the 404 does not obviously carry. Pick deliberately.

## What must stay open

- **`014`'s `/go/<job_id>`.** It counts a signed-out click and redirects. The GitHub list links
  to it for people who have not signed in, and its whole first purpose is measuring how many
  of them arrive. A wall that catches this route breaks the only number
  `ROADMAP.md` 第三步 plans to decide the wall's own fate with.
- **The home page**, obviously, and whatever `020` makes of it.

## The privacy sentence is already owned

`014` owns the privacy-policy edit (apply clicks are counted; nothing identifying is kept for
signed-out visitors) as a counterpart change in `../h1_checker`, which serves `GET /privacy`
(`main.py:2993`). Do not write it twice. This ticket adds nothing to it: a wall collects
nothing new, it only refuses.

---

# Part 2 — the Summer 2027 intern section

## The mis-match is real, it is measured, and it is already shipping

`/api/postings` matches `title` as `ilike '%text%'` — `jobfeed/adapters.py:455`, and
`tests/test_browse_postings.py:238` pins it as a substring match on purpose. There is no word
boundary available upstream.

`FilterRow.tsx:44` already sends `title=intern` for its "Internship" preset. Against production
on 2026-09-20 (`GET /api/jobs?title=intern&limit=100`, 194 rows total):

| | |
|---|---|
| Rows returned in the sample | 100 |
| **Not an internship at all** | **18** |
| True intern rows | 82, of which 31 carry a software signal |

The 18 include `Director, US International Tax Planning`, `International Accounts Payable
Manager`, `Sr. Legal Counsel, International Public Sector Compliance`, `Internal
Communications Lead` — and, worse for a page whose whole claim is that it does not mislabel,
`Senior Software Engineer, Internal Fraud Platform` and `Principal Software Developer - Query
Engine, Database Internals`.

**Read that as two facts.** The second one is a defect on a page that is live now, not part of
this feature, and `CLAUDE.md` Rule 3 sends a bug through the bugfix door rather than the
backlog — reproduce, failing Vitest test, `fix-<slug>`. It is recorded here because this is
where it was found and because a session picking up this ticket will otherwise fix it silently
inside a feature change. **Raise it with the owner as its own thing; do not fold it in.**

**And it is not a one-line fix.** The obvious cheap repair is measured dead in "The count
problem" below. The two honest interim moves are a boundary-aware match upstream, or removing
the `Internship` preset from the picker until this ticket builds it properly — which is the
precedent `openspec/specs/jobs-page/spec.md` already set when a control that could not keep its
promise was removed at review rather than shipped narrowed.

## The count problem — the easy implementation is already forbidden here

The obvious fix is to fetch `title=intern` and drop the `International` rows in the browser.
**This repo specified that shape, built it, and removed it at review.** From
`openspec/specs/jobs-page/spec.md`:

> A third — only employers with filing history — was specified, built, and removed at review.
> Nothing upstream takes a minimum-filings floor, so it could only have filtered the rows
> already fetched, while the result count silently changed from "roles matching your filters"
> to "roles on this page that survived a second filter". A control that narrows what the reader
> can see rather than what they asked for SHALL NOT be offered.

And the spec's own **"The result count matches the list"** requirement says the count SHALL be
what the filters matched, counted the way the list pages through them. Post-filtering breaks
both. Whatever this section is, it cannot be a local filter over a fetched page.

Three ways out were on the table. One has since been measured and removed, so the proposal
picks between the remaining two:

1. **The upstream gains a boundary-aware title match.** The honest fix — it puts the filter
   where the count is computed. Cost: a counterpart ticket in `../h1_checker` and a contract
   change. Nothing here should pretend that is small.
2. ~~**Choose terms that do not collide.**~~ **Measured 2026-09-20, and it is dead.** The idea
   was that `%internship%` cannot reach `International`, so swapping the preset's value is a
   one-line fix. It is, and it destroys the feature:

   | | `title=intern` | `title=internship` |
   |---|---|---|
   | Rows upstream | 194 | 23 |

   In a sample of 100 rows from the first, 82 are real internships and **all 82** are titled
   `... Intern` rather than `... Internship`. The losses are the exact audience: `Software
   Engineering Intern (Summer 2027)`, `Software Engineer, Intern`, `Security Risk Management
   Intern (Summer 2027)`. The swap trades 18 wrong rows for 82 missing right ones. Recorded so
   nobody re-derives it and ships it.
3. **A precomputed section** — the list is built server-side and cached, with its own count,
   the way `routes/new-grad.ts` builds one. See the warning below.

## The fan-out in `new-grad.ts` does not transfer, and its own comment says so

`routes/new-grad.ts` already solves exactly this shape: coarse `ilike` terms out to the
upstream, the precise boundary test (`isEarlyCareerSoftware`, `titles.ts`) run locally. Reuse
the *pattern* and the `\bintern\b` regex — `titles.ts:99` says in its own comment that
`International` is the mis-match the owner's collection run already paid for once.

But do not reuse the *shape* without reading what it says about itself: fourteen sequential
upstream requests per list build, deliberate and **temporary**, justified by there being one
reader. Its comment names the moment it stops being acceptable — *"when `.harness/backlogs/016`
opens this to every user the query belongs upstream, and this is what gets deleted."*

`/jobs` is every visitor. Fourteen upstream requests per page load is that deletion arriving
early, and the upstream's rate limit is per calling server — this server — so it is one budget
shared by everybody. Whatever is built, it is not that loop on a public page.

## What the section is, and what it must never become

A preset filter. The roadmap's words: 就是一个预设好的筛选. Not a classifier.

`openspec/specs/jobs-page/spec.md` — *"Seniority and category narrow by title and label
nothing"* — still holds, and so does the reason: a competitor's page tags "Sr. Solutions
Architect" as Entry-Level, and a wrong badge costs this page the only advantage it has. **No
row gains an "internship" badge.** The section narrows what is listed; it asserts nothing about
any posting.

"Summer 2027" is the section's name, not a claim about each row. `titles.ts:135` already
measured why: 367 of 376 rows name no year at all, so a year filter returns almost nothing.
`namesTargetClass` fences and sorts and never filters — follow it.

US-only: `lib/new-grad/location.ts` already reads location three-state. Reuse rather than
rediscover.

---

## What done looks like

**The wall**
- `GET /api/jobs` refuses a request with no session, proven by a route test against the memory
  store the way `auth.test.ts` and `jobs.test.ts` already run the real routes.
- A signed-out visitor opening `/jobs` lands on the home page; a signed-in one sees the feed
  unchanged.
- `/go/<job_id>` still answers for a signed-out caller once `014` exists, and a test says so.
- `replit.md`'s "`/jobs` is public and identity-free" entry, the `jobs-page` spec's Purpose, and
  the comment at `routes/index.ts:27` all say what is now true. None left contradicting another.

**The section**
- A preset on `/jobs` that lists Summer 2027 software internships in the US and **no row whose
  title merely contains `International` or `Internal`** — proven by a test carrying the six real
  titles named above, not invented ones.
- The result count matches what the list can actually page to. If it cannot, the approach is
  wrong, not the count.
- No row carries an internship, seniority or category badge.
- The page still states its own coverage — employers with certified filings, from a limited set
  of boards. A section named for one hiring season makes an absence read as an answer twice as
  easily.

## Notes for whoever picks this up

- **Order matters against `../h1_checker/021`.** That list's header line becomes "sign in with
  Google to see them" only once this wall is live; before then it must not promise a sign-in
  that shows the same thing a visitor could already see. Neither ticket should ship a claim the
  other has not delivered.
- **`016` is the ticket this makes possible, not this ticket.** A feed filtered to the person
  needs one `users` table and is blocked by `018`. A wall needs only this site's own session.
  Do not let one drift into the other.
- **The wall's own review criterion is a number that does not exist yet.** `ROADMAP.md` 第三步
  plans to 用这个数复核登录墙的决定 — GitHub → site → sign-in. That number comes from `014`'s
  click count. A wall shipped before anything counts is a wall nobody can evaluate; say so in
  the proposal rather than discovering it in October.
- **The funnel history is in `ROADMAP.md` and it is not encouraging**: 验证邮件 48 封打开 2 封；
  60 个邮箱 → 5 个设了密码 → 4 个填了资料. 每道墙都会掉人. That is an argument for shipping the
  counter with the wall, not an argument against the owner's decision.
