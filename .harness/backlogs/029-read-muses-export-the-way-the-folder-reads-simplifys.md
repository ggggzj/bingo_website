---
id: 029
title: Read Muse's export the way the folder reads Simplify's — and stop asking the inbox to be a source it cannot be
status: built — delivered 2026-09-29. `import_muse.py`, the `norm_url` case fix with nine sample
  tests, and the key-alias mechanism that lets a link-less row keep its id, status, note and trail
  when it gains a link. Verified against the real export: 18 of 18 rows read as already present,
  matching the merge done by hand the same day. Folding the retired `overrides.js` keys restored
  the 18 hand-written rows the account importer had stopped seeing (it had dropped to 6).
  **The `norm_url` fix cost four repairs** — that key lives in `applications.source_key`,
  `data/ids.json`, `data/archive.js` and `data/overrides.js`. Read
  `openspec/changes/2026-09-29-read-muses-export/1-fold-source-key-case.sql`, and in particular
  why it excludes `|` keys, before touching that function again: the first version folded them
  too and created 12 duplicates, one of them carrying a rejection note the owner had written.
  Proposal history: one export was merged by hand that day (JD archive 80 → 94, three
  applications recovered, five duplicate rows created and deleted); the proposal was built on
  what that cost.
change: openspec/changes/2026-09-29-read-muses-export/
origin: Owner, 2026-09-29, in two steps that reversed each other.
  First — "是的", the inbox should replace Simplify as the source of applications.
  Then — "我现在都是用 muse 帮我投简历的", with the export
  `成功投递记录-2026-09-29.xlsx`. The second fact makes the first question the wrong one, and
  this ticket was rewritten the same day rather than built on the premise it had.
depends-on: .harness/backlogs/027 (built) — the mailbox half, which stays exactly as it is.
grounded: 2026-09-29 — every number measured off the owner's live mailbox, their 108
  applications, and the Muse export itself.
---

## The rewrite, and why the first version was answering the wrong question

The first draft of this ticket asked whether the inbox should replace Simplify, measured what
that would cost, and recommended a compromise. The measurement stands and is kept below, because
it is true about *email*. But it was the wrong question: **the owner had already replaced
Simplify — with Muse, which applies on their behalf.**

Muse's export has the one thing email does not.

## The three sources, with the line between them measured

| Source | Answers | Carries the job link? |
|---|---|---|
| **Muse export** (`成功投递记录-*.xlsx`) | *what I applied to* | **18 of 18** |
| **The mailbox** (`027`) | *what happened to it* | **0** — see below |
| The folder's `add_job.py` | a link the owner pastes by hand | yes |

Columns Muse gives: 公司 · 职位 · 地点 · **岗位链接** · 确认号/Req · 提交日期 · 备注. The 备注
column is a human note about how the submission went — *经她明确批准提交*, *浏览器误点直接提交，
她说保留不撤回*, *手动过 hCaptcha 提交*. Simplify never had that, and neither does email.

**The link is the whole difference.** Merging this export by hand on 2026-09-29 took the JD
archive from **80 bodies to 91** in one run, because `archive_jds.py` finally had URLs for rows
that had none. It also gave real titles to four rows that had been sitting as
`职位名待补（确认邮件里没写）`.

### What the email measurement showed, and still shows

Kept from the first draft because it is the reason email cannot be the source, not merely a
worse one:

Of 120 recruiting messages in the owner's mailbox, 46 contain a URL that pattern-matches as a
job link. Every one is an ATS login page, a careers homepage, a tracking redirect, a policy page
or an image in the template. **Not one is a posting.** Four of the eight applications recovered
from email on 09-29 had no job title anywhere in the message either.

So email is not a degraded source of *what was applied to*. It is a source of something else.

## What Changes

**A `scripts/import_muse.py` in the folder, beside `import_simplify.py`.** The same shape as
the script it sits next to: read the export, normalise it into `applications.js`, leave
everything else alone. Then `archive_jds.py` and `push_to_account.py` run as they already do,
and the JD archive keeps growing instead of stopping.

Nothing in the website changes. Nothing about `027` changes.

## Three things that bit during the manual merge — build for them

Measured on 2026-09-29 while doing this by hand once:

1. **A row that gains a link changes identity, and the old one does not go away.** The tracker
   keys on the normalised URL, or `"公司名|职位名"` when there is none. Giving HPE its real title
   and link turned one row into two: `#285 HPE · 职位名待补 · 无链接` and `#392 HPE · Systems /
   Software Engineer I Graduate · 有链接`. Five such pairs appeared and were deleted by hand
   after checking that none carried a status or a trail row. **The importer has to recognise
   that a link-less row and a new linked row are the same application**, or every Muse import
   doubles whatever email added first.
2. **Matching by URL alone is not reliable.** General Motors' row and Muse's entry for the same
   application differ in case and slug (`Careers_GM` vs `careers_gm`), so a URL comparison called
   it new when it was not. Matching by company name alone is worse — 62 of 82 company names are
   a single word. The join needs both, and a human for the rest.
3. **Muse's company names are not the tracker's.** `Acuity` against `Acuity Brands`,
   `PROS Holdings, Inc.` against nothing, `RELX` against `LexisNexis Risk Solutions`. Normalising
   these by rule will get some wrong; the importer should say which ones it is unsure about
   rather than decide.

## What does not change

- **Simplify's CSV path stays.** It is not removed by this; the owner stops using it by stopping.
- **`027`'s mailbox reading stays exactly as it is** — it never writes, and it still finds the
  applications no source recorded.
- **`add_job.py` stays.** It is the path for a link the owner has in hand, and it is the only one
  that runs at the moment of applying.

## Non-goals

- **No scraping of Muse.** This reads a file the owner exports. If Muse ever has an API that is
  a different ticket with a different credential conversation.
- **No automatic deletion of anything.** The five duplicate rows on 09-29 were deleted only after
  checking each carried no status and no trail, and only when the owner said to.
- **No guessing which application a Muse row matches** when the name and the URL disagree. The
  importer prints those and stops; three such rows (GM, RELX, a fourth SingleStore) were left
  unmerged on 09-29 for exactly this reason and are still open.

## What done looks like

- `python3 scripts/import_muse.py <导出.xlsx>` merges the export into `applications.js`, the same
  way `import_simplify.py` merges a CSV.
- A Muse row whose application already exists **without a link** updates that row rather than
  creating a second one. Proven against the real pair that caused this: a link-less
  `HPE · 职位名待补` row plus Muse's HPE row must end as one row, with the link.
- A Muse row it cannot place with confidence is **printed, not merged**, with what it matched on.
- The 备注 column survives into the row's provenance — *经她明确批准提交* is a fact about that
  application that exists in no other system.
- The folder's README gains one line saying which source answers which question, because after
  this there are three and the next reader will otherwise guess.

## Open, for the proposal

1. **The three unmerged rows from 09-29** — General Motors, RELX, and SingleStore's fourth. Same
   application or different postings? The owner can tell from Muse's own screen in a moment; a
   rule cannot.
2. **`Headlands Technologies` is still `职位名待补`** and Muse has no row for it, so nothing will
   fix it automatically. It came from email alone.
3. **Whether `import_simplify.py` and `import_muse.py` should become one script** with two
   readers. They will share the dedupe and the key normalisation, which is exactly the part that
   must not diverge — but merging them touches a working script for a stylistic reason.
