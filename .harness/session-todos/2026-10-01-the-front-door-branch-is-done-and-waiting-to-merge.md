---
title: `the-front-door-shows-the-jobs` is finished on its branch and blocked from merging by two uncommitted files
status: open — nothing left to build; the only action is a merge that git currently refuses
origin: Supersedes `2026-09-30-the-front-door-run-is-paused-at-group-4.md`, which said the run
  had stopped at group 4. It resumed the same day and finished. Rewritten 2026-10-01 rather
  than left to mislead the next session into re-doing group 4.
---

## State

```
worktree: /Users/guozhengjia/Desktop/My_Development/Bingo/bingo_website-wt-front-door
branch:   front-door-shows-the-jobs/20260930-1104
```

**25 of 25 tasks ticked. 11 commits ahead of main, 0 behind.** Not merged, not pushed. The
working tree there is clean.

| | |
|---|---|
| `pnpm run typecheck` | clean, all four projects |
| landing | 14 files, **88** passing (baseline was 62) |
| api-server | 20 files / 2 skipped, **228** passing (baseline was 204) |
| close-out review | `review-board` → Request changes, 2 high findings, **both fixed** |
| verdicts | `.harness/evals/` — correctness fail, production fail, test-quality mixed, all at `a519840` |

Because the branch is 0 behind, **the merge is a fast-forward** — there is nothing to resolve.

## What blocks it, exactly

```
$ git merge --ff-only front-door-shows-the-jobs/20260930-1104
error: Your local changes to the following files would be overwritten by merge:
	artifacts/landing/src/pages/Login.tsx
	replit.md
```

Both carry **another session's uncommitted work** in the main checkout, and this branch
rewrites both. Git aborts before touching anything, so main is untouched at `09b5e5a`.

The owner's decision, 2026-10-01: **wait for that session to commit** rather than have this
one commit on its behalf.

## To finish

1. In the main checkout, `git status`. When `Login.tsx` and `replit.md` are no longer
   modified, the blocker is gone.
2. `git merge --ff-only front-door-shows-the-jobs/20260930-1104`. Nothing else — it is a
   fast-forward.
3. If that session has by then committed its own `Login.tsx` edits, the merge stops being a
   fast-forward and git will ask for a resolution. **Take this branch's `Login.tsx`**: their
   edit adds one line about the Chrome extension signing in separately, and that line was
   deliberately carried into `components/auth/SignInPanel.tsx` when the file was split, so
   keeping their version would reinstate a 317-line file and duplicate the line. Their
   `replit.md` edit is substantive database documentation and must be kept — both sides
   append to different sections, so that one merges.

## Do not link the page anywhere yet

The feed is stale — newest posting 2026-09-18, measured again 2026-09-30. The page states its
own vintage honestly and degrades correctly, but it is a page about recent internships with
nothing recent on it. The ingest fix is written in `../h1_checker` and unshipped; see
`2026-09-29-the-public-job-feed-stopped-eleven-days-ago.md` and that repo's 09-22 note.

## Left behind on the branch, deliberately

- `.harness/session-todos/2026-09-30-a-coach-route-test-hangs-up-about-one-run-in-eight.md` —
  a pre-existing flake in `coach.test.ts`, not this change's.
- `.harness/session-todos/2026-09-30-the-api-server-has-no-rate-limit-of-its-own.md` — the
  residue of the review's production finding. The one route that would have hit the upstream's
  per-IP ceiling now caches; the general shape is still unguarded.
