---
title: Drop the production `waitlist` table — the one task drop-waitlist could not tick itself
status: open
origin: Task 6.2 of `openspec/changes/archive/2026-09-15-drop-waitlist/tasks.md`, marked
  **"Owner-run, not part of /implement"**. That task says in its own text that if the change is
  archived before the owner has run it, it becomes a session todo rather than a tick. The change
  was archived 2026-09-18; this is that todo.
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

**Not `pnpm --filter @workspace/db run push`.** The proposal gives the reason: push reconciles the
whole schema, and letting it drop a table is a much wider blast radius than one statement — the
same reason `.harness/backlogs/007` exists.

## Why it is safe, and the one thing to check first

`lib/db/src/schema/waitlist.ts` is deleted, the `/waitlist` route is unmounted and gone from
`openapi.yaml`, the form is deleted, and nothing in the codebase references the table. The rows
in it are the mailing-list signups; `.harness/backlogs/013` recorded what was decided about them.
**Read that ticket's decision before dropping** — if anyone is ever to be told the list is gone,
or the addresses exported, it has to happen before the table does.

Tick nothing when this is done. Delete this file.
