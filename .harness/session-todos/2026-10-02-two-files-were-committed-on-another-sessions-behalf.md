---
title: Login.tsx and replit.md were committed on the 09-27 session's behalf, to unblock a merge
status: open — nothing to do unless that session comes back and is surprised
origin: Owner's decision 2026-10-02, after `the-front-door-shows-the-jobs` sat finished and
  unmergeable. Supersedes `2026-10-01-the-front-door-branch-is-done-and-waiting-to-merge.md`,
  which is deleted because the thing it described waiting for has happened.
---

## What happened

`the-front-door-shows-the-jobs` was complete and green but could not merge: git refuses to
overwrite uncommitted local changes, and `artifacts/landing/src/pages/Login.tsx` and
`replit.md` carried another session's edits from **2026-09-27**.

A four-hour watch produced no movement. Their mtime was four days old, and later sessions had
committed around them repeatedly on 09-30 — so nobody was holding them; they had been left.

The owner chose to commit them rather than keep waiting. That is `ee27a5c`, which says in its
message whose work it is and that this session only carried it.

## What was and was not committed

Committed: `Login.tsx` (the line about the Chrome extension having its own sign-in) and
`replit.md` (the Railway cutover and scratch-Postgres documentation).

**Left alone, and still uncommitted in the main checkout:**
`drizzle-store.ts`, `lib/db/src/schema/auth.ts`, `Login.test.tsx`, `ROADMAP.md`, and
`2026-09-20-move-onto-the-surviving-database/tasks.md`, plus several untracked SQL files and
the `fix-the-store-fills-created-at` change directory.

**So replit.md now documents a fix that is not in the tree.** `fix-the-store-fills-created-at`
still shows 8 tasks done and 2 open. Whoever finishes it owns that code; this session did not
take it.

## What happened to their Login.tsx edit

It was superseded minutes later. The merge resolved `Login.tsx` to the branch's 52-line version
that renders `SignInPanel`, because their edit adds a line to the old 317-line file and that
same line had already been carried into `components/auth/SignInPanel.tsx` when the file was
split. Keeping theirs would have reinstated the long file and shown the line twice.

Their uncommitted `Login.test.tsx` — which asserts `text-extension-signin` — **still passes**
against the merged tree, checked on 2026-10-02: 7 passed. `Login` renders `SignInPanel`, so the
element is still on the page.

## If that session returns

It will find its two files already committed, its `Login.tsx` content restructured, and its
remaining four files exactly as it left them. Nothing of its work was discarded — the one
substantive line lives in `SignInPanel`, and the database documentation is intact in
`replit.md`.
