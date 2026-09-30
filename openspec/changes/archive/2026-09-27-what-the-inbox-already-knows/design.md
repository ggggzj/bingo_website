# Design — what-the-inbox-already-knows

## Why the first task is a measurement

The obvious matcher — the company column against the message text — is measurably unusable:
62 of 82 company names are a single word and they include `Visa`, `Zoom`, `Arch`, `Apex`, `Zip`
and `Cox`. A rule built on that would surface a credit-card statement as a job rejection, and
this repo has already shipped and reverted one bug of exactly that shape (`f6fc12f`, the
Internship filter).

What might work instead is knowable but not yet known:

- **67 of 94 applications came through Greenhouse, Ashby or Workday**, whose notifications carry
  vendor fingerprints — a sending domain, a `List-Unsubscribe`, a `Message-ID` host. Whether the
  employer sends *through* the vendor's domain or their own varies by employer and by vendor,
  and the owner's mailbox is the only place that answer exists.
- **87 applications carry an apply link**, whose registrable domain may or may not be the domain
  the mail comes from.
- The posting's **title** is a stronger phrase than the company name, and often appears verbatim
  in the subject.

So group 1 reads the window, groups candidate messages next to the applications they might
belong to, and prints senders, subjects and matched phrases **for a human to read**. The rule is
written in group 2, against evidence, with the sample kept as a fixture.

Scoring or ranking is deliberately absent even from the measurement. The output is a list to
read, not an ordering to trust.

## Why IMAP and an app password

| | App password + IMAP | OAuth in testing mode |
|---|---|---|
| Google review | none | none |
| Setup | 2FA on, generate a password | a Cloud project, the owner as a test user |
| Lifetime | until revoked | **the refresh token expires every 7 days** |
| Code | `imaplib`, standard library | a dependency and a refresh flow |

The seven-day expiry is what settles it. A tool that needs re-authorising every week is a tool
that stops being run, and this one is already only as good as the habit around it.

The password goes in the folder's `account.env` neighbourhood, which is not a git repo and
already holds the applications token. It is revocable from the Google account, which is the
property that makes storing it acceptable — the same argument `025` made for its token.

## The rule this must not break

`017` says it and the applications view already enforces it: **the machine surfaces, the person
decides.** Concretely here — the script prints and exits. It holds no state, keeps no read
marker, and running it twice says the same thing, so nothing can be silently "consumed".

If a later version puts a message beside the two fields in an opened row, it goes *beside* them.
Pre-filling a note with a message the owner has not read would make the field's contents
something they did not write, which is the one property that makes those 18 rows worth keeping.

## Group 1's result, 2026-09-29 — the survey answered a bigger question than it was asked

The survey ran against `christineguo610@gmail.com`. It was written to discover *what identifies*
a message about an application. It discovered instead that **there are none in that mailbox.**

Measured, not inferred:

| | |
|---|---|
| Messages in that account since 2026-08-01 (All Mail) | **2,174** |
| From **any** ATS domain — Greenhouse, Ashby, Workday, Lever, iCIMS, BambooHR, Avature, Oracle, SmartRecruiters | **0** |
| Containing `identified other candidates` — the owner's own quoted rejection | **0** |
| Containing `visa sponsorship` | 1, a Simplify marketing email |
| Matches the wide survey did produce, over 14 days | 40, **all false** — 28 LinkedIn notifications, 5 Google security alerts, 3 Search Console, plus Notion, Kaggle and GitHub |

So the rejections quoted in `overrides.js` — `identified other candidates who are better aligned`,
`not able to support work authorization sponsorship` — were sent to the **USC address**, which
the owner had ruled out of scope two turns earlier on the reasonable assumption that the
applications were tied to the address the account signs in with. They are not.

**This makes the USC mailbox the one that matters, and it has an expiry date.** That address
stops working at the end of 2026 (`.harness/backlogs/023`, and the owner's own note). Every
rejection letter this feature exists to find is in a mailbox that is going away, which turns a
convenience into something with a deadline attached.

### What the false positives taught anyway

The wide net matched on "sender domain = the apply link's domain", and that rule is broken by
generic domains. Two applications have LinkedIn apply links, so **every LinkedIn notification
matched**; one has a `google.com` link, so **Search Console mail about bingocareer.com matched**.
A domain shared with a job board or a megacorp is not evidence about an application, and the
rule needs a denylist of those or needs dropping for anything but true ATS vendor domains.

That finding survives whichever mailbox is read next, so it is written down here rather than
re-derived.

## Group 1, second run, 2026-09-29 — the right mailbox, and the rule it handed over

The owner named a third address: `christineguo778@gmail.com`. It is a small, dedicated mailbox —
**273 messages in 60 days against 2,174 in the other one** — and it holds the mail this feature
exists to find, including the `identified other candidates` rejection quoted in `overrides.js`.

### The rule, which the mail wrote rather than we did

**Workday and iCIMS carry the join key in the sender's address.**

| Sender | Existing `source_key` |
|---|---|
| `visa@myworkday.com` | `workday:visa/Visa/…` |
| `cox@myworkday.com` | `workday:cox/Cox_External_Career_Site_1/…` |
| `pacificlife@myworkday.com` | `workday:pacificlife/PacificLifeCareers/…` |
| `ctg+autoreply@talent.icims.com` | the CTG application |

The local part before `@` (and before any `+`) **is the Workday tenant already stored in the
key**. That is an exact join, not a similarity — and it is what makes this feature possible at
all, given that 62 of 82 company names are single words like Visa and Zoom.

**Greenhouse, Ashby, Lever and BambooHR send from a shared no-reply address** —
`no-reply@us.greenhouse-mail.io`, `no-reply@ashbyhq.com`, `no-reply@hire.lever.co` — so the
sender identifies the vendor and nothing else. For those, **the company is in the subject**, and
in a consistent shape: `Thanks for applying to MintMCP!`, `Thank you for applying to Accordience
Group`. The rule there is to read the subject after "applying to", not to search for company
names inside it.

Note also that `greenhouse.io` never appears as a sender. The real domain is
`us.greenhouse-mail.io` (and `eu.` for the European one). A vendor list written from the vendor's
website would have missed every Greenhouse message.

### What the false positives cost, and the denylist they earned

Of 155 matches over 60 days, the wrong ones came from exactly three sources: `linkedin.com` (20),
`google.com` / `accounts.google.com` (24) and `glassdoor.com` (6) — all matched because an
application's apply link happens to live on that domain. **Apply-link-domain matching is dropped
for any domain that is a job board or a megacorp**; it stays only for an employer's own domain.

### The finding nobody asked for: the mailbox knows about applications the tracker does not

Four Workday tenants sent application confirmations with no matching row in the owner's 94:

- `adobe@myworkday.com` — *Thanks for Applying to Adobe*
- `aspentech@myworkday.com` — *Thank you for applying to AspenTech!*
- `cadence@myworkday.com` — *Application Received for Software Engineer (Circuit Analysis…)*
- `hpe@myworkday.com` — *Complete your application with Hewlett Packard Enterprise*

So the inbox is a **more complete record of what was applied to** than the folder is. That was
not what this ticket set out to do, and it is arguably worth more than what it did: a tracker
that is missing four applications cannot tell the owner what they are waiting on.

This does not change the rule that nothing is written automatically. It changes what the script
should print: alongside "here is mail about an application you have", **"here is mail about an
application you do not have"**.

## Group 2's result — the rule, and what it cost to get right

Written against the real mail, tested with 24 cases in `scripts/test_mail_match.py` that use the
actual senders and subjects. Four rules, in order of how much they can be trusted:

1. **The sender's local part is the join key** — `visa@myworkday.com` against
   `workday:visa/…`, `ctg+autoreply@talent.icims.com` against CTG. Exact.
2. **The sender's display name** — `Commure Talent Team`, `Notion's Recruiting Team`,
   `Applied Intuition - Job Board`. Set by the employer, and far steadier than the subject,
   whose shapes include `Update from Notion`, `Miter | Thank you for Applying!` and
   `MintMCP Application Update`. Team words are stripped; a display name that only names the
   vendor (`Greenhouse`, `no-reply`) matches nothing.
3. **The subject**, in the shapes actually seen: after "applying to", before or after a `|`,
   or the first word. Segments beginning with a sentence word are refused.
4. **The employer's own domain** against the apply link's, with the denylist.

Three bugs the tests caught, each of which would have failed silently in production:

- **The From header was parsed as an address.** `Visa People Team <visa@myworkday.com>` split
  into local `visa people team <visa`, so *every* rule missed. Nothing errored; matches were
  just always empty.
- **String prefixes matched across word boundaries.** `Arch` matched
  `Architecture Firm LLC`, which is `f6fc12f`'s Internship bug exactly. Comparison is now
  word-by-word.
- **A rule that fired and found nothing stopped the search.** A Workday sender for an
  application whose key is not a Workday key — Zoom's is `Zoom|Software Engineer`, recorded from
  an email — could never match. Rules now fall through.

### Result over the owner's real 60 days

| | |
|---|---|
| Messages read | 273 |
| About an application they have | **101** |
| From a recruiting system with no matching application | **15** |
| False positives from LinkedIn / Google / Glassdoor | **0** (155 → 0 once the denylist landed) |

The 15 are the finding, not the residue. Most are real applications the folder never recorded —
Adobe, AspenTech, Cadence, HPE, Acuity Brands, FiscalNote, Headlands Technologies, Netic — and a
few are name mismatches worth leaving unmatched rather than guessing at (`Nexthop Systems Inc`
against `Nexthop.ai`).
