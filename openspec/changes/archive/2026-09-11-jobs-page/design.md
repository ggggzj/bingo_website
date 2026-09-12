# Design — jobs-page

## 1. The proxy keeps `stats.ts`'s rule and widens it to text

`stats.ts` does not forward the caller's query. It holds an allowlist —
`{"/daily": {param: "days", min: 1, max: 365}}` — and builds the upstream path itself out of
values it has checked, with the stated reason: *"so it can never be steered into asking that
service for something the dashboard did not ask for."* An out-of-range value is dropped
rather than rejected, so a nonsense window still draws the page on the other service's
default.

That rule holds here. What is new is that three of the parameters are free text, and the
upstream route is the first one over there to take a search string from a public page.

| Parameter | Shape | Out of bounds |
|---|---|---|
| `employer`, `title`, `location` | string, length-capped, re-encoded | dropped |
| `posted_within_days` | integer 1–365 | dropped |
| `remote_only`, `include_refusals` | the literal strings `true` / `false` only | dropped |
| `limit` | integer 1–100 | dropped, upstream default stands |
| `offset` | integer 0–10 000 | dropped |

Anything not in that table never reaches the upstream URL. Dropping rather than rejecting
follows the precedent, and it means a hand-edited URL degrades to a wider page rather than
an error screen.

Upstream enforces all of these again (D-044). That is not redundancy to remove: this server
is the only thing between a public page and a secret-bearing request, and a bound checked in
one place is a bound that moves when someone edits the other.

## 2. Two claims on the row, and the page must not merge them

Upstream returns, per posting, `tier` + `total_h1b_certified` + `last_active_year` — claims
about the **employer**, from certified DOL filings — and separately `no_sponsor`, a claim
about **this posting's own description**.

They can disagree for one company. An employer with 137 filings can post a role whose text
says it will not sponsor. The page renders them as two separate statements and never as one
badge.

`no_sponsor` has **three** states and the third is the one that gets mishandled:

| Value | What it means | What the page may say |
|---|---|---|
| `true` | this posting's text refuses sponsorship | "this posting says it will not sponsor" |
| `false` | its text was read and does not refuse | nothing |
| `null` | **nobody has read its description yet** | nothing — never "does not sponsor" |

A label that renders `null` as a refusal is a false claim about a real employer.

## 3. Seniority and category are searches, and the reference image shows why

The owner's filter-row reference carries Entry-Level and Category controls. Upstream stores
neither, and it deliberately refuses to derive them: `job_postings` holds provider, employer,
title, url, location, is_remote, posted_at, is_open, jd_text and no_sponsor, and nothing else.

The reference image demonstrates the failure it avoids. It tags "Sr. Solutions Architect",
"Python Engineer - Assistant Vice President" and "Full Stack Developer - Assistant Vice
President" all as **Entry-Level** — three of five visible rows wrong, two of them containing
the word that contradicts the tag.

So these two controls are **preset title searches**: picking "New grad" sends
`title=new grad`. The page shows what matched and labels nothing. A posting the keywords miss
is simply absent from that search rather than mislabelled, and no row ever carries a
seniority badge.

Cost, stated: recall depends on employers writing the words. A new-grad role titled
"Software Engineer" will not be found by a "new grad" search. Accepted — a missing row costs
one posting, a wrong badge costs the page's credibility, and credibility is the entire
argument for this page existing.

## 4. The page is a feed, not a search engine, and says so

43 boards means no FAANG and none of the largest H-1B filers. A search box promises to find
Google and cannot keep that promise; a filtered feed promises nothing and keeps it.

So the page opens on the feed rather than on an empty search box, and carries a plain
sentence about what it covers: postings from employers with sponsorship history, not every
job. That sentence is a requirement, not copy — it is what makes the coverage gap a stated
scope rather than a defect.

This is the framing the ticket's blocked-on-coverage note allows, and it is what lets the
page ship before the counterpart ticket's decision 1 is answered.

## 5. Third-party text, and the rule carried over from upstream's security review

Titles, locations, employer names and apply URLs are written by job boards, not by us.
Upstream serves them correctly escaped as JSON and withholds any apply URL whose scheme is
not http or https.

On this page: **render through React's normal escaping and never build HTML by string
concatenation.** No `dangerouslySetInnerHTML` anywhere on this page. When upstream withholds
a URL the card shows no apply link rather than substituting one from another field — a
posting we cannot link to safely is still worth reading.

## 6. This repo tests the server and looks at the page, and this change keeps that

`replit.md:51` records the convention plainly: *"Tests: Vitest + supertest (api-server
only)."* Checked 2026-09-11 — `artifacts/landing` has no test runner, no test script and no
test dependency, and not one `*.test.tsx` exists. That is a decision, not an oversight.

**This change does not reverse it.** An earlier draft of `tasks.md` named six frontend test
files, which would have required vitest, a DOM environment and React Testing Library added
to the landing package — new dependencies and a reversal of a recorded decision that the
proposal never named. `openspec/config.yaml` forbids exactly that: *"A proposal that
reverses a recorded architecture decision must name it and say why; never silently
contradict one."*

So the split is:

| Group | Proven by |
|---|---|
| 1 contract, 2 proxy | Vitest, in `artifacts/api-server`, beside `stats.test.ts` and `upstream.test.ts` |
| 3 page, 4 filters | Driven in a real browser against the real dev server |

Browser verification here means the page is actually exercised, not eyeballed: read the
rendered DOM, click through, read the network requests the filters produce, check the
console for errors, and capture a screenshot at both desktop and 320px. The things that
matter most on this page — that a null refusal verdict renders **nothing**, that no row
carries a seniority badge, that the apply link is absent when the URL was withheld — are all
assertions about rendered output, and rendered output is what a browser has.

Cost, stated: these checks are not in CI and will not catch a regression six months from
now. When the owner wants that, a frontend harness is its own change against its own
decision, and this design is the record of why it was not smuggled into this one.

## 7. Selection lives in the URL

Clicking a card swaps the detail pane without a page navigation, and the selected posting's
id goes into the URL. Two reasons: a posting can be linked to and shared, which is the
growth lever `GROWTH_PLAN.md` §五 asks every asset to carry; and the back button then means
what a reader expects instead of leaving the page.
