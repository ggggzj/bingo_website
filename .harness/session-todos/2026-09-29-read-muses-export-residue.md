# 029 built — what was left undone, and one file I deliberately did not write

2026-09-29. `2026-09-29-read-muses-export` is delivered: all 11 tasks ticked, ticket 029 set to
built, the folder's README naming its three sources. Pushed as `3774474` — the session's network
quota ran out during close-out, so the owner ran the push by hand. Two things a `/pickup` still
needs, and a few smaller ones.

## 1. `replit.md` was **not** updated, on purpose

The inner loop (`replit.md` "User preferences") says to update it as each task group closes. I did
not, because that file currently carries **another session's 56 uncommitted lines** — restored
there in `9041824` after I swept them into a commit of mine earlier in the day. Editing it now is
the same mistake with a different hand on it.

This is now **owed twice**: `openspec/config.yaml` makes an "Architecture decisions" append part
of archiving, and four changes were archived on 2026-09-29 without it. Whoever owns those 56 lines
should land them first, then paste the two entries below — they are written to go in as-is.

### Owed entry — the two halves, and who owns which

> **A row has a machine half and a human half, and they live in different tables.**
> `applications` is written only by the import; `application_status` is written only by a person.
> The alternative was one table with an "imported" flag, which is smaller until the first import
> overwrites a status the owner typed. Separation makes that impossible rather than forbidden, and
> the import's one rule — seed a status row with `onConflictDoNothing`, never update one — is a
> single line that cannot be got wrong by accident. Every write lands in `application_events` with
> a `hand` of `import` / `browser` / `script`, taken from which credential was accepted, never
> from a parameter.

### Owed entry — three sources, and why the inbox is not one of them

> **The mailbox answers "what happened to it", never "what did I apply to".**
> On 2026-09-29 the owner confirmed the inbox should replace Simplify as the source of
> applications, then said they apply through Muse — which makes the first answer the wrong one.
> Measured: of 120 confirmation messages, 46 carry something link-shaped and none is a posting
> page. Without the posting URL there is no stable dedupe key and no JD body, and a posting 404s
> fast (Trustpilot day 1, Showpad day 5), so the local copy is the only one. Muse's export
> (`import_muse.py`) answers what was applied to, `check_mail.py` what happened to it, `add_job.py`
> the link in hand right now. `data/key_aliases.json` is what lets a row born from email keep its
> id, status, note and trail when it later gains a URL: rename first, import second — the reverse
> order creates a new row and strands the old one, which is what happened by hand that day.

## 2. Close-out gates not run

`review-board` and `session-eval` were not run on this change's integration diff. The work was
verified against production and the real export rather than reviewed — stated plainly so nobody
reads "built" as "reviewed".

## Still open, smaller

- **RELX may be a duplicate.** Link-less `#42` versus Muse's `R117973`. `same_company` cannot tell
  RELX from LexisNexis (pinned by `test_sibling_brands_are_not_recognised`); this one needs eyes on
  Muse, not a rule.
- **`Headlands Technologies`** still reads `职位名待补（确认邮件里没写）`.
- **12 JD bodies are re-fetchable** with `add_jd.py` — the ones whose postings were still live.
- **`CLAUDE.md` Rule 4 says no opsx is installed here, but `.claude/commands/opsx/apply.md` exists.**
  One of the two is wrong, and the engine predicate reads the file, not the rule.

### Owed entry — the feed's freshness is on the page, and why thirty

Added 2026-09-30 by `2026-09-30-the-dashboard-says-when-the-feed-last-moved`, whose task 3.1
deferred for the reason this file already gives: `replit.md` still carries another session's
uncommitted migration notes, and merging a branch that edits it would either be refused or sweep
them up. **This is now three owed entries. They are all one paste.**

> **The Growth view reports job-feed freshness, at one threshold, as a line.**
> The feed stopped twice — 2026-08-20 for twenty days, 2026-09-18 for twelve — and both times the
> owner found out by accident, because the page they open daily said nothing. D-043 had already
> shipped the detection (`feed_last_sync`, `feed_hours_stale` on the upstream `/stats`) and this
> repo forwarded both and read neither, so the number reached the browser and was dropped one
> layer short of the screen. Declaring the two fields on `StatsTotals` was the whole fix.
> **One threshold at 30 hours, not amber/red**: the sync is daily, so a healthy value sits under
> ~24 and 30 is one cycle plus headroom; a warning level left standing becomes the new normal,
> which is what twelve days of grey was. **A line above the tile row, not a sixth tile**: every
> number in that row means more-is-better and this one is the page's only alarm.
> **It reads `feed_last_sync`, never the newest posting's date** — that is the employer's date, so
> a sync that runs and stores nothing would leave it frozen while the sync time moves, and those
> two disagreeing is a diagnosis rather than a substitute.
> The threshold constant lives in `Dashboard.tsx` alone; `Dashboard.test.tsx` crosses it with its
> own literals at 29 and 31, because a test that imports the number can only agree with the page.
