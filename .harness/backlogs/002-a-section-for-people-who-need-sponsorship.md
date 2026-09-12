---
id: 002
title: A section for people who need sponsorship, where every company in it sponsors
status: open
origin: Owner request 2026-09-11 — "在 website 中直接给需要 sponsor 的人开一个板块,里面的
  公司都是 sponsor 的公司". Arrived alongside the owner's observation while reading a
  competitor's job list: "我不知道这些是不是 sponsor 的".
counterpart: ../h1_checker/.harness/backlogs/007-serve-employers-to-the-website.md
---

## The symptom, in the owner's own words

They opened FrogHire.ai's "Software Engineer Jobs from Company Career Pages & ATS" page —
the competitor's highest-traffic job surface, 100K+ users behind it — and said: *"我不知道
这些是不是 sponsor 的."*

They were right. Read live 2026-09-11: each row carries company, title, location, ATS
source, date, and **skill** tags (Testing, Software Development, C, C++, Docker). The five
filters are job title, location, job type, experience, work mode. Nothing on the row and
nothing in the filter rail says anything about sponsorship. A student reading it is as
uninformed as they would be on LinkedIn.

That competitor is not short of the data — `/company` is a whole sponsorship database with
Amazon, Cognizant, Google, Tata, Infosys, Deloitte on page one. **The data simply lives on a
different page from the jobs, and the two never meet.**

This ticket is the section where they meet.

## What exists to build on

| Asset | State |
|---|---|
| `employers` (in `../h1_checker`) | **72,135 employers** with certified filing counts, first/last decision dates and last active year. A `h1b_dependent` column exists and is **empty in all 72,135 rows** — see decision 4 |
| `GET /api/postings` (shipped 2026-09-11) | Every posting row already carries `total_h1b_certified`, `last_active_year`, `tier`, and separately `no_sponsor` |
| `sponsorship.tier_for` | The one rule for strong/weak, shared by the badge, the digest and the browse route |
| This repo's `/jobs` ticket (001) | The split-pane job list this section sits beside |
| `src/routes/stats.ts` + `src/lib/stats/upstream.ts` | The proven proxy pattern for serving data that lives in the other repo |

Scale of the gap this section closes, measured 2026-09-11:

| | |
|---|---|
| Employers this product has sponsorship history for | **72,135** |
| Employers this product has job postings for | **43** |

Amazon 20,394 certified filings · Cognizant 14,503 · Microsoft 12,045 · Google 11,631 ·
Apple 10,187 · Tata 9,628 · Meta 8,952 · Infosys 8,172 · Deloitte 6,016 — every one last
active 2026, every one absent from the 43 boards.

## What done looks like

- A section on this site listing employers with certified H-1B filing history, searchable
  and filterable, where **every company in it has filed** — that is the section's premise
  and the thing the job list cannot promise.
- Each employer shows the number and the years, not a checkmark. "137 certified filings,
  2022–2026" is a fact with a source; a tick is a claim. This is the whole differentiator:
  the competitor's own database renders bare ✔️ marks.
- The page states where the data comes from and its vintage, and says plainly that filing
  history is evidence of past sponsorship, not a promise of future sponsorship.
- An employer this product also has postings for links through to those postings on `/jobs`.
- An employer it has no postings for offers a way out to that employer's own careers page —
  see decision 2, which is how the owner first framed this ("直接贴公司的岗位链接").
- Works at 320px as the rest of the site does.
- Tests first, per `replit.md`. The route that reaches upstream is tested the way `stats.ts`
  is: the real route, the real gate, against a fake upstream.

## Decisions for whoever picks this up — the owner's, not the implementer's

1. **What the section is called, and what it promises.** "Every company here sponsors" is
   the pitch and it is slightly stronger than the data. The honest form is "every company
   here has certified H-1B filings", which is what 72,135 rows actually support. The
   competitor's own wording on the same data is *"Past activity does not guarantee current
   sponsorship"* and, in their FAQ, *"Sponsorship history is a signal, not a guarantee."*
   `GROWTH_PLAN.md` §七's UPL line points the same way. **Do not let the section name make a
   claim the rows cannot carry.**
2. **Careers-page links: which employers, and who collects them.** The owner's framing was
   to link out to the company's own job page for employers with no postings here. Nothing
   auto-generates these — Google's is `google.com/about/careers`, Amazon's is `amazon.jobs`
   — so this is a hand-collected column. Ordered by filing volume, the top 100–200 covers
   every large name and every outsourcing filer, and is an afternoon's work. Whether to do
   it at all, and how many, is the owner's call.
3. **Do employers and postings share one page or two?** Two, on the current reading: an
   employer row has no title, no date and no location, so it cannot be sorted by recency or
   narrowed by "last 7 days" alongside postings. The competitor keeps them on separate pages
   for this reason and `SimplifyJobs/New-Grad-Positions` simply omits such companies. If the
   owner wants one page, the interaction between the two row shapes has to be designed
   rather than assumed.
4. **Which filters the employer rows get.** Supported by data that actually exists: name
   text, a filing-volume floor, a last-active-year floor.

   **Not supported, verified 2026-09-11:** E-Verify, PERM, STEM/non-STEM, company size,
   founding year, headquarters — the competitor's `/company` table shows every one of these
   and this product holds none of them. **`h1b_dependent` is also not available**: the column
   exists on `employers` but **0 of 72,135 rows carry a value**. Filling it is an intake
   change to `clean_data.py`, not a read.

   Do not put a control on the page that has no column behind it. That is exactly the trap
   the reference filter row walked into with Entry-Level, recorded in `../h1_checker`'s
   browse design §4.

## What has to happen upstream first

`GET /api/postings` serves postings. **Nothing serves employers.** `/check` answers one
employer by name and `/search` is fuzzy autocomplete capped at 50 results — neither lists,
filters or pages the employer table.

So this ticket is blocked the same way 001 was, and by the same shape of gap. The upstream
work is `../h1_checker/.harness/backlogs/007-serve-employers-to-the-website.md`.
