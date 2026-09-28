---
id: 027
title: Read the owner's inbox for what happened to an application — theirs only, and it never decides
status: picked-up — proposal written 2026-09-27, awaiting the owner's approval **and an app
  password**. Nothing is implemented; group 1 cannot start without a mailbox.
change: openspec/changes/2026-09-27-what-the-inbox-already-knows/
origin: Owner request 2026-09-27 — "自动读取我的 email 信息，然后显示是否有 next step 或者是被
  拒绝了". Asked after seeing the account's applications view, and asked knowing `017` had already
  ruled inbox reading out; the owner's addition is the part that changes the answer —
  **"我个人层面可以做"**.
depends-on: .harness/backlogs/025 — without it this ends at "here are three emails, go and click",
  which is still useful but is two tools. With it the loop closes where it does today.
related: .harness/backlogs/017 — ruled this out **for the product**, and that ruling stands. See
  "Why 017's no is not this ticket's no".
routing: written here rather than in a repo of its own because the folder
  (`~/Desktop/job_dashboard`) is not a git repo and its counterpart write path (`025`) is this
  repo's. The code this describes runs on the owner's machine, not on the server.
grounded: 2026-09-27 — counted off the owner's own `overrides.js`, not estimated.
---

## What the owner is doing by hand today

Of the **18** hand-written rows in `data/overrides.js`, **12 came out of an email**. Their own
words are still in them:

> `2026-09-23 拒信：identified other candidates who are better aligned to the job requirements。`
> **这条 Simplify 里没记录，是从邮件里发现的。**

> `拒信原文：this particular position doesn't offer visa sponsorship。`

> `拒信原文：not able to support work authorization sponsorship。`

By stage, those 18 rows are: 简历被拒 7 · 拒信 · eligibility requirements 3 · 拒信 · 不提供
sponsorship 2 · 岗位已下架 2 · 岗位取消 1 · other 3.

So the owner is the parser. They read the mail, decide what it means, and paste it into a
session so Claude writes it down. This ticket is about the first half of that only.

**And one thing worth noticing before anything is built.** Five of those fifteen rejections are
sponsorship refusals — two saying so outright, three phrased as "eligibility requirements" which
the owner annotated themselves as 实质是工作许可. That is this product's entire thesis arriving as
ground truth in one person's inbox. It is **n=5 and one candidate**, so it is an observation, not
a data source; recorded here because the next person to notice it will otherwise think it is new.

## Why 017's no is not this ticket's no

`017` rejected inbox reading and gave the reason (`:54`):

> `gmail.readonly` is a **restricted** scope: Google verification plus an annual third-party
> security assessment — out of reach, **rejected, not deferred**

Every word of that holds **for the product**: reading every user's mail means Google's review and
a yearly paid security assessment. It stays rejected and this ticket does not reopen it.

None of it applies to one person reading their own mail on their own laptop, because nothing is
published and no user but the owner exists. Two routes, both real:

| Route | What it costs | What it costs later |
|---|---|---|
| **App password + IMAP** | 2FA on, generate an app password, store it in the folder | nothing — it keeps working |
| **OAuth in testing mode** | a Google Cloud project, the owner as a test user | the refresh token expires every 7 days, so re-authorising becomes a chore |

Recommend the first. It is the boring one, and the thing that makes this fail in practice is
friction, not capability.

## The hard part is not access

Reading mail is a library call. Deciding what a message *means* is the whole job, and it is where
this can do damage:

- A rejection, a recruiter's mass mailing, an automated receipt ("we have received your
  application"), an interview invitation and a job-alert advert all arrive from the same domains
  and often from `no-reply@`.
- Marking a row `closed` from a message that was not a rejection loses something real: the owner
  stops chasing a company that never actually answered.

So the rule this ticket is built on, which is the same rule `017` set and the same one the
applications view already follows:

**It surfaces candidates. It never decides.** The output is "these 3 messages look like they are
about applications you sent" with the sender, the subject and a quote — and the owner (or Claude,
reading it with them) says what it is. No automatic status change, no confidence score, no
"likely rejected".

Matching should be by things that are checkable: the employer's name, the domain of the apply
link already stored on the row, the ATS's own sending domains (`greenhouse.io`, `ashbyhq.com`,
`myworkday.com`), and the posting's own title. Not by tone.

## Privacy, since this is a mailbox

- **Read-only, and local.** The mail is read on the owner's machine. Message bodies are not sent
  to the account, not stored in the database, and not carried into this repo.
- What may reach the account is what the owner decides: a status, a stage, a note they chose to
  keep — which is exactly what they type by hand today.
- The credential lives in the folder's `account.env` neighbourhood and never in git. The folder is
  not a git repo today, which is a reason to be deliberate rather than a reason to relax.
- **Not the whole inbox.** Search a window (say 60 days) and only for messages matching an
  employer this account has applied to. A tool that reads everything is a different tool.

## Where a candidate message lands — owner, 2026-09-27

The applications view collapses each row's stage and note until the row is clicked (that change
went in the same day, because 76 of 94 rows had nothing written and the empty boxes were noise).
**That expanded row is this ticket's landing spot**, and the owner named it as such.

So the shape this should aim at: the script finds a message that looks like it is about an
application, and the row for that application opens with the message beside the two fields the
owner is about to fill — sender, date, subject, and the sentence that matched. The owner reads
it and types, or picks a status, and what gets stored is what they decided.

That keeps the rule intact rather than bending it. The message is **shown next to** the fields;
it never fills them. A rejection and an automated "we have received your application" look alike
to a matcher, and a row closed from the wrong one costs the owner a company they stop chasing.

It also means this ticket does not need a page of its own. One more thing in a row that already
opens is a smaller surface than an inbox view, and the owner is already looking at the row when
they care.

## What done looks like

- One command in the folder — `python3 scripts/check_mail.py` — that prints the messages from the
  last N days that match an application, each with sender, date, subject and the sentence that
  matched, and does nothing else.
- Nothing is written anywhere by that command. Writing is the owner's next step, by hand or
  through `025`.
- A message it cannot place is listed as unplaced rather than dropped, so the owner can see what
  the matcher is missing.
- Run twice, it says the same thing: it does not "consume" messages or keep a hidden read marker
  that makes the second run empty.
- The credential is read from a file the folder does not commit, and a missing credential prints
  one line and exits cleanly — the same rule `push_to_account.py` follows.
- Tested on saved sample messages, not on the live mailbox: a test that needs the owner's inbox
  is a test nobody else can run and one that changes every day.

## Open, for the proposal

1. **App password or OAuth** — recommended above, but it is the owner's Google account.
2. **Which mailbox.** `christineguo610@gmail.com` is where the account lives; the USC address
   expires at the end of 2026 and may be where some of these were sent.
3. **How far back**, and whether it re-reads messages it has seen.
4. **Does it ever write?** Recommended no for v1, even after `025` lands — the whole value is
   that a human read the message.
5. **What happens to the five sponsorship refusals.** They are evidence about employers, and this
   product is about employers who sponsor. Whether one candidate's rejection letters are ever
   allowed near the product's own data is a question for the owner and `GROWTH_PLAN.md`, not a
   thing to decide inside a mail script.
