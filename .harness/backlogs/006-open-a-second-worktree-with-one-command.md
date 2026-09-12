---
id: 006
title: Make opening a second worktree one command instead of five steps
status: open
origin: User request 2026-09-12, after `CLAUDE.md` Rule 1 was extended to require a
  worktree when a second session is already in this directory. The rule now documents
  the manual steps; this ticket is what stops people skipping them.
---

## Why this is a ticket rather than a line of code

Rule 1 now says: if another session is live here, open a worktree and work there. Doing
that correctly today is five separate steps, and two of them fail silently when forgotten.

1. `git worktree add ../bingo_website-wt-<topic> -b <branch>`
2. Pick a port pair nobody is using
3. Copy `.claude/launch.json` across and change its port — it is gitignored, so a fresh
   worktree has none and `preview_start` by name will not work
4. Set `PORT` for the API **and** `API_PROXY_TARGET` for the front end
5. `pnpm install`

Step 4 is the one that bites. The other two port numbers announce themselves: a second
landing dev server fails loudly on 5173 (`strictPort: true` in
`artifacts/landing/vite.config.ts`) and a second API server fails loudly on 8080
(`src/index.ts` exits 1 on a listen error). So you raise both, it runs, and you stop —
leaving `API_PROXY_TARGET` at its default `http://127.0.0.1:8080`, which is checked by
nobody. The second session's front end then talks to the **first session's API**. The
session cookie lands on the wrong origin, and the symptom is a login that does nothing.
Hours in `artifacts/api-server/src/lib/auth/`, none of it the bug.

The deeper reason this is worth building: a rule that is more work than breaking it does
not survive a deadline. Writing the cost down does not fix that — only making the correct
path the cheap path does.

## What done looks like

- One command — `pnpm new-worktree <topic>` or equivalent in `scripts/` — produces a
  worktree that is ready to work in: branch created, dependencies installed, ports
  allocated, `launch.json` written.
- **The three port values derive from one offset.** N=1 means landing 5174, API 8081, and
  `API_PROXY_TARGET` pointing at 8081. One number decides all three, so "forgot the third
  one" stops being a thing that can happen. The offset is picked by looking at what the
  existing worktrees already hold, not by the operator guessing.
- The worktree lands as a **visible sibling** with the `-wt-` prefix Rule 1 names — never
  inside this repo. The repo has already done the hidden version once (`.worktrees/`,
  2026-09-11, concealed in `.git/info/exclude`); both the folder and that ignore line are
  gone, and nothing should put them back.
- A committed `.claude/launch.example.json` is the template the script copies from.
  `.gitignore` ignores the exact name `launch.json`, so an example file can be tracked.
- The command prints, at the end, the three values it chose and the directory it made.
- A companion path for tearing one down (`git worktree remove` plus whatever the script
  created) so stale worktrees do not accumulate.

## Do not

- **Do not run schema pushes or dev servers against a shared database as part of this.**
  Setup ends at `pnpm install`. Ticket 007 owns the database side; this one owns files and
  ports only.
- **Do not commit `.claude/launch.json` itself.** It is per-machine on purpose — see the
  comment above it in `.gitignore`.
- Do not build as part of setup. Every workspace package the server and app import exports
  `src`, not `dist`, so `pnpm install` alone is enough to run `pnpm test`. Adding a build
  step would make the correct path expensive again, which is the whole problem.

## Notes

Tests are already safe to run in parallel and the script should not pretend otherwise:
vitest pins `DATABASE_URL` to a dummy (`artifacts/api-server/vitest.config.ts`) and the
drizzle contract test only touches the scratch database named by `COACH_TEST_DATABASE_URL`.
Two sessions running `pnpm test` at once do not collide.
