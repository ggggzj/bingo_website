---
title: Owner deployment cleanups — `waitlist` table dropped 2026-09-18; COACH_EMAILS still set
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

---

## Both done 2026-09-18

**1. The `waitlist` table is dropped.** Two preconditions were checked first rather than
assumed:

- *Was the deploy live?* Yes — `bingocareer.com` serves no email input, the home page carries
  no mailing-list wording, and `POST /api/waitlist` answers 404. The old build that still read
  the table was already gone, so dropping it could not break anything serving traffic.
- *Was there anything to export?* `select count(*) from waitlist` → **0**. Nobody had ever
  submitted an address, so the question ticket 013 raised — export first if strangers' emails
  are in it, drop outright if only the owner's — resolved to the second with nothing to save.

`drop table waitlist;` through `railway connect Postgres-EBWW`. `\dt` confirms eight tables
remain and it is not among them. Afterwards `/`, `/jobs`, `/api/healthz` and `/api/jobs` all
answer 200 (7,286 postings), and `/api/waitlist` still 404s.

That completes task 6.2 of `openspec/changes/archive/2026-09-15-drop-waitlist/tasks.md`, which
is deliberately left unticked there: it says an archived change records this as a closed todo
rather than a retroactive tick, and this is that record.

**2. `COACH_EMAILS` — still open, and the only thing left in this file.** No code reads it; it
is still set in Railway and Vercel. Delete it in both. Nothing to deploy, nothing to test. See
the section above for why leaving it is worse than it looks.
