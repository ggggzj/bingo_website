# Tasks — what-the-inbox-already-knows

**Blocked until the owner creates a Google app password and says which mailbox.** No mailbox,
no group 1 — and group 1 is what the rest is built on.

## 1. Look before writing a rule

- [x] 1.1 `scripts/check_mail.py` in the folder — **written 2026-09-27, waiting on a password.**
      Verified as far as a mailbox-less machine allows: no credentials prints one line and exits
      zero; it reads all 94 applications; 75 of them have a company name long enough to match on
      and 87 carry a link domain. Two details that are not style — it selects the mailbox
      `readonly=True` and fetches with `BODY.PEEK`, so nothing is marked read; a survey that
      leaves footprints in a mailbox is not a survey.
      Original text of this task: connect over IMAP with the app
      password from `account.env`, read the last N days, and print every message whose sender
      domain or subject touches *anything* in the applications list — deliberately wide, because
      this run is for reading, not for filtering. For each: sender, date, subject, the phrase
      that touched, and which application it might belong to. Writes nothing.
- [x] 1.2 Ran 2026-09-29 against the gmail account. **The answer was that the mailbox is the
      wrong one**: 2,174 messages since August, zero from any ATS domain, zero containing the
      owner's own quoted rejection. Written up in `design.md` under "Group 1's result",
      including the one rule the false positives did kill. Blocked here until the owner
      decides about the USC mailbox.
      Original text: Read that output **with the owner** and write down, in `design.md`, what actually
      identifies a message about an application: which vendors send from their own domain,
      whether the posting title appears in subjects, what the rejections have in common, and —
      as importantly — what the false positives look like. Keep a de-identified sample as a
      fixture.

## 2. A rule that earned itself

- [ ] 2.1 Write the matcher from what 1.2 found, in `scripts/mail_match.py`, with the fixture
      from 1.2 as its test. **Not the company column** — 62 of 82 names are one word and include
      Visa, Zoom, Arch and Apex.
- [ ] 2.2 `check_mail.py` uses it: prints the matches, prints the unplaced separately so the
      owner can see what the rule is missing, and still writes nothing. Running it twice prints
      the same thing.
- [ ] 2.3 No app password configured: one line, exit zero — the rule `push_to_account.py` and
      `update_status.py` already follow.

## 3. Say what changed

- [ ] 3.1 The folder's README gains the daily line: what to run when you think something arrived.
- [ ] 3.2 `.harness/backlogs/027` to built, with what 1.2 measured recorded on it — the next
      person will otherwise re-derive it from the same mailbox.
