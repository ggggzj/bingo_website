---
id: 019
title: The list the owner applies from, rebuilt every morning — 2027 new-grad SDE, one person
status: open
origin: Owner request 2026-09-18 — "login 我的账号之后，有一个 dashboard 是专门给我自己用的…
  我现在在 apply 美国境内的 27ng 的 entry level 的 SDE…希望这个 dashboard 可以告诉我可以 apply
  哪些岗位，然后每天根据岗位的放出来进行实时的更新". Reference form supplied by the owner:
  `美国科技公司_可Sponsor应届SDE岗_USC校友Referral话术_2026-09-13.xlsx` — a ten-sheet
  spreadsheet an agent built for them on 09-11/09-13, which is the thing this replaces.
counterpart: ../h1_checker/.harness/backlogs/026-find-the-boards-ourselves-instead-of-knowing-43.md
  (written 2026-09-18, the data half) and ../h1_checker/.harness/backlogs/022-workday-as-the-fourth-provider.md
blocked-by: ../h1_checker/.harness/backlogs/026 first, then 022. 023 is the one that matters (it discovers the boards; the owner ruled out building on their spreadsheet):
  without it this page shows 14 rows from 3 employers. Deliberately **not** blocked by
  018/015 (one account) — see "Why this one is not blocked".
grounded: 2026-09-18 — every number below was measured off the owner's spreadsheet, this
  repo's code, or a public API, not assumed.
---

## What the owner already has

The spreadsheet is not a sketch. It is a working artifact with 467 postings, 376 of them in
the US, across 107 companies, plus a 568-row company sheet and a per-company USC alumni
column with referral scripts. Its own 说明 sheet documents the method: two sources (the
GitHub repo `SimplifyJobs/New-Grad-Positions`, and direct reads of ~300 company boards), a
title filter that requires a software signal **and** a new-grad signal while excluding
senior / staff / lead / II / III / intern, and a US-location column.

So the request is not "build me a job list". It is: **the spreadsheet is a snapshot dated
2026-09-11, and its refresh mechanism is a line in the 说明 sheet — 想刷新跟我说一声重跑即可.**
A rolling market where reqs close when full cannot be served by a file somebody re-runs by
hand. That is the whole ask.

## Correction, 2026-09-18 — the first coverage number below was wrong, and wrong the expensive way

The table in the next section buckets the owner's rows by ATS vendor and says our three
providers reach 81 of 376. **That assumed we read every Greenhouse, Lever and Ashby board.
We read 43 boards** (`../h1_checker/curated/ats_boards_seed.csv`, and `docs/ARCHITECTURE.md:142`
agrees). Intersecting the owner's rows against the boards we actually sync:

| | |
|---|---|
| Its US rows on Greenhouse / Lever / Ashby anywhere | 79 |
| **On a board we actually sync** | **14** |
| Distinct employers in those 14 | **3** — Palantir (10, all posted in June), Notion (3), Scale AI (1) |

So the real ladder for this page is:

| | Rows the owner sees | Cost |
|---|---|---|
| Build it today | **14** | this ticket alone |
| After `../h1_checker/026` — board discovery over the ~70k employer table, with the three existing readers | **79 against the owner's own list**, and an unknown number beyond it, since discovery is not limited to companies they happened to find | a discovery script and a sync run; no new provider code |
| After `022` (Workday) | **210** on the same measure | 022 itself, with 023 supplying its tenants |

The vendor table below still holds for the *shape* of the market. It is the "what we reach
today" column that was overstated, and the fix is `023`, not this ticket.

## The coverage number that decides everything

Measured by taking the 376 US rows in the owner's sheet and bucketing their apply links by
which applicant tracking system serves them:

| Where the row comes from | Rows | Share |
|---|---|---|
| Greenhouse + Lever + Ashby — **what our pipeline reads today** | 81 | 21% |
| Workday — h1_checker ticket `022`, already first in the roadmap's 第一步 | 131 | 34% |
| Company-owned sites (TikTok 52, ByteDance 25, Oracle Cloud 18, Amazon 9, Apple 7, Microsoft 4, Google 2…) | 164 | 44% |

And by the sheet's own 来源 column: **349 of the 376 came through the GitHub repo**, only 27
from direct board reads.

Read that twice before designing anything. A dashboard built on today's three providers shows
the owner **81 rows out of the 376 they already have in a file**. That is not a smaller version
of the spreadsheet — it is a downgrade with a login in front of it, and the one thing it adds
(freshness) would be freshness on the wrong fifth of the market. `../CLAUDE.md`'s sibling rule
about half-finished pages applies to a page with one reader too.

Workday (`022`) takes it to 212/376 = 56%. The remaining 44% is company-owned sites, which
`ROADMAP.md` 第一步 defers on purpose: *Amazon / Google / Meta 这种自建招聘站先不碰——那是合规
问题，不是技术问题.*

## Why this one is not blocked

`016` (a feed filtered to the person) and `017` (tracker) are both blocked by `018`/`015`,
because a feed for *users* needs one `users` table and there are two. **This ticket has one
reader who already has an account on both surfaces.** The blocker does not apply to them.

And the shell it lands in is already built and archived — `008` shipped
`/dashboard/:view?` with `VIEWS` in `artifacts/landing/src/pages/dashboard/views.tsx` as the
whole extension point, and `entitled: (viewer) => viewer.isOwner` is already in use by Growth.
Adding this view is **one entry in that array**, exactly what `008` promised the rail was for.

So the rendering half is cheap and unblocked. All the weight is on the data half.

## The three things a page can do that a file cannot — and the one it cannot

Worth being exact, because these are the only reasons to build this at all:

1. **New since you last looked.** In a rolling market with no deadlines, the only actionable
   signal is what appeared since yesterday. A re-run spreadsheet cannot tell you that; a table
   with `first_seen_at` can, and h1_checker's `job_postings` already has that column and already
   never deletes rows.
2. **Closed since you last looked.** Same table sets `is_open = False` when a board stops
   listing a posting. The spreadsheet's rows silently rot.
3. **The two sponsorship facts we have and Simplify does not** — `tier` / `total_h1b_certified`
   from certified DOL filings, and `no_sponsor` read off the posting's own description. The
   owner's sheet had to approximate this by hand-excluding defense contractors and Accenture
   Federal. Ours is the product's actual differentiator and it is already computed.

What it **cannot** do: the USC alumni column and the referral scripts. Those came from a manual
read-only LinkedIn search (the 说明 sheet says so, and says no message or request was ever sent).
D-012 rules out scraping LinkedIn. That column can be **stored and edited by hand**, seeded by
importing this spreadsheet — it cannot be generated. Say so on the page rather than leaving a
column that quietly never fills.

## Sorting is a proxy, and the page must say which

The owner's own 说明 sheet already did this investigation and reached the honest answer:

> 这 284 条岗位里没有一条公布了申请截止日期…美国这类岗位基本是 rolling，招满即关，没有硬 ddl。
> 所以「按紧急度排序」这个表用的是可验证的代理指标。

So the sheet sorts by two observable facts — "2027 / new grad written in the title" and "days
since posted" — and puts the reason in column 2 so the reader can disagree. **Copy that
exactly.** Ranking by observed facts with the reason shown is fine. A score, a match percentage,
or "apply today" as a system claim is the thing this product killed once already
(`ROADMAP.md` 明确不做, and the 中签率计算器 removed 09-10).

## What done looks like

- A view in the `/dashboard` rail, owner-only via `entitled`, whose server side refuses
  everyone else the way Growth's does — the rail predicate is convenience, never the boundary.
- It lists US postings matching the new-grad SDE filter, newest first, and each row shows: the
  employer's H-1B filing count and tier, whether the posting's own text refuses sponsorship, the
  posted date, days since posted, and the apply link.
- **It separates "new since my last visit" from the rest**, and it shows rows that have closed
  since then rather than dropping them silently.
- Each row carries a free-text note the owner writes (alumni, referral status, "applied") and it
  survives a reload. Importing the existing spreadsheet's alumni column is enough for v1.
- The empty state and the header state **how many sources feed it and what that misses** — the
  same honesty `016` and the coach page are already held to. If it is running on three providers,
  the page says which companies it therefore cannot see.
- Tested, not eyeballed. `artifacts/landing` gained a test runner in `008`; use it.
- No score, no match percentage, no predicted deadline. Ordering shows its reason.

## Decided by the owner, 2026-09-18

**1. The rows come from our own pipeline, after Workday.** Asked to choose between today's
three providers (81 rows), our pipeline once `022` lands (212), and ingesting
`SimplifyJobs/New-Grad-Positions` (~93%), the owner chose **wait for Workday**. So this
dashboard is blocked on `022` and reads nothing we did not fetch ourselves.

That closes the license question by not raising it: the repo carries `license: None`
(measured 2026-09-18 against the GitHub API — 18,015 stars, pushed continuously), which
would have been a live question for republishing. We are not using it. Recorded here so the
finding is not re-derived by the next session.

**The consequence, measured, so it is not discovered as "the dashboard is broken":** of the
owner's 376 US rows, `Greenhouse + Lever + Ashby + Workday` reach **212. 164 stay invisible,
and 36 of the 107 companies disappear entirely.** The biggest block is one employer:

| Invisible employer | Rows lost |
|---|---|
| TikTok / ByteDance | 77 |
| Amazon / AWS · American Express | 9 each |
| Apple · Garmin | 7 each |
| Deloitte 5 · Microsoft 4 · Accenture / Oracle / Esri / Western Digital 3 each | |
| Google, JPMorgan, TI, Akuna, HRT, Two Sigma, Wolverine | 2 each |

TikTok and ByteDance run `lifeattiktok.com` and `jobs.bytedance.com` — their own sites, which
`ROADMAP.md` 第一步 defers as a compliance question, not a technical one. **The page must name
this gap in its own header.** A personal list that silently omits a fifth of the market and the
owner's single largest source of 2027 reqs is the failure mode `016` already names: a surface
that claims to be about you is worse than a public one when it is wrong.

**2. It lands in the website's signed-in dashboard.** The owner's words: "login 我自己 account
之后的 dashboard". So: a view in `VIEWS`
(`artifacts/landing/src/pages/dashboard/views.tsx`), `entitled: (viewer) => viewer.isOwner`,
reachable at `/dashboard/<id>`, with its own server-side refusal the way Growth has one. The
workspace router's landing decision (`../CLAUDE.md`) is hereby recorded, not assumed.

**Still open, and it does not block a proposal:** whether this comes before or after the rest
of 第一步 (the public intern list, Google sign-in, the new home page) once `022` lands. That
answer arrives with the `/implement` invocation, which is the owner's gate anyway.

## Notes for whoever picks this up

- **The new-grad classifier is not a detour from the roadmap — it is `021` with a different
  filter.** 第一步's GitHub intern list needs the same title machinery, one signal apart
  (`intern` vs new-grad). Whoever builds it for this dashboard should build it where `021` can
  use it, not twice.
- **The name join is the quiet risk.** Rows from any new source land as employer name strings
  and must reach our H-1B employer rows to be worth anything. h1_checker already has
  `EmployerAlias` (`models.py:461`), which means this problem was met and solved once; reuse it
  rather than discovering it again.
- **`/api/postings` cannot express this filter today.** It takes one `title` substring
  (`main.py:3204`), and the new-grad filter is a disjunction of software terms AND a disjunction
  of new-grad terms MINUS an exclusion list. Whatever gets built, it is not a query parameter
  away.
- **Simplify's own `sponsorship` field is in the JSON and is nearly empty** — the roadmap
  already measured it at 1 marked row out of 1,867. Do not read it as data; ours is the column
  that has something in it.
- **The spreadsheet's exclusion list is knowledge, not noise.** Defense/US-person employers
  (Anduril, Blue Origin, Booz Allen, Northrop, Raytheon/RTX, Relativity, Rocket Lab, SpaceX),
  Accenture Federal, and `Ctj`/`Poly`/clearance titles were removed by hand because they cannot
  sponsor. Whoever builds the filter should carry that list across rather than let the owner
  re-learn it a second time.
- **Same-name traps, already paid for once.** The 说明 sheet lists five: greenhouse `purestorage`
  is a different Everpure; ashby `flock` is not Flock Safety; lever `capital` is capital.com;
  lever/ashby `safe` is not Safe Superintelligence; Workday `google`/`GOCJobs` is Google
  Operations Center. These are board-token collisions, which is precisely the class of bug our
  own sync can hit.
