---
id: 007
title: Make a schema push say which database it is about to change, and refuse one from a worktree
status: open
origin: User request 2026-09-12, from the same session that extended `CLAUDE.md` Rule 1.
  Rule 1 states the constraint — schema pushes and dev servers are main-tree only, one
  session at a time — and nothing enforces or even reports it.
counterpart: 006 covers files and ports; this one covers the database. Same problem, and
  they are separate because one is developer experience and the other is damage control.
---

## The gap a worktree leaves open

A worktree isolates files. It does not isolate anything that is not a file, and this repo
keeps one important thing outside the files: `DATABASE_URL` points at one Postgres. Two
worktrees running `pnpm --filter @workspace/db run push` alter the same schema; two dev
servers write the same rows.

This is worse than the plain shared-directory case it replaces, because a worktree makes
isolation *feel* solved. The operator has just been through a whole ritual to get their own
directory. Nothing on screen says the database came along unchanged.

## The second half: nobody knows which database it is

Checked 2026-09-12: `DATABASE_URL` is not in any shell profile, not in a `.env` (there is
none in this repo), and not in `.claude/settings.local.json`. `replit.md` shows it being
typed inline per command. Production runs on Railway
(`bingowebsite-production.up.railway.app`). Two local Postgres servers are running on this
machine (16 and 18), but 5432 refuses connections and 18 wants a password, so which one dev
actually uses cannot be read off the disk at all.

So the honest state is: **the person running the push does not know what they are pushing
to.** Which is why the fix here is not "give every worktree its own database" — that answer
assumes a fact nobody has. The fix is to make the answer appear every time.

## What done looks like

- Before it changes anything, a schema push prints what it is about to change: host, port,
  database name and user. **Never the password**, and never the whole URL, which carries
  one.
- Run from a linked worktree, it **refuses** and says why. `git rev-parse --git-common-dir`
  returning something other than `.git` is the test; the message should name Rule 1 rather
  than only complaining.
- The same guard covers the other scripts in `lib/db/package.json` that write to a live
  database: `push-force`, `seed-coach`, `import-coach`. A guard on `push` alone would just
  move the accident one line down.
- On an interactive terminal it waits for a confirmation after printing the target; with no
  TTY it proceeds, so nothing that already runs unattended starts hanging. An explicit
  environment override exists for the unattended case and is documented where the scripts
  are.
- `replit.md` gains a line under Run & Operate saying a push announces its target and will
  not run from a worktree.

## Do not

- Do not add a second place that defines `DATABASE_URL`. The guard reads the value already
  in the environment and reports it; it does not resolve, default, or rewrite it. A second
  source of truth for which database is live is a worse bug than the one being fixed.
- Do not print the password, and do not log the full connection string anywhere, including
  on the refusal path.
- Do not attempt per-worktree databases in this ticket. That becomes worth designing once
  the printout has been seen a few times and the dev target is actually known.

## Notes

If the printout shows that local development has been pointing at the production Railway
database, that is a bigger finding than this ticket and gets its own — surface it, do not
quietly repoint anything.
