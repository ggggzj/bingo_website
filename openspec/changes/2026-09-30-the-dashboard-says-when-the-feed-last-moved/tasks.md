# Tasks — the dashboard says when the feed last moved

**Take the baseline first.** Run `pnpm --filter @workspace/landing run test` and
`pnpm --filter @workspace/api-server run test` before editing anything, and write both numbers
here. A change that cannot say what it started from cannot claim it broke nothing.

    landing:    62 passed  (12 files)            2026-09-30, worktree feed-freshness-line
    api-server: 204 passed, 26 skipped (18 files)

Three facts this plan rests on, verified 2026-09-30. Re-check them if this sits unimplemented for
long, because two of them live in another repo:

- Upstream declares `feed_last_sync: Optional[datetime]` and `feed_hours_stale: Optional[int]` on
  its `/stats` response and fills them — `../h1_checker/main.py:2691-2692`, `:2786-2790`. Both are
  null together when no sync has ever run. `feed_hours_stale` is whole hours, floored.
- `artifacts/api-server/src/routes/stats.ts` forwards the upstream body whole and untouched, so the
  fields already arrive. **That file is not edited by this change**, and neither is
  `artifacts/api-server/src/lib/stats/upstream.ts`, which holds `STATS_TOKEN`.
- `StatsTotals` at `lib/api-spec/openapi.yaml:1103` declares ten properties and neither field.
  Grepping `feed_last_sync` / `feed_hours_stale` across `*.ts`, `*.tsx`, `*.yaml` returns zero hits.

## 1. The contract, and the codegen that is not optional

- [x] 1.1 `lib/api-spec/openapi.yaml`: add `feed_last_sync` and `feed_hours_stale` to the
      `StatsTotals` schema's `properties`. **Both optional and both nullable** — they are
      `Optional[...]` upstream and null together before the first sync; adding either to `required`
      would make a legitimate upstream body fail validation. `feed_last_sync` is
      `{ type: string, format: date-time, nullable: true }`, `feed_hours_stale` is
      `{ type: integer, nullable: true }`. **Run `pnpm --filter @workspace/api-spec run codegen` in
      this same task** — nothing else regenerates the frontend hooks, and a spec edit without it
      leaves the repo in a state where the types disagree with the contract.
- [x] 1.2 Confirm the generated output changed and was not hand-edited: `lib/api-client-react` and
      `lib/api-zod` under `src/generated` show the two new members on the totals type, and
      `git diff` touches no other generated symbol. Both suites still pass at the baseline numbers
      — this group adds types and renders nothing, so a changed number here is a regression, not
      progress.

## 2. The three states, proved before they are drawn

Tests first, per `replit.md`. `Dashboard.test.tsx` already drives this page through msw with
`http.get("/api/stats", ...)` returning a `TOTALS` fixture — extend that, do not build a second
harness.

- [x] 2.1 Extend `artifacts/landing/src/pages/Dashboard.test.tsx` with four cases, each overriding
      only the two new fields on the existing `TOTALS` fixture:
      **fresh** (2 hours — states when the feed last synced, and is not marked as an alarm);
      **stale** (288 hours — marked as an alarm, and says how stale);
      **the line** (29 hours is not an alarm, 31 hours is);
      **never** (both fields null — says the feed has never synced and renders no hour count, and
      in particular the string `0` does not appear in the statement).
      Write the hour numbers as literals here. **Do not import the threshold constant into the
      test**: if the test derives 30 from the page, the two can only ever agree with each other,
      and the number the owner chose stops being checked by anything.
- [x] 2.2 `artifacts/landing/src/pages/Dashboard.tsx`: render the statement as its own element
      **above** the `grid ... lg:grid-cols-5` tile row, not as a sixth tile. Declare
      `const FEED_STALE_AFTER_HOURS = 30;` beside the component — one place, cited in no other
      file. It names the job feed explicitly ("job feed", not "data" or "the dashboard"), states
      the last sync, and past the threshold reads as not-normal using the theme's existing
      destructive token rather than a new colour. Handle null as its own branch before any
      numeric comparison — `feed_hours_stale ?? 0` is exactly the bug this change exists to
      prevent. Readable at 320px. Group 2's tests turn green here and nothing else changes.

## 3. Say what changed

- [~] 3.1 Append to `replit.md` "Architecture decisions": the Growth view now reports job-feed
      freshness; one threshold at 30 hours rather than a graded scale, because a warning level left
      standing becomes the new normal — which is what twelve days of grey was; a line rather than a
      sixth tile, because the tile row's polarity is "more is better" and this one is an alarm; and
      the reason it reads `feed_last_sync` rather than the newest posting's date, which is a
      different quantity.
      **Check before writing**: as of 2026-09-30 `replit.md` carries another session's uncommitted
      work (the `Postgres` / `Postgres-EBWW` migration notes). If that is still true, stage only
      your own hunk — never `git add replit.md` wholesale — or defer this task and say so plainly.
      Sweeping another session's lines into a commit is what produced `9041824`.
- [x] 3.2 Run both suites and record the numbers against the baseline at the top of this file.
      Say plainly in the reply that **this does not fix the feed**: the crawl is `../h1_checker`'s
      bug, and if it is still stopped, this line is expected to be red on arrival and is correct.
- [~] 3.3 Close with the `replit.md` working loop, and set
      `.harness/backlogs/030` to built with a pointer to this change. **Second half done, first
      half deferred**: the working loop's "update replit.md" step *is* 3.1, so it carries that
      same deferral rather than a separate one.

## Outcome

    landing:    62 -> 67 passed  (5 added, 0 broken)
    api-server: 204 passed, 26 skipped — unchanged, as intended
    typecheck:  clean

**3.1 and the first half of 3.3 are deferred, not done** — marked `[~]`, not `[x]`. `replit.md` still carries another
session's uncommitted migration notes at the time of writing, and a branch that edits it would
either be refused at merge or sweep them into a commit, which is what produced `9041824`. The
entry is written out verbatim in
`.harness/session-todos/2026-09-29-read-muses-export-residue.md`, where it is now the third
owed paragraph and all three are one paste once that session lands.

**No browser check was run.** `CLAUDE.md` requires all three ports to move together in a worktree
and says `API_PROXY_TARGET` is checked by nobody; the failure mode is a login that silently does
nothing. The four states are driven through the real component and the real generated client by
`Dashboard.test.tsx` instead.

**This does not fix the feed.** The crawl is `../h1_checker`'s bug — `ProviderRouter.fetch`
missing `already_held` — and was still unfixed and undeployed on 2026-09-30. This line is
therefore expected to arrive red, and that is correct: it is displaying the truth.
