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
