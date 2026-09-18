---
title: Two sessions ticketed Google sign-in independently — reconcile the numbers and the two plans before implementing
status: open
origin: Found 2026-09-17 during `/implement google-sign-in`, at the overlap check that precedes
  worktree creation. The run was refused and created nothing. Owner agreed the same day to the
  sequence below: let the other branch land, reconcile, then implement once.
---

**摘要:** `implement/2026-09-15-drop-waitlist` 分支上有 010/011 两张票，内容就是本 main 上的 015
和 `openspec/changes/google-sign-in/`。票号还撞了（两边各有 010/011/012）。等那个分支合并后，先理
编号、再把两份计划合成一份，然后只跑一次 `/implement`。**在此之前不要实现 google-sign-in。**

## What was found

`implement/2026-09-15-drop-waitlist` (local, unpushed, branched from `d8cf71e` — the commit this
session started at) carries four backlog tickets. Two of them are this work:

| Their ticket | Title | Overlaps |
|---|---|---|
| 010 | Let an identity exist without a password, because Google sign-in makes one | `google-sign-in` task group 1, entirely |
| 011 | One way in, and for now it is Google — the page the whole funnel starts at | backlog 015 + the page half of the change |
| 012 | Ask the questions that make a feed personal, in the order the owner drew | backlog 010 (the personal feed) |
| 013 | Take the mailing list off the home page | no overlap |

Their 011's `origin:` is **an owner decision of 2026-09-13**, taken from thirteen screenshots of
Simplify's onboarding: *"我希望 welcome sign in/up 的界面是图一这样的（目前先只支持 google）"*.
This session re-derived that decision from scratch on 2026-09-17 — and reversed it twice on the
way — without knowing it had been taken. Their ticket also records being grounded against
**h1_checker's deployed `POST /auth/google`**.

## Three consequences, all of them concrete

1. **Numbers collide silently.** Their 010/011/012 and main's 010/011/012 hold different work
   under different filenames, so git merges both cleanly and leaves duplicates. `/pickup 010`
   then has two answers. Whoever reconciles must renumber one side — main's are pushed, theirs
   are not, which makes theirs cheaper to move, but theirs are also the older tickets.
2. **Same files, twice.** Their branch already edits `artifacts/api-server/src/lib/auth/store.ts`,
   which `google-sign-in` task 1.2 also edits; `Login.tsx`, `routes/auth.ts` and
   `lib/db/src/schema/auth.ts` are all in both plans.
3. **`google-sign-in/design.md` §1 is wrong on one point.** It treats verification as greenfield.
   `../h1_checker` already ships `POST /auth/google` (`main.py:3538`) and `google_auth.py` (118
   lines, a thin wrapper over the official `google-auth` library), on `origin/main` since
   "Let somebody sign in with Google, and check the token where it cannot be lied to", plus the
   button-mounting JS at `main.py:4054–4106`. The design proposes building a second verifier
   behind a new seam. Whether the website copies that file's shape, ports it, or keeps its own
   TypeScript verifier is a real choice — but it must be made knowing the other exists.

## What to do, in order (owner agreed 2026-09-17)

1. **Let the other session finish and merge its branch.** Do not ask it to stop; do not
   implement `google-sign-in` in the meantime.
2. **Reconcile, after it lands:**
   - Renumber one side's 010/011/012 so no number has two meanings, and fix every cross-reference
     (`ROADMAP.md` §条目→票 table, `.harness/backlogs/014`'s `blocks:`, `015`'s frontmatter,
     `openspec/changes/google-sign-in/proposal.md`'s Origin line).
   - Merge the two plans into one. Their side brings the page design (thirteen screenshots) and
     the deployed reference implementation. **This side brings two things worth carrying over
     and easy to lose:**
     - **The collision rule** (`google-sign-in/design.md` §3): a password row on an address is a
       *claim*, a Google sign-in is *proof*, so proof wins and the password is cleared — with
       `OWNER_EMAIL` exempt, because that password is the recovery path the owner chose to keep.
       Existing sessions on a cleared account are deliberately left alone, recorded as a known
       limit. Email verification would dissolve the whole question, and is unavailable until the
       account merge (`ROADMAP.md` 第二步 1.5).
     - **The null-hash finding** (`google-sign-in/design.md` §4): `routes/auth.ts:142` already
       reads `user?.passwordHash ?? DECOY_HASH`, so a password-less account is refused with the
       same body and the same scrypt cost as any other — the timing channel stays closed with no
       code change. Nothing says this is deliberate, so it needs a test (`tasks.md` 1.5) or the
       next refactor removes it.
     - Also worth keeping: the `/login?password=1` answer to "a kept fallback nobody can reach"
       (`design.md` §8), and that it is explicitly **not** a security boundary.
3. **Then one `/implement`,** on whichever change id survives.

## Also found, unrelated and one line

`CLAUDE.md:77` says "No opsx commands are installed in this repo, so the engine predicate
resolves to the direct path". `.claude/commands/opsx/` now holds `apply.md`, `archive.md`,
`explore.md`, `propose.md`, `sync.md`, `update.md`. The premise is stale; the directive (tdd per
behavior with tick-back) may well still be what the repo wants, so fix the sentence rather than
the intent.
