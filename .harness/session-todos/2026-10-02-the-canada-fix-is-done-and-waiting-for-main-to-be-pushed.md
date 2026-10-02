---
title: `fix-a-canadian-ca-reads-as-california` is finished on its branch; open the PR once main is pushed
status: open — nothing left to build; the only action is a PR, held by the owner's decision
origin: `/implement fix-a-canadian-ca-reads-as-california`, 2026-10-02. Owner: "先修，等那个session
  push后再开PR".
---

**摘要:** 首页把 `Toronto, ON, CA` 当成美国岗位的 bug 已修完,全部 gate 通过。没 push、没开 PR——
因为本地 main 有另一个 session 的 16 个 commit 没 push,现在开 PR 会把它们一起带上。等 main push 了再开。

## State

```
worktree: /Users/guozhengjia/Desktop/My_Development/Bingo/bingo_website-wt-implement-fix-canada
branch:   implement/fix-a-canadian-ca-reads-as-california   (head cae6891, built on main a193747)
```

- `tasks.md`: all items ticked (1.1–4.1). 4.1 was the close-out review's finding (US towns named
  like foreign cities, `Dublin, CA`), fixed as its own unit at the owner's call.
- Fresh at close-out: api-server suite 231 passed / 2 files skipped (DB contract tests, no scratch
  Postgres); `pnpm run typecheck` exit 0; 6,000 feed rows vs the old reader: 54 `us` → `elsewhere`,
  24 `unknown` → `us`, nothing else.
- Verdicts in `.harness/evals/` on that branch: correctness / test-quality `mixed` at 4f1b561, `pass`
  at db5650c; goal-fit `pass`.

## Why the PR is not open

Local `main` was 16 commits ahead of `origin/main` (another session's, unpushed). This branch sits on
that main, so it is 28 ahead of `origin/main`; a PR now would carry the other session's commits.

## To finish

1. `git -C <main checkout> log --oneline origin/main..main` is empty (that session pushed) — or the
   owner says to push them.
2. If main moved after `a193747`, merge main into the integration branch first.
3. Push `implement/fix-a-canadian-ca-reads-as-california`, open the PR, then archive the change —
   **after** `2026-09-29-the-front-door-shows-the-jobs` and `2026-09-18-the-new-grad-list-behind-the-login`
   (its spec deltas modify their requirements).

Leftover local branches, all contained in the integration branch, safe to delete after merge:
`unit/fix-canada-{2.1,3.1,3.2,3.3,3.4,4.1}/*`, `fix-a-canadian-ca-reads-as-california/20261002`.
