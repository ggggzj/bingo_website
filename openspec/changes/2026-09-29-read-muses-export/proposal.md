# Proposal — read-muses-export

## Why

The owner applies through Muse now, not Simplify. Muse exports
`成功投递记录-<date>.xlsx` with seven columns: 公司 · 职位 · 地点 · **岗位链接** ·
确认号/Req · 提交日期 · 备注.

**The link is why this matters.** Merging one export by hand on 2026-09-29 took the JD archive
from **80 bodies to 94**, gave real titles to four rows that had been sitting as
`职位名待补（确认邮件里没写）`, and surfaced three applications no source had recorded. The
folder's whole reason for existing is that a posting 404s when the req closes — two of the
owner's did, within a day and within five days — and a row with no link can never have a body.

`027` covers the other half and does not change: the mailbox says what *happened*, and it has
been measured as unable to say what was applied to (120 recruiting messages, 46 with a
job-shaped URL, **zero** of them a posting).

Origin: `.harness/backlogs/028`, rewritten 2026-09-29 after the owner named Muse.

## What Changes

**`scripts/import_muse.py` in the owner's folder**, beside `import_simplify.py` and the same
shape: read the export, normalise, merge into `applications.js`, touch nothing else.
`archive_jds.py` and `push_to_account.py` then run exactly as they do today.

**And one fix in `import_simplify.py` that is not optional**, because the new importer must
share its key normalisation rather than grow a second one:

```
看板 : workday:generalmotors/Careers_GM/Software-Engineer--AV-Launch_JR-202618994
Muse : workday:generalmotors/careers_gm/Software-Engineer-AV-HIL-Platform-…
```

`norm_url` lowercases the Workday **tenant** and not the **site segment**, so the same posting
reached from two links gets two keys. Measured today: with the case fixed, 15 of Muse's 18 rows
matched an existing application immediately; without it, they looked new.

**Nothing in the website changes.** No route, no table, no view — the same as `027`.

## The four traps, all met while doing this by hand on 2026-09-29

1. **A row that gains a link changes identity.** The key is the normalised URL, or
   `"公司名|职位名"` when there is none. Giving HPE its real title and link produced a second
   row rather than updating the first; five such pairs appeared and were deleted by hand after
   checking each carried no status and no trail. **The importer must treat a link-less row and
   a Muse row for the same application as one row.**
2. **Case in the key** — above.
3. **Muse's company names are not the tracker's.** `Acuity` against `Acuity Brands`,
   `RELX` against `LexisNexis Risk Solutions`, `PROS Holdings, Inc.` against nothing.
4. **One company, several applications.** SingleStore has four rows with four Greenhouse ids;
   General Motors has two reqs — `AV-Launch` and `AV-HIL-Platform`. A rejection letter naming
   one of them was written onto the other by hand today, and only the export revealed it.
   **A company name is never enough to place a row.**

## What does not change

- **Simplify's CSV path stays.** The owner stops using it by stopping, not by the code
  forgetting how; the 94 rows it produced are still the bulk of the tracker.
- **`027`'s mailbox reading stays untouched.** It still never writes, and it still finds
  applications no export recorded — eight on 09-29.
- **`add_job.py` stays.** It is the path for a link in hand at the moment of applying, and the
  only one that runs before an export exists.

## Non-goals

- **No scraping Muse.** This reads a file the owner exports.
- **No deleting anything automatically.** Today's five duplicates were deleted only after
  checking each carried no status and no trail, and only when the owner said to.
- **No guessing an ambiguous row into a match.** Where the name and the link disagree, print
  and stop. One such row is open right now: Muse's `RELX · Software Engineer 1 · R117973 ·
  提交 09-17` against the tracker's link-less `RELX · Software Engineer 1 · 09-22`. A rule
  cannot settle that; the owner can, in a moment, from Muse's own screen.
- **No second key normalisation.** Whatever `import_simplify.py` does is what this does, which
  is why its bug is fixed here rather than worked around.

## Capabilities

**None.** Every line runs on the owner's machine, against a file they export. The ticket records
why the change lives in this repo anyway: the folder is not a git repo, and the account it feeds
is this repo's.
