# Proposal — fix-a-canadian-ca-reads-as-california

## Why

The front page promises US software internships only (`front-door` spec, "A posting outside the
United States SHALL NOT appear on this page"; `ROADMAP.md` 第一步 4, "首页上不出现美国以外的岗位").
On 2026-10-02 the owner's local preview of the merged front door listed
**"Pinterest — Software Engineering Intern 2027 (Toronto)", location `Toronto, ON, CA`.**

**Root cause, not symptom.** `readLocation` (`lib/new-grad/location.ts`) checks every US
pattern before any foreign one, so a single US match wins. One of those patterns is a bare
two-letter state code after a comma or slash (`[,/]\s*(…|c[aot]|…|o[hkr]|…)\b`). In
`toronto, on, ca` the `, ca` is Canada's country code; the pattern reads it as California and
the US-first rule ends the question before `toronto` is ever looked at. The "US wins a tie" rule
is the owner's and is right — but it was written for real US evidence (a city, a state, the
country), and a comma plus two letters is the weakest evidence the reader accepts.

**Measured, not guessed** — 6,000 rows of the public feed (`GET /api/jobs`, paged, 2026-10-02),
run through today's `readLocation`. 54 rows read as US on a bare code alone while naming a place
abroad, in four shapes:

| rows | location | the code read as a state |
|---|---|---|
| 40 | `Canada - Remote (ON, AB, BC, or NS Only)` | `, or` → Oregon |
| 9 | `Toronto, ON, CA` | `, CA` → California |
| 3 | `Buenos Aires, AR` | `, AR` → Arkansas |
| 2 | `Berlin, DE` / `Hamburg, DE` | `, DE` → Delaware |

**Current behavior** (pinned by the repro): each string above resolves to `us`.
**Expected behavior**: each resolves to `elsewhere`.
**Unchanged behavior** (guarded): a posting that names a real US place keeps reading as US even
when it also names a foreign one (`London, UK; San Francisco, CA`, `US-CA-Dublin`,
`New York, NY - Hybrid; Toronto, Ontario - Remote`, `Toronto, NY, SEA, SF`); every existing case
in `location.test.ts`; an unreadable string never resolves to US.

## What Changes

- **Fix, inside `readLocation` only.** US evidence is split in two:
  - **strong** — `united states`, `usa`, `us`, a state's full name, a listed US city: decides
    `us` exactly as today, ties included;
  - **weak** — a bare two-letter code after a comma or slash: decides `us` only when the string
    names no foreign place.
  Order becomes: strong US → `us`; foreign place → `elsewhere`; weak US → `us`; else `unknown`.
- **`sf` and `nyc` join the US city list.** Needed by the guard, not a drive-by:
  `Toronto, NY, SEA, SF` is US today only through `, NY`; once that code is weak, `toronto`
  would win. With the two abbreviations it stays US on strong evidence.
- **Measured effect of the whole change on the same 6,000 rows:** 54 rows `us` → `elsewhere`
  (exactly the four shapes above, nothing else); 24 rows `unknown` → `us`, all of them
  `SF` / `NYC` lists (`SF, NYC`, `Remote - SF Bay Area`, `NYC, SF, Chi, Remote`…); no other row
  moves.
- **Repro and guard.** `artifacts/api-server/src/lib/new-grad/location.test.ts`, two new cases:
  "does not read a two-letter code as a US state when the place is plainly elsewhere" (RED today,
  fails first on `Toronto, ON, CA`) and "still lets real US evidence win when a posting is open
  in two countries" (green today, must stay green).

## Blast radius

`readLocation` has two callers, and the fix reaches both with no change to either:
- `routes/internships.ts` — the front page; drops postings that read `elsewhere`.
- `routes/new-grad.ts` — the owner's new-grad list (`new-grad-list` spec); same rule.

No API contract (`openapi.yaml`), schema, or frontend change.

## Non-goals

- **No country column, no upstream fix.** The real fix is a country upstream
  (`../h1_checker/.harness/backlogs/011`, open). This keeps the string reader honest until then.
- **No exhaustive ISO-code table.** Other collisions (`, IN` India, `, IL` Israel, `, CO`
  Colombia…) are already caught when the string also names the city or country, which every row
  in the sample does. A bare `Pune, IN` style row did not occur in 6,000; adding codes nobody
  writes is guessing.
- **No re-ranking, no new UI marker.** The page and the list do what they did with the answer.

## Ordering

The `front-door` and `new-grad-list` requirements this modifies live in
`2026-09-29-the-front-door-shows-the-jobs` and `2026-09-18-the-new-grad-list-behind-the-login`,
neither archived yet. Archive this change after both.
