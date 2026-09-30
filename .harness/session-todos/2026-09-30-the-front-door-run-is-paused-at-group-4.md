---
title: `/implement 2026-09-29-the-front-door-shows-the-jobs` is paused at group 4, waiting on Login.tsx
status: paused — 10 of 25 tasks done, all committed, nothing in flight
origin: Owner ran `/implement` on 2026-09-30 and chose to pause rather than carry another
  session's uncommitted work across. Groups 1–3 (the whole server side) are finished.
---

## Where it is

Worktree, still on disk and clean:

```
/Users/guozhengjia/Desktop/My_Development/Bingo/bingo_website-wt-front-door
branch: front-door-shows-the-jobs/20260930-1104
```

It is **not merged and not pushed**. Three commits, one per task group, plus a merge of `main`:

| Commit | What |
|---|---|
| `2e58be9` | Group 1 — the intern net |
| `e78d038` | Group 2 — the `/internships` contract and codegen |
| `b944280` | Group 3 — the route, wired |
| merge | `main` as of `dfa2940`, including 030's feed-freshness line |

`tasks.md` on that branch has 1.1–3.4 ticked. Groups 4, 5, 6, 7 are untouched.

## Why it stopped

Group 4 moves the right half of `artifacts/landing/src/pages/Login.tsx` into a new
`SignInPanel`. That file — and `Login.test.tsx` — carry **uncommitted changes from another
live session** in the main checkout: prettier reformatting plus a real addition, a note that
the extension signs in separately because cookies are per-origin.

Task 4.2's whole evidence is that `Login.test.tsx` passes *untouched* after the extraction.
That proves nothing if the extraction was made from a copy that is not the current one. The
owner chose to wait rather than have this session commit the other session's work — the
`a0568f3` shape CLAUDE.md Rule 1 warns about.

## To resume

1. Check `git status` in the main checkout. When `Login.tsx` and `Login.test.tsx` are **no
   longer modified**, the blocker is gone.
2. In the worktree: `git merge main`, then `pnpm install` if the lockfile moved.
3. Re-run codegen after any merge that touched `openapi.yaml` — `pnpm --filter
   @workspace/api-spec run codegen`. It is the resolution for a generated-file conflict; never
   hand-merge `lib/*/src/generated`.
4. Continue at task 4.1. Read `Login.tsx` before moving anything, as 4.2 says.

## Numbers, so a later run can tell movement from noise

`tasks.md`'s own header baseline was measured on a dirty tree and is wrong. Re-measured in a
clean worktree at `93d49a8`: **landing 12 files / 62 passing**, **api-server 18 files / 204
passing**. After the merge with `main` and groups 1–3: **landing 12 / 67**, **api-server 20 /
226**. Typecheck clean across all four projects.

## Two things found on the way

- **`CLAUDE.md` Rule 4 is stale.** It says no opsx commands are installed here, so the engine
  predicate resolves to the direct path. `.claude/commands/opsx/` has six files, tracked since
  2026-09-08. The direct path was taken anyway and the discipline is unchanged — the predicate
  picks the driver, not the contract — but the sentence should be corrected or the reason
  restated.
- **A pre-existing flake**, recorded on the branch as
  `.harness/session-todos/2026-09-30-a-coach-route-test-hangs-up-about-one-run-in-eight.md`.
  `coach.test.ts > config > first read creates defaults`, `socket hang up`, about one run in
  eight. Not this change's; `coach.test.ts` is untouched by the branch.

## Still true, and still not this change's to fix

The feed is stale — newest posting 2026-09-18, nothing inside ten days, measured again
2026-09-30. Task 7.4 already requires the closing reply to say so. The fix is written in
`../h1_checker` and unshipped; `2026-09-29-the-public-job-feed-stopped-eleven-days-ago.md` and
that repo's own 09-22 note carry it. **This page should not be linked anywhere until the
ingest is running again.**
