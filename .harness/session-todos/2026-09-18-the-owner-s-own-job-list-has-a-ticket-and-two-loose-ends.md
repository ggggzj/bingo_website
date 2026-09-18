# The owner's own 27ng job list — ticket written, two loose ends

Session 2026-09-18. The owner asked for a private dashboard listing the US 2027 new-grad
entry-level SDE roles they can apply to, updated daily, and supplied a ten-sheet spreadsheet
(`~/Downloads/美国科技公司_可Sponsor应届SDE岗_USC校友Referral话术_2026-09-13.xlsx`) as the
reference form. Written up as `.harness/backlogs/019`, with both owner decisions recorded in
it. No proposal was written and no code was touched — stopped at the gate.

## Loose end 1 — `ROADMAP.md` has no row for this

The 条目 → 票 table at the bottom of `ROADMAP.md` lists every ticket against a roadmap item.
`019` has no item, because the roadmap is about the product and this is a tool with one user.
Two defensible answers and it is the owner's call:

- Leave it off. It is not product direction; it is the owner dogfooding `016` early.
- Add it, because it is the first real consumer of `022` on this side and the roadmap's
  timeline table is where 022's consumers are visible.

Do not edit `ROADMAP.md` to resolve this without asking — that file is owner-written direction.

## Loose end 2 — the next move is in h1_checker, not here

Resolved differently than this file first recorded. `../h1_checker/.harness/backlogs/026` was
written on 2026-09-18 and is the data half. **It was rewritten the same day after the owner
corrected it** — the first version proposed importing addresses out of their spreadsheet, and
they said the spreadsheet is inspiration only ("更多的信息还得是得从 Greenhouse + Lever + Ashby
+ Workday 还有各大公司自己的网页获取"). It now builds the discovery script
`docs/JOB_FEED_PLAN.md` specified on 2026-08-19 and nobody ran, with the spreadsheet's 385
addresses demoted to a validation set. It names `019` in its `blocks:` line, so h1_checker now knows.

**`019` cannot usefully ship before `023`.** Measured: on the 43 boards we sync today, the
owner's dashboard would show 14 rows from 3 employers, 10 of them Palantir postings from June.
`023` takes that to 79 with no new provider code; `022` then takes it to 210.

The parsed addresses are kept only as the scoring target for that script:

    /private/tmp/claude-501/-Users-guozhengjia-Desktop-My-Development-Bingo-bingo-website-main/3a246264-3737-4cc5-808d-31815216777e/scratchpad/harvested_boards_UNVERIFIED.csv
    346 rows — greenhouse 139, workday 99, ashby 75, smartrecruiters 19, lever 14

It is **unverified on both axes `023` requires**: no token was called against its provider, and
no employer was resolved against the LCA filings. It is a scratchpad file and will not survive;
regenerate it from the spreadsheet if it is gone. Zero of the five known same-name traps appear
in it, which is expected — the spreadsheet's author had already excluded them — and is a useful
signal that the parse agrees with the file's own method sheet.

## Three tickets numbered 023, found 2026-09-18 when the owner asked

Checked at session start per Rule 1 and found nothing live. Re-checked later in the session
after the owner said another session felt like it was doing the same work. They were right, and
the first check missed it because it only looked at **this** repo:

| Where | Ticket 023 | State |
|---|---|---|
| `h1_checker-workday` (worktree, `implement/poll-workday-too`) | `023-one-brand-many-filers` | committed on that branch |
| `h1_checker-ext-planning` (worktree, `fix/401-names-the-key-not-the-password`) | `023-give-the-two-surfaces-one-copy-of-the-error-sentence` | staged, uncommitted |
| `h1_checker` main | the board-discovery ticket written by this session | untracked |

This session's ticket was renumbered to **026** before it was ever committed, jumping past 024
and 025 so the other two have room to resolve their own collision. **That collision is still
open and neither of those sessions can see the other** — both branches are unmerged, so main
sees neither.

This is `../h1_checker/.harness/backlogs/013` (the workspace map hides live worktrees) occurring
for real, and the same failure this repo fixed in f2162f7. `git worktree list` is what finds it;
the router's map in `../CLAUDE.md` does not, because it lists `<repo>-<suffix>` siblings as
copies never to edit and two of those five are live worktrees.

**Also found: `022` (Workday) is being implemented right now** on `implement/poll-workday-too`.
It is directly upstream of `019`. Whoever picks up `026` should read that branch first rather
than assume 022 is still unstarted.

## The finding worth keeping from this session

`employer_job_levels` already answers "which companies hire and sponsor entry-level software
engineers" without reading a single job board. Counted 2026-09-18 over software SOC codes:
**8,699 employers have certified Level 1 filings, 2,531 have three or more.** Level 1 is DOL's
own entry tier, so this is the regulator's classification, not ours.

That reordered `023`'s probe queue from ~24k software employers to ~2,531, aimed at the
companies most likely to hire the owner. It is also the asymmetry against Simplify, whose own
sponsorship column was measured at 1 marked row in 1,867: they know where postings are, we know
who sponsors new grads.

## What was measured, so nobody re-measures it

All of it is in `019`. The two numbers that carry the most weight:

- Of the owner's 376 US rows, `Greenhouse + Lever + Ashby` reach 81 (21%); adding Workday
  reaches 212 (56%). 164 rows and 36 of 107 companies stay invisible, 77 of those rows being
  TikTok / ByteDance alone.
- `SimplifyJobs/New-Grad-Positions` carries `license: None` (GitHub API, 2026-09-18). The
  owner chose not to use it, so this never became a question — but the finding is worth
  keeping, because `021` would have been republishing.
