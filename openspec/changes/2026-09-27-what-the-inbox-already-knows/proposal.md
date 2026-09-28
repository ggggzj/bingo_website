# Proposal — what-the-inbox-already-knows

## Why

**12 of the 18 rows the owner has written by hand came out of an email**, and 15 of the 18 are
rejections. Their own words are still in them:

> `2026-09-23 拒信：identified other candidates who are better aligned to the job requirements。`
> **这条 Simplify 里没记录，是从邮件里发现的。**

So the owner is the parser today: they read the mail, decide what it means, and paste it into a
session. This change does the finding — and only the finding.

Origin: `.harness/backlogs/027`, owner request 2026-09-27 — *"自动读取我的 email 信息，然后显示
是否有 next step 或者是被拒绝了"* — with the clause that changes the answer: **"我个人层面可以做"**.

`017` rejected inbox reading **for the product** and that ruling stands: `gmail.readonly` is a
restricted scope needing Google's review and an annual third-party security assessment. None of
it applies to one person reading their own mail on their own laptop, because nothing is
published and there is no user but the owner.

## The measurement that decides the design

Taken from the owner's 94 live applications on 2026-09-27, before any matcher was written:

| | |
|---|---|
| Distinct companies | **82** across 94 applications |
| Applications with an apply link | 87 |
| Through an ATS whose sending domain is predictable | **67** — Workday 24, Greenhouse 23, Ashby 20 |
| **Company names that are a single word** | **62 of 82** |

The single-word names include `Visa`, `Zoom`, `Cox`, `CTG`, `AIG`, `Zip`, `RTX`, `Apex`, `Arch`,
`RELX`.

**So matching a message by company name is not a design, it is a bug waiting.** "Visa" is in
every card statement, "Zoom" in every meeting invite, "Arch" and "Apex" and "Zip" are ordinary
English words. This repo has already paid for exactly this class of error once: commit `f6fc12f`
removed the `/jobs` Internship filter because `intern` matched *International*, *Internal* and
*Database Internals*.

## What Changes

**Group 1 is a measurement, not a matcher**, and that is the point of this proposal. Nobody here
has yet looked at the *headers* of a single one of these rejections — only at the sentences the
owner quoted. What identifies a message as being about an application is a question with an
answer sitting in their mailbox, and writing a matcher before reading it would be guessing with
extra steps.

So: read a window of the owner's inbox, print what the candidate messages' senders and subjects
actually look like beside the applications they might belong to, and **decide the rule from that
before writing one**.

Then, with a rule that earned itself:

- `scripts/check_mail.py` in the folder — finds candidate messages and prints them. It writes
  nothing, anywhere.
- The owner reads them and acts, either in the browser or through `update_status.py`, which
  already exists.
- Later, and only if the rule proves itself: the message beside the two fields in the row that
  already opens (`.harness/backlogs/027`'s landing spot, owner's own suggestion).

Access is **IMAP with a Google app password**, not OAuth: no Google review, no seven-day token
expiry, and `imaplib` is in Python's standard library so the folder gains no dependency.

## What does not change

- **Nothing is written by this.** Not a status, not a note, not a "probably rejected". The
  script surfaces; the person decides. `017` already draws this line and the applications view
  already holds it with `status_source`.
- **The mailbox is read-only and local.** Message bodies do not reach the account, the database,
  or this repo.
- **Not the whole inbox.** A window of N days, and only messages that clear the rule.

## Non-goals

- **No classification as fact.** No "this is a rejection" stored anywhere, no confidence score,
  no automatic status change. A rejection and an automated "we have received your application"
  read alike to a matcher, and a row closed from the wrong one costs the owner a company they
  stop chasing.
- **Not for users.** `017`'s ruling stands; this is one person's laptop reading one person's mail.
- **No new page.** The row that already opens is where a message would eventually go.
- **No OAuth app, no Google verification, no stored refresh token.**
- **Not a rule invented from the company column**, for the reason measured above.

## Capabilities

**None, and that is not an omission.** Every line this change adds runs on the owner's machine,
in `~/Desktop/job_dashboard`, against their own mailbox. The website gains no route, no table,
no view and no spec — `update_status.py` and the applications view, which already exist, are
what a finding eventually flows into.

`.harness/backlogs/027` records why the change lives in this repo anyway: the folder is not a
git repo, and the write path it feeds (`025`) is this repo's.

## Settled by the owner, 2026-09-27

- **The mailbox is `christineguo610@gmail.com`** — the address the account itself signs in with.
  The USC address is not read. Anything sent from it that mattered is already in the 18
  hand-written rows, and that address expires at the end of 2026 anyway.
- **The window is 60 days.** The applications begin 2026-09-17, so this covers every one of
  them with room, and it bounds what is read: a tool that reads a whole mailbox is a different
  tool with a different conversation attached.

## Still blocking

**The app password.** It needs 2FA on the Google account, is generated by the owner, and never
passes through a session. No mailbox, no group 1 — and group 1 is what the rest is built on.

The script is written and waiting for it: it reads `MAIL_USER` and `MAIL_APP_PASSWORD` from the
folder's `account.env`, and with neither it prints one line and exits zero.
