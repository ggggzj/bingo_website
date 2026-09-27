# Design — the-applications-i-already-sent

## Three tables, and why not one

The owner's folder already splits its data in two files for one stated reason: *重新导入不会
冲掉你积累的东西*. `applications.js` is machine-generated and rewritten wholesale; `overrides.js`
is hand-written and never touched by a script. This change carries that boundary across rather
than re-deciding it.

**One table with an import that only names the machine columns would work** and was considered.
It is rejected because the guarantee would then live in an UPSERT's `SET` clause — one column
added carelessly later and the hand-written half is gone. Two tables make the guarantee
structural: the import's SQL cannot name a column in a table it never mentions.

| Table | Owner | Contents |
|---|---|---|
| `applications` | the import | `id` (serial), `source_key` (unique), company, role, location, `locations_all`, region, url, ats, applied/saved dates, `job_type`, `csv_notes`, `dup_count`, `jd_markdown`, `imported_at` |
| `application_status` | the account | `application_id` (pk → applications), status, stage, note, `updated_at` |
| `application_events` | append-only | `application_id`, `at`, `hand` (`browser` \| `script` \| `import`), what changed, the previous value |

All three cascade from `users` the way every `coach_*` table already does — the rows are the
owner's, and deleting the account deletes them by cascade rather than by application code.

**`jd_markdown` is a column, not a fourth table.** 632 KB across 80 rows is ~8 KB each, and
Postgres moves values that size out of line automatically (TOAST), so a list query that does not
name the column does not pay for it. A separate table would buy nothing and add a join.

## The key is load-bearing, and it is not ours

`source_key` is the folder's own key: a normalised apply URL, or `"公司名|职位名"` where there is
no link, or a synthetic `workday:…` / `ashby:…` token. `import_simplify.py` already strips
`?embed=true`, `/application` and `/confirmation` so the same posting from two sources collapses
to one row. **Reuse that normalisation; do not write a second one.** All 18 override keys match
an application today — a divergent normalisation does not announce itself as a conflict, it
produces a row whose history has quietly detached.

`id` in `applications.js` is not a key: it reaches 103 across 94 rows. `dup_count` records how
many CSV rows collapsed into one. Neither is a primary key here.

## Why the import is not an endpoint

An HTTP import would need the script on the laptop to prove who it is — a fourth secret living in
a folder on a personal machine. That is `.harness/backlogs/025`, written and deliberately not
scheduled. Until then the import connects to the database directly: the same path `018`'s change
used for its SQL and `replit.md` documents for a schema change.

**This is not the same as needing no credential, and an earlier draft of this change said so
wrongly.** A connection string is a credential, and a far broader one than the scoped token `025`
describes: that token could only write three fields of the owner's own rows, while this reads and
writes every table in the database, `users` and `sessions` included. Two things make it the right
choice here anyway, and both are worth stating rather than assuming:

- It **already exists**. The owner reaches that database today (`railway connect Postgres`, CLI
  installed on this machine), so this change introduces no new way in and no new secret to rotate.
- It is **used by a human, on demand**, not held by a long-running process. Nothing stores it for
  an agent to use unattended — which is precisely what `025` would change, and precisely why `025`
  should be a narrow token rather than this.

The consequence, stated so it is not discovered: **the account's machine half is as old as the
last time the owner ran the import.** A posting applied to this morning is not there until then.
That is why the header carries `imported_at` rather than leaving an empty week to read as a quiet
week.

## Two hands, one row

After `025` there will be two writers — the browser and a script — and `application_events.hand`
is what makes a wrong status explainable six weeks later. The column exists from day one, with
`browser` and `import` as its only values now, because adding it later means the trail has a
blind period exactly where the confusion starts.

Last-write-wins is the honest rule at one user, provided the trail shows both. No merge logic.

## Seams this crosses

- **`lib/api-spec/openapi.yaml`** — the API contract. Codegen runs in the same task that edits it;
  nothing else regenerates the frontend hooks.
- **The owner gate (`OWNER_EMAIL`)** — configuration, not a column. A non-owner gets 404, never
  403, matching `routes/new-grad.ts`.
- **The session seam** — routes read the session the way the existing ones do; no new auth path.
- **`lib/db/src/schema/`** — this repo owns these tables' DDL even though they live in
  h1_checker's database. `generate`, read the SQL, apply through `railway connect`. There is no
  `push`.
