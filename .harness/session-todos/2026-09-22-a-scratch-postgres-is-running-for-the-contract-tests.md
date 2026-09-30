---
title: A scratch Postgres is running on 127.0.0.1:55432 for the contract tests — reuse or stop it
status: open
origin: Started 2026-09-22 to reproduce the sign-in bug for
  `openspec/changes/fix-the-store-fills-created-at/`. Left running so `/implement` can run the
  contract tests without setting one up again. Delete this file when it is stopped.
---

**摘要:** 本机 55432 端口上跑着一个一次性 Postgres，数据目录在这次 session 的 scratchpad 里。
`/implement fix-the-store-fills-created-at` 直接用它；用完 stop 掉。

Data directory (session-specific path, so it is written here rather than in the change).
**Rebuilt 2026-09-27** — the 09-22 directory was gone with its session's scratchpad, which took
all three contract-test files down with it (`ECONNREFUSED 127.0.0.1:55432`, no assertion
failures, which is what that looks like). The four commands in the change's `tasks.md` preamble
rebuilt it in under a minute, exactly as they promise. Current directory:

```
/private/tmp/claude-501/-Users-guozhengjia-Desktop-My-Development-Bingo-bingo-website-main/9e2479c6-aa25-4551-8ea2-c6ee602f23a1/scratchpad/pg
```

It now also carries the three tables from `2026-09-25-the-applications-i-already-sent`; that
change's contract test creates them from `lib/db/drizzle/0001_vengeful_forge.sql` when they are
absent, so a fresh rebuild needs no extra step.

Use it:

```
export COACH_TEST_DATABASE_URL=postgres://postgres@127.0.0.1:55432/scratch
pnpm --filter @workspace/api-server exec vitest run --config vitest.config.ts src/lib/auth/drizzle-store.contract.test.ts
```

Stop it (`LC_ALL=C` is needed on this machine for every `pg_ctl` call):

```
LC_ALL=C pg_ctl -D "<the directory above>" stop
```

If the directory is gone (the scratchpad is per session), the change's `tasks.md` preamble has
the four commands that recreate it in under a minute. `pg_isready -h 127.0.0.1 -p 55432` says
which case you are in.

## It now also serves the local dev stack (added 2026-09-29)

`.claude/launch.json`'s `api` entry already points at this database, so `preview_start` gives
a working signed-in dashboard against it — no production traffic, no production rows.

It carries user 44 `dev-owner@test.local` (matching that entry's `OWNER_EMAIL`) and the 94
applications imported from `~/Desktop/job_dashboard`. **The passwords are deliberately not written
down here** — they are throwaways for a throwaway database, and a password in a file outlives the
database it was for. Set your own before signing in:

```
printf 'PASSWORD\nPASSWORD\n' | env OWNER_EMAIL=dev-owner@test.local \
  DATABASE_URL=postgres://postgres@127.0.0.1:55432/scratch \
  pnpm --filter @workspace/api-server run set-owner-password
```

Growth reads "Could not reach the stats service" here and that is correct: no `STATS_TOKEN`,
no h1_checker API. Practice and Applications are the two views with real local data.

A second account exists for looking at the non-owner side: user 409 `dev-user@test.local`,
created through the ordinary sign-up form. Nothing is seeded for it on purpose — an untouched
account is exactly the state worth being able to look at. It is not the owner here, so it gets
the rail-less, Practice-only dashboard a real user gets. Its password is not recorded either;
sign up a fresh address through `/login` if you need that view again, which costs nothing.
