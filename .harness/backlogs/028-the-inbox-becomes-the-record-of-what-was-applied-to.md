---
id: 028
title: The inbox becomes the record of what was applied to — and the job link stops arriving with it
status: open
origin: Owner decision 2026-09-29 — asked directly whether the mailbox should replace Simplify as
  the source of applications, answered **是的**. Prompted by `027`, whose survey found four
  applications (Adobe, AspenTech, Cadence, HPE — eight in total) that the mailbox knew about and
  the folder did not.
depends-on: .harness/backlogs/027 (built) — its matcher is what identifies which application a
  message belongs to, and its survey is where every number below was measured.
grounded: 2026-09-29 — counted off the owner's live mailbox and their 102 applications.
---

## What the inbox is better at, measured

The mailbox is a **more complete record of what was applied to** than the folder is. `027`'s
survey found eight applications with confirmation emails and no row: Adobe, AspenTech, Cadence,
HPE, Acuity Brands, FiscalNote, Headlands Technologies, Netic. They were added by hand on
2026-09-29 and took the tracker from 94 to 102.

It is also the only place that knows what *happened*: 15 of the owner's 18 hand-written rows are
rejections, and 12 of those were copied out of an email by hand.

And it costs nothing to keep current. Simplify's half needs a CSV exported and dropped in a
folder; the mail arrives on its own.

## What it cannot do, measured — and this is the whole ticket

**A confirmation email does not carry the job link.** Of 120 recruiting messages in the owner's
mailbox, 46 contain a URL that pattern-matches as a job link. Reading them:

| What the link actually is | Example |
|---|---|
| The ATS login page | `relx.wd3.myworkdayjobs.com/en-US/relx/login` |
| The employer's careers home | `search-careers.gm.com/` |
| A tracking redirect | `microsoft.eightfold.ai/vsimp?d=…` |
| A policy page | `careers.microsoft.com/…/transparency.html` |
| An image in the template | `static.vscdn.net/images/careers/…` |

**Not one is a posting.** The count of confirmation emails carrying a link to the job they
confirm is, as far as this measurement goes, zero.

Two more gaps from the same survey:

- **The job title is often absent.** Of the eight applications recovered from email on 09-29,
  **four had no title anywhere in the message** (HPE, FiscalNote, AspenTech, Headlands) and are
  sitting in the tracker as `职位名待补（确认邮件里没写）`.
- **Location, ATS and posted date are absent** too, except where a Workday tenant implies them.

## The cost, stated as a consequence rather than an opinion

No link means **no JD archive**. `archive_jds.py` takes a posting URL and saves the body; with no
URL there is nothing to fetch. And the JD archive is the one thing in this folder that cannot be
recovered later: two of the owner's postings 404'd within five days of applying — Trustpilot on
day 1, Showpad on day 5 — and those two bodies are gone for good. 80 of the current 102 rows have
a saved body **because a link existed when the row was created.**

So "the inbox replaces Simplify" trades a **complete list of what you applied to** for an
**incomplete record of each thing you applied to**. Both halves matter and they are not the same
half. This ticket implements the owner's decision; it does not pretend the trade is free.

## The shape that keeps both, for the proposal to argue about

Recommended: **the inbox creates the row, and a link enriches it when there is one.**

- `check_mail.py` stops only listing the unmatched confirmations and starts offering to create
  them — company, title where the message has it, applied date from the message, ATS from the
  sending domain. That is strictly more than the tracker has today for those rows.
- A row created this way is marked as **link-less**, visibly, because a row with no link can
  never have a JD and the page should say so rather than leave a blank column.
- When the owner does have the link — they are on the confirmation page anyway, seconds after
  applying — `add_job.py <link>` still does everything it does today, including the archive. One
  command, unchanged, and the mail path is the safety net for the times they do not run it.

The alternative the owner may prefer, and which this ticket should not decide alone: drop the
link and the JD archive entirely, and accept that a closed posting is unreadable afterwards.

## What done looks like

- `check_mail.py` prints the unmatched confirmations with a one-command way to add each.
- Adding one writes company, title (or an explicit unknown), applied date and ATS, with the
  message as provenance in the note — the same shape the eight hand-added rows carry.
- A created row states that it has no link and therefore no archived description.
- Running it twice does not create the row twice — the key has to be stable without a URL, which
  means `"公司名|职位名"` and a title that is missing is a real problem, not a formatting one.
- Simplify's CSV path keeps working untouched. Nothing about this removes it; the owner stops
  using it by stopping, not by the code forgetting how.
- The folder's README says which half comes from where, because after this there are two sources
  and the next person to read it will otherwise guess.

## Open, for the proposal

1. **Does a link-less row still get created when the title is unknown?** Four of eight were.
   A row called `HPE — 职位名待补` is honest but ugly; a row silently skipped is worse.
2. **What happens to the 4 existing rows with no title** — leave, or go back to the ATS and fill
   them in by hand once.
3. **Whether `archive_jds.py` should try the employer's careers search** for a title it has no
   link for. Recommend no: guessing which posting a title refers to is how the wrong JD gets
   filed under the right company, and a wrong JD is worse than none.
