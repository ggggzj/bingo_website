---
id: 001
title: A /jobs page on the website, split-pane, with sponsorship evidence where the competitors put a paywall
status: picked-up
produced: openspec/changes/2026-09-11-jobs-page/ (bounded change, 4 groups,
  13 tasks, validates) — awaiting approval
upstream: GET /api/postings, live behind POSTINGS_TOKEN
  (../h1_checker/openspec/changes/archive/2026-09-11-browse-postings/, DECISIONS D-044)
origin: User request 2026-09-10 — "job feed的页面可以参考图中的样式", with screenshots of
  simplify.jobs/jobs and speedyapply.com/jobs. Roadmap context is
  ../h1_checker/docs/JOB_FEED_PLAN.md (P0–P2 shipped, P3–P5 not).
counterpart: ../h1_checker/.harness/backlogs/004-publish-the-feed-as-a-github-job-list.md
---

## What this is

The website has accounts and nothing behind them — `/account` says who you are and offers
a way out. Both reference products put their whole logged-in surface here: a job list you
can search, filter and read without leaving the page.

The feed itself is built and running in `../h1_checker` (P0–P2): 8,607 open postings from
43 boards, each joined to an employer with certified LCA filings, with JD refusals already
filtered out.

## Unblocked 2026-09-10 — the owner lifted the instruction

`replit.md` carried a standing owner instruction to keep the job feed off this site until it
was finished, liftable only by the owner's own words. **They lifted it on 2026-09-10:
"解除禁令,网站 /jobs".** The lift and its date are recorded in `replit.md`, as this ticket
required.

Two further owner decisions landed the same day and set this ticket's shape:

1. **This page is what the website's accounts hold.** It answers the question that had
   blocked `../h1_checker/.harness/prd/email-capture-funnel.md` since 2026-09-08, "what does
   the account hold?". The alternative, restoring the shelved 291-line `jobs_page.html` in
   the extension repo, was considered and **not** chosen. That file stays a placeholder.
2. **Build once, ship on the student default.** The owner is weighing widening the product
   from international students to all US job seekers. Grounded in
   `../h1_checker/jobfeed/matching.py`, the two audiences are **one build**: the refusal
   filter `c.no_sponsor is not True` is the only hard-coded narrow assumption, and the other
   sponsorship axis (`_strong_enough`, matching.py:105) is already a per-user preference via
   `prefs.min_tier`. The agreed shape is to make the refusal filter a preference too,
   default it to the student setting, and ship.

   That upstream change belongs to the counterpart ticket's repo, not this one. **This page
   must not implement its own refusal filtering** — it renders what the API returns. The
   widening question itself is still open; see
   `../h1_checker/.harness/session-todos/2026-09-10-audience-widening.md`.

### The filter row, fixed 2026-09-10

The owner supplied a third reference image — a filter row reading **All Companies ·
location · Any Time · Entry-Level · Software Engineering · H-1B Sponsor · Remote · Reset
Filters** — and said: "希望这个 filter 是这个样子的,但是里面的选项你 pickup." The shape is
theirs; the option values were delegated and are fixed here against what upstream stores.

**Note the reference image is a table, not a split pane.** The owner named the *filter* as
what they wanted copied, so the split-pane design above stands. If the table layout was also
intended, that is a change to this ticket and needs saying.

Checked against `../h1_checker/models.py`. Five controls read stored columns; two do not:

| Control | Options | Backing |
|---|---|---|
| Company | every employer with an open posting, plus "All Companies" | `employer_name` |
| Location | free text, matched against the string as a board wrote it | `location` |
| Posted | Any time / 24 hours / 7 days / 30 days | `posted_at` |
| Seniority | Internship / Entry / Mid / Senior / Staff+ | **derived from title** |
| Category | Software Eng / Data & AI / Hardware / Product / Other | **derived from title** |
| H-1B Sponsor | three options, below | `no_sponsor` + employer filings |
| Remote | on / off toggle | `is_remote` |

**Seniority and category carry a trap the reference image itself falls into.** It tags
"Sr. Solutions Architect", "Python Engineer - Assistant Vice President" and "Full Stack
Developer - Assistant Vice President" all as **Entry-Level** — three of five visible rows
wrong, two containing the word that contradicts the tag. Upstream solves it by treating an
unmarked title as `unknown` rather than as entry, and by letting a seniority marker outrank
a junior one. **This page must respect that**: a row with an unknown seniority shows **no badge
at all**, never a guessed one, and the filter returns only positive matches. The rule
and its rationale are in `../h1_checker/openspec/changes/browse-postings/design.md` §4.

**Location is a text match, not a place.** Boards write "Irving Texas United States" and
"US-Remote". There is no normalised city or country upstream, so the control must not
present itself as resolving a location.

3. **Sponsorship becomes a filter control on this page.** Owner, 2026-09-10: "可以选择需不
   需要将是否 sponsor 作为一个 filter 的选项 … 做成一个参数,页面上给用户一个勾选框."

   The later reference image renders it as a **dropdown**, which suits it better than a
   checkbox because the underlying data has three states, not two. Three options, a ladder
   of strictness:

   | Option | Effect |
   |---|---|
   | Any | everything, including roles whose description refuses sponsorship |
   | Hide roles that say no sponsorship *(default)* | drops `no_sponsor` true; keeps NULL |
   | Only employers with H-1B filing history | the above, plus employer filings above zero |

   The first two are claims about **the posting**; the third is a claim about **the
   employer**. They are different statements and upstream returns them unreconciled, so the
   option labels must not blur them.

   So the filter row in the design above gains a sponsorship control, alongside the
   Location / Job Type / Experience / Category pills the screenshots show. It maps to a
   query parameter on the upstream route (ticket 005 there, decision 1), defaulted to
   hiding postings that refuse sponsorship.

   Two things this page must get right and neither is cosmetic:
   - **Three states, not two.** Upstream, `no_sponsor` is `True`, `False` or `NULL`, and
     NULL means no description has been read yet, not a refusal. A checkbox labelled so
     that NULL reads as "does not sponsor" would be a false claim about a real employer.
   - **The label is a claim about the posting, not the employer.** "This posting says it
     will not sponsor" is what the detector found in the job description. It is a different
     statement from the employer's filing history, which is the evidence column this page
     exists to show, and the two can disagree for the same company.

**The reason behind the lifted instruction has not gone away.** Coverage is still open; see
note 1 below. The owner lifted the rule, not the risk.

## Unblocked 2026-09-11 — the data source now exists

The feed is built and running upstream, but **no route there can serve it to this site.**
Checked against `../h1_checker/main.py`: all four job routes are `/api/my/*` and bound to a
signed-in feed user (lines 3040, 3056, 3097, 3116), and `GET /search` (line 562) is employer
autocomplete returning `SearchResult` rows, not postings.

That gap is closed. `GET /api/postings` shipped on 2026-09-11 (ticket 005 there,
DECISIONS D-044). It takes employer, title text, location text, remote, posted-within days,
an include-refusals switch, limit and offset; it returns one page of role-collapsed postings
plus a total, each row carrying the employer's certified filing count, last active year and
tier **and**, separately, that posting's own refusal verdict.

**This ticket can start.** Its proxy route consumes `/api/postings` the way
`src/routes/stats.ts` consumes `/stats`, with `POSTINGS_TOKEN` as the shared secret — a
different secret from `STATS_TOKEN`, deliberately, so rotating one does not close the other.

**Carried over from that change's security review, and not optional here:** the response
carries third-party text — titles, locations, employer names, apply URLs — taken from job
boards. It is correctly escaped as JSON on the wire. **This page must escape on render and
must never build HTML by string concatenation.** Upstream already withholds any apply URL
whose scheme is not http or https; do not re-add one from another field.

## The design, read off the two screenshots

Both products converge on the same layout, so this is a well-trodden shape rather than an
invention:

- **Search row** — free-text role, plus location. SpeedyApply: two fields side by side.
  Simplify: one field, "Find your dream role", with location as a filter pill.
- **Filter row** — dropdown pills. SpeedyApply: Category, Level, Company, Global.
  Simplify: Location, Job Type, Experience Level, Category, All filters.
- **Result count and sort** — "4627 results" / "Found 2,599 jobs" with a Most-relevant sort.
- **Two panes.** Left: a scrolling column of cards — company logo, title, company,
  location, salary when known, tag pills, age right-aligned, save/bookmark icon, the
  selected card tinted and outlined. Right: a sticky detail pane — logo, company, title,
  a pill row repeating the facts, a primary apply button that leaves for the company's own
  posting, then the job description.

Where Simplify puts a resume-match gauge and two blurred "Unlock with Simplify+" cards,
this page has something to put that is free and that they cannot copy: **the sponsorship
evidence for that employer** — certified filings, years, the badge tier the extension
already shows. Simplify's own detail pane carries a single flat line, "H1B Sponsorship
Available"; this can show the filings behind the claim.

## What exists already to build on

- `artifacts/landing/src/pages/` + `components/ui` — the shadcn/Tailwind vocabulary the
  cards, pills and dropdowns are already spelled in
- `SiteHeader.tsx` / `SiteFooter.tsx` — the chrome this page inherits
- `src/routes/stats.ts` + `src/lib/stats/upstream.ts` — the proven pattern for this site
  serving data that lives in the extension's API: browser asks this server, this server
  asks that one with a shared secret, and only bounds-checked parameters are forwarded
- `lib/api-spec/openapi.yaml` + codegen — how any new route gets its hooks and schemas

## What done looks like

- `/jobs` renders the split-pane layout above, and works at 320px as the rest of the site
  does (the pane stacks; it does not scroll horizontally).
- Selecting a card shows that posting without a page navigation, and the selection is
  reflected in the URL so a posting can be linked to and shared.
- Search and every filter narrow the list, and the result count matches what is listed.
- The apply button leaves for the employer's own posting. Only http and https hrefs are
  ever rendered as links — a board we poll supplies these, and `javascript:` in an href
  executes in our origin (the same finding P2's security pass made in the other repo).
- Every posting shown carries its sponsorship evidence, and the page says where that
  evidence comes from.
- The page states plainly what the feed covers and what it does not.
- Tests first, per `replit.md`. The route that reaches upstream is tested the way
  `stats.ts` is — the real route, the real gate, against a fake upstream.

## Notes for whoever picks this up

1. **Coverage — the decision the standing instruction was protecting.** 43 boards means no
   FAANG and, worse for an H-1B product, none of the largest filers (Infosys, TCS,
   Cognizant, Deloitte). A visitor's first search is "Google". A curated list survives
   that because it promises nothing; a search box does not.

   The counterpart ticket's decision 1 carries the probed analysis of how to close this —
   four routes, with a Workday adapter the highest-value one (Adobe 727, NVIDIA 2,000,
   Salesforce 1,437, all probed live 2026-09-10 with no key). **Route 1 there is what
   unblocks this ticket.** Until it lands, this page either waits or is deliberately
   framed as something other than a search engine. Owner's call, and it is the same call
   as the standing instruction above.
2. **Public, or behind the login.** Public buys SEO and shareability and fills nothing
   behind the account. Behind the login fills the empty account and keeps a thin feed out
   of search results. The two reference products are both public-browse, login-to-act.
3. **Two account systems, and whether they meet.** This site has email+password with
   session rows (`artifacts/api-server/src/lib/auth/`). The feed in the other repo has its
   own magic-link accounts, prefs and delivery ledger. Anything personalised — saved jobs,
   prefs, "already applied" — has to answer which identity owns it. A read-only public page
   avoids the question entirely; that is an argument for doing it read-only first.
4. **How the data gets here.** The `stats.ts` proxy is the pattern and it is already
   reviewed, but it forwards two bounds-checked numbers. A search page forwards free text,
   which is a wider door into an upstream that was owner-only until recently.
5. **Order against the counterpart ticket.** The GitHub list ships complete at 43 boards
   because a list makes no completeness promise. This page does. If only one gets built
   this autumn, the list is the one that can ship without P5.
