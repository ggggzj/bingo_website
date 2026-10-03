# Proposal — 2026-10-02-the-summer-2027-section-on-jobs

Origin: `.harness/backlogs/021` Part 2 (网站 021), from `ROADMAP.md` 第一步 5 —
"`/jobs` 加一个「Summer 2027 实习」板块，就是一个预设好的筛选". The login wall, Part 1, is
`2026-10-02-jobs-asks-for-a-session`; neither change needs the other.

## Why

The season the roadmap is racing (秋招季, now → mid-October) is internships, and `/jobs` has no way
to show them. It had one — the picker's `Internship` preset — and the owner removed it on
2026-09-20 (`f6fc12f`) because it could not keep its promise: the upstream matches a title as
`ilike '%intern%'`, which returned `Director, US International Tax Planning` and
`Principal Software Developer - Database Internals` (18 of 100 rows not internships), and every
cheap repair was measured worse (ticket 021, "The count problem").

**What changed since the ticket was written:** the front door (`028`, merged 2026-10-02) built the
thing the ticket's option 3 described. `GET /api/internships` asks the upstream a coarse net of
terms, applies the precise test here (`lib/internships/titles.ts`: software AND `\bintern\b`
MINUS seniority), drops postings that read as outside the US (`lib/new-grad/location.ts`), sorts
Summer 2027 first, caches the result for 60 s for every visitor, and returns a `total` that is the
count of exactly that list. A signed-in caller gets the whole list.

**Owner decision, 2026-10-02:** the section shows **the same list as the front page** — US
software internships — not every internship. One list, one definition, two places.

## What Changes

- **A two-way switch on `/jobs`:** *All roles* (today's page, unchanged) and *Summer 2027
  internships*. The choice lives in the URL (`?section=summer-2027`) beside `?job=`, so it can
  be linked to and the back button works.
- **In the internships section:**
  - the list is `GET /api/internships` — the same endpoint, hook and cache as the front page;
    nothing new on the server;
  - the filter row is **hidden**, not disabled: the list is precomputed, so a filter could only
    narrow the fetched rows, which is the shape the `jobs-page` spec forbids ("A control that
    narrows what the reader can see rather than what they asked for SHALL NOT be offered");
  - the result count is the endpoint's `total`, which counts exactly what is listed;
  - selecting a row opens the **same detail pane** — an `InternshipPosting` is a `JobPosting`,
    and the two sponsorship claims stay rendered by `SponsorshipEvidence`;
  - no row gains an internship, season or seniority badge;
  - the coverage sentence stays, plus the front page's existing line that employers running
    their own careers sites (TikTok, Amazon, Google…) are not in this list.
- **"Summer 2027" names the section, not each row.** The list sorts postings that name Summer 2027
  first; it also holds internships that name another season or none (on 2026-10-02 it carried
  `Software Engineer Intern, Mobile (Winter 2027)`). The section's subtitle says so in one line,
  rather than letting the name assert something about every row. This follows `titles.ts`: a
  year fences and sorts, it never filters (367 of 376 titles name no year).

## What this does NOT change

- **The picker still has no `Internship` preset**, and `FilterRow.test.ts`'s line that fails if
  one comes back **stays**. Ticket 021 expected whoever landed it to delete that test; that was
  written for a section built *as a picker option*. This section is a separate list with its own
  server-side count, so the test still guards exactly what it was written to guard.
- No server, schema or API-contract change. `/api/internships` is reused as it is.

## Non-goals

- The login wall (the other change). Before it ships, a signed-out visitor who opens this section
  sees the front page's preview cut and its "sign in to see the rest" line — the endpoint already
  sizes its answer by session.
- Non-software internships (owner chose the front page's definition).
- `003` (filter by filings), `005` (location box), `014` (apply redirect).

## Impact

- `artifacts/landing/src/pages/Jobs.tsx` (the switch; the section's list and count)
- possibly a small `components/jobs/` piece if `Jobs.tsx` (288 lines) would otherwise grow past
  readability — decided in the first task, not here
- `Jobs.test.tsx` (new, shared with the wall change — whichever lands second rebases onto it)
- `replit.md`: one entry under the jobs page
