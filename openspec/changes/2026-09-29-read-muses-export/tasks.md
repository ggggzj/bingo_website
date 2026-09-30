# Tasks — read-muses-export

## 1. One key, and it is the same key

- [x] 1.1 Fix `norm_url` in `scripts/import_simplify.py` to fold case across the whole key, not
      only the Workday tenant. **Wider than this task said**: the key is stored in four places
      and all four had to move together — see design.md's correction. `1-fold-source-key-case.sql`
      carries the account's half and excludes `|` keys, which is the mistake that cost twelve
      duplicate rows before it was found. Proven by a case pair that is one posting:
      `…/Careers_GM/job/…AV-Launch_JR-202618994` and `…/careers_gm/job/…AV-Launch_JR-202618994`
      must produce one key.
- [x] 1.2 A test file beside the script (`test_import_simplify.py`, stdlib `unittest`, the shape
      `test_mail_match.py` already uses) pinning the normaliser on the real link shapes in the
      owner's data: Workday with and without `/en-US`, Ashby both ways, Greenhouse `gh_jid`,
      LinkedIn search-result links, and a `/jobTasks/completed/application` confirmation page.

## 2. Read the export

- [x] 2.1 `scripts/import_muse.py <导出.xlsx>` reads the seven columns with `openpyxl` (already
      installed) and writes rows into `data/raw/manual_applications.csv` — the file
      `add_job.py` already owns and `import_simplify.py` already reads. No new pipeline.
- [x] 2.2 Provenance carries the Req number and the 备注 verbatim: *经她明确批准提交* is a fact
      about consent that exists nowhere else.
- [x] 2.3 Running it twice adds nothing the second time.

## 3. Placing a row, and refusing to guess

- [x] 3.1 A Muse row whose key matches an existing row updates it and does not duplicate.
- [x] 3.2 A Muse row for a company that has **exactly one link-less row** adopts that row —
      the row keeps its id, its status, its note and its trail, and gains the link and the real
      title. Proven on the pair that caused this: link-less `HPE · 职位名待补` plus Muse's HPE
      row ends as one row with a link.
- [x] 3.3 A Muse row that could belong to more than one existing row is **printed, not merged**,
      with what it matched on and what it collided with. Proven on the open RELX case.
- [x] 3.4 A Muse row matching nothing is added, as today.

## 4. Say what changed

- [x] 4.1 The folder's README gains the line that names three sources and what each answers:
      Muse — what I applied to; the mailbox (`027`) — what happened to it; `add_job.py` — a link
      in hand right now.
- [x] 4.2 `.harness/backlogs/029` to built, and the `norm_url` fix recorded where the next
      person will meet it.

## Known limit, written down rather than discovered later

`same_company` compares word by word, so it does not know that RELX owns LexisNexis. The three
link-less `Software Engineer 1` rows — RELX, LexisNexis Risk Solutions, LexisNexis Legal &
Professional, all dated 09-22 — look like three companies to it, so Muse's RELX row adopts the
RELX one. **That may be the wrong one**, and no rule in the data can tell: brand ownership is
not in it. The adopted row carries its provenance, so it is visible and reversible.
Pinned by `test_sibling_brands_are_not_recognised`, which asserts the current behaviour and
explains why it is a choice rather than an oversight.
