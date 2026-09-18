---
title: Two deployment cleanups only the owner can run — drop the `waitlist` table, remove COACH_EMAILS
status: open
origin: (1) Task 6.2 of `openspec/changes/archive/2026-09-15-drop-waitlist/tasks.md`, marked
  **"Owner-run, not part of /implement"**. That task says in its own text that if the change is
  archived before the owner has run it, it becomes a session todo rather than a tick. The change
  was archived 2026-09-18; this is that todo. (2) Item 2 of
  `2026-09-12-dashboard-shell-residue.md`, carried here on 2026-09-18 when that file was deleted —
  its other two items were resolved (see below).
---

**摘要:** 代码已经不再引用 `waitlist` 表了，表还在生产库里。**等网站的 API 部署上线之后**，由
owner 手动删。不要用 `db run push`。

## What to run, and when

**After the API deploy lands** — not before. The deployed server still holds the old build until
then, and that build's routes read the table.

```
railway link            # service: bingo_website
railway connect Postgres-EBWW
drop table waitlist;
```

**Not `pnpm --filter @workspace/db run push`** — and as of 2026-09-18 that is not merely
undesirable but impossible from a laptop: the `DATABASE_URL` Railway supplies names an internal
host that only resolves inside their network, so push dies on `ENOTFOUND`. The reason it was
undesirable stands anyway: The proposal gives the reason: push reconciles the
whole schema, and letting it drop a table is a much wider blast radius than one statement — the
same reason `.harness/backlogs/007` exists.

## Why it is safe, and the one thing to check first

`lib/db/src/schema/waitlist.ts` is deleted, the `/waitlist` route is unmounted and gone from
`openapi.yaml`, the form is deleted, and nothing in the codebase references the table. The rows
in it are the mailing-list signups; `.harness/backlogs/013` recorded what was decided about them.
**Read that ticket's decision before dropping** — if anyone is ever to be told the list is gone,
or the addresses exported, it has to happen before the table does.

Tick nothing when this is done. Delete this file.

---

# 2. Remove `COACH_EMAILS` from the deployment

The practice view is open to every signed-in user, and **no code reads `COACH_EMAILS` any
more** — `artifacts/api-server/src/lib/coach/auth.ts:9` says so in a comment, and `replit.md`
lists it only as a recorded decision ("deleted, not turned into a kill switch"). The variable is
still sitting in the Railway and Vercel environments.

Harmless today, misleading in six months — and misleading in a specific way worth naming: its
old meaning was *unset = nobody may practise*. A stale variable with that history, found by
somebody later, reads as a switch that still does something.

Delete it in both environments. Nothing to deploy, nothing to test.

---

## What the deleted residue file resolved, recorded so nobody re-opens it

`.harness/session-todos/2026-09-12-dashboard-shell-residue.md` was deleted on 2026-09-18. Its
three items:

1. **"The practice rail entry lost its live progress"** — it did not, in the end. The
   requirement is in `openspec/specs/dashboard-shell/spec.md` ("The practice entry carries
   today's progress"), implemented as `artifacts/landing/src/pages/dashboard/PracticeStatus.tsx`,
   and pinned by `PracticeStatus.test.tsx` asserting the exact string
   `"Today: 2 of 5 graded · 1 solved but not grilled"`. The rail reaches it through the view
   registry rather than by knowing about the coach, which answers the residue's own worry about
   the rail depending on a view's data. The note was written before the work landed and nobody
   went back to strike it. **The owner confirmed 2026-09-18 that the current behaviour is what
   they wanted.**
2. Carried above.
3. **`pnpm run build` failing in `artifacts/mockup-sandbox`** (its `vite.config.ts` throws unless
   `PORT` is set) — unchanged, not caused by that change, and already recorded permanently at
   `replit.md:285`. Nothing to carry.
