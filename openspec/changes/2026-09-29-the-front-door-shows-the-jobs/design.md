# Design — the-front-door-shows-the-jobs

Every number here was measured on 2026-09-29 against the production feed
(`GET /api/jobs`, 7,286 rows pulled in full) and this repo's own modules, not estimated.

## What the feed actually looks like, because three of the decisions below follow from it

| | |
|---|---|
| Postings | 7,286 |
| Distinct employers | 43 |
| `tier` | `strong` on all 7,286 — there is no weak row to distinguish |
| `no_sponsor` | `false` on 7,285, `null` on 1 |
| Top five employers | OpenAI 751 · Stripe 603 · Databricks 588 · Anthropic 567 · Datadog 351 = **39%** |
| Newest 20 rows by date | 1 OpenAI, 3 Twilio, **16 Stripe** |
| `readLocation` over the feed | us 4,560 · unknown 531 · **elsewhere 2,195 (30%)** |
| Newest `posted_at` | **2026-09-18** (today: 2026-09-29) |
| After US + software-intern narrowing | **31 rows, 11 employers**, 13 posted in the last 30 days, 11 naming Summer 2027 |

## 1. A new route, not a wider `/jobs`

`/api/postings` upstream takes one `title` and matches it `ilike`. This block needs
(intern AND software AND in-the-United-States MINUS `International`), which one substring
cannot express. So the terms go out **one at a time as a coarse net** and the precise test runs
on this server — the same shape `routes/new-grad.ts` already uses, for the same recorded reason,
and the same fan-out that its own comment says belongs upstream once `016` opens it to everyone.

Widening `/jobs` instead was rejected twice over: it would put a session on the identity-free
route for the sake of a preview, and `/jobs` is a general browse surface whose filters
deliberately assert nothing — this block is a curated list with a promise in its heading.

## 2. The session changes the size of the answer, not the existence of the route

This is the first route here that does that. `stats`, `coach`, `new-grad-list` and `applications`
all answer **404** to a stranger, so the route's existence gives nothing away. This one answers
200 with less, because a stranger reading it is the entire point: 先放一部分，其余登录后看.

Concretely: without a session, at most `PREVIEW_ROWS` postings plus the **true** `total`; with a
session, every row. `total` is the same integer in both answers — a preview that lies about how
much is behind it is worse than no preview, and the "N more, sign in" line is drawn from it.

## 3. The preview cut is a cap per employer as well as a row count

Eight rows, at most **two per employer**. The row count is a judgement; the per-employer cap is
forced by the measurement — the newest twenty rows of the feed are sixteen Stripe, and while the
intern net is much less lumpy (31 rows over 11 employers), four Robinhood rows out of eight would
make the front door look like one company's careers page. The cap applies to the **preview only**;
the signed-in list keeps every row, because there the reader asked for all of it.

## 4. It filters and never labels — with one thing marked

Inherited verbatim from the 2026-09-18 decision. A row that is not a US software internship is
**absent**; no row carries a badge saying what it "is". The single marked state is
`location_read: "unknown"` — 531 rows of the feed say "Hybrid", "Distributed", "In-Office" — and
`readLocation` is reused rather than re-derived precisely because it already has a test whose only
job is that an unreadable string never resolves to US.

## 5. The season fences and sorts; it is not the filter

11 of the 31 rows name Summer 2027 in the title; 20 name nothing. Filtering on the season would
be an eleven-row page for a section whose whole purpose is the 2027 intern cycle, so a title
naming the target season sorts first and the rest are listed. Mirrors `namesTargetClass`, which
the same measurement forced on the new-grad list (8 of 376).

## 6. `SOFTWARE` is shared, not copied

`lib/new-grad/titles.ts` holds the software patterns and its own comment says why one list rather
than two: *"two would drift: a term added here that was never asked of the upstream narrows
nothing, and the list would look correct while the page got quietly smaller."* That argument
applies across modules as much as within one, so the patterns are exported and imported. What is
**not** shared is the early-career net: `isEarlyCareerSoftware` deliberately excludes
`\bintern\b` (the owner's list is new-grad), so this change adds its own intern net beside it.

`\bintern\b` rather than `intern` is not style either — the owner's own collection run recorded
`International` as the mis-match that cost it, and `titles.ts` carries that as a comment.

## 7. The response references `JobPosting`

`allOf: [JobPosting, { location_read, names_target_season }]`, the way `NewGradPosting` does.
`replit.md` records the reason: a second posting shape forces a third copy of the judgement that
the employer's filings and the posting's own refusal are two claims that never merge, and
`SponsorshipEvidence` already renders exactly that pair, including `no_sponsor: null` meaning
nobody has read it.

## 8. The page states its vintage and uses no freshness adjective

The feed's newest row is eleven days old today. So the block renders the date of the newest row
it is showing, and the words "live", "daily" and "updated" do not appear unless a rule is added
that ties them to that date. This is the one requirement written against a defect that exists
right now rather than one that might: the reference site's equivalent block says "updated daily"
and is telling the truth; the same sentence here would not be.

## 9. A signed-in visitor stays on `/`

Reverses inherited answer 5 from 2026-09-20 (signed-in → `/jobs`), on the owner's 2026-09-29
answer. The alternative made this change wait on `021` and would have shown a signed-in visitor
a **worse** list than the preview, since `/jobs`'s filters express neither "United States" nor
"not `International`". Both redirects on this page must still wait for `/auth/me` to resolve —
acting on the unresolved state is what makes two pages redirect at each other, which is why
`Account.tsx:27` and `Shell.tsx:42` already wait.

## 10. What a stale or empty answer renders

Not an afterthought, because today it is the likely case. Zero rows renders the board note and the
vintage, never an empty frame; an upstream failure renders the introduction and the sign-in with a
line saying the list could not be loaded, because a front door that 502s is worse than a front
door with no list on it.
