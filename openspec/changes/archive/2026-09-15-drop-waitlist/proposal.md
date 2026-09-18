# Proposal — drop-waitlist

## Why

Origin: `.harness/backlogs/013-take-the-mailing-list-off-the-home-page.md`
(owner statement 2026-09-15, "我觉得这个功能可以关掉了", then "我觉得这个功能就没人用过，除了我自己").

The home page ends with a mailing-list sign-up: a heading, two lines of copy, an email
box, and a "Keep me posted" button. It works — verified 2026-09-15 end to end, the live
endpoint validates input and a local submit returns 201 and switches the form to "You're
on the list".

Nobody has ever used it. `select count(*) from waitlist` against the production database
(`Postgres-EBWW` in the Railway project, not `Postgres`, which is the extension's)
returned **0 rows** on 2026-09-15 — not one address, including the owner's own. Nothing
reads the table back either: not the growth dashboard, not the account, not the
extension. It is a write-only table with nothing in it, fronted by the last section a
visitor sees before they leave.

So this is not "a feature we are switching off while we decide". There is no data to
keep, no list to migrate, and no consumer to notify. The honest size is to remove it
down to the table.

## What Changes

- **The home page's last section becomes the Chrome call to action alone.** The heading,
  both paragraphs and the email box go. "Or add it to Chrome now — it is free" stays and
  becomes the section, rather than a footnote under a form. Ticket 004 is about handing
  people the extension; this is the page's closing hand-off and it is the part that was
  always worth keeping.
- **`WaitlistForm.tsx` is deleted**, and with it `WaitlistForm.test.tsx`.
- **`POST /api/waitlist` is deleted** — the route file, its mount in `routes/index.ts`,
  and the `/waitlist` path, the `waitlist` tag and the `WaitlistInput` / `WaitlistEntry`
  schemas in `lib/api-spec/openapi.yaml`, with codegen in the same task.
- **The `waitlist` table leaves the schema** — `lib/db/src/schema/waitlist.ts` deleted
  and its export dropped from `schema/index.ts`.
- **The production table is dropped by hand, by the owner, after the deploy.** See
  "What the owner does, not the change" below. This is the one step no task can take.
- **The web test suite keeps a test that runs a generated mutation hook for real**, by
  adding `Login.test.tsx` before `WaitlistForm.test.tsx` is deleted. See Reversals.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

**None, and that is worth stating.** No file under `openspec/specs/` mentions the
waitlist. The home page has no capability spec at all — `coach-page`, `jobs-page`,
`dashboard-shell` and the coach specs cover everything behind the login and the job
feed, and the marketing page has never been specified. So removing an entire section of
it, an API path and a table changes no requirement anywhere.

Two consequences, both deliberate:

- This change ships **no spec delta**. It declares `skip_specs: true` in its
  `.openspec.yaml`, which is the validator's own way of saying so — `openspec validate`
  passes on that declaration and archive skips the sync without a flag.
- The gap is not this change's to fill. Writing a `home-page` capability spec on the way
  out of a feature would mean specifying a page in order to describe deleting part of
  it. If the home page should be specified, that is a ticket.

## Reversals

`openspec/config.yaml` requires a change that reverses a recorded decision to name it.
One.

**`openspec/changes/archive/2026-09-12-dashboard-shell/tasks.md`, task 2.2** — the
waitlist form's test was chosen, four days ago, as the proof that the web test runner
works: "a component rendering under the query client, a generated mutation hook running
for real, and a user event… If this file passes, the harness works." Deleting the form
deletes that proof.

It moves rather than disappears. `Login.tsx` has the same shape — a form under the query
client driving two generated mutation hooks, `useLogIn` and `useRegister`, through the
custom fetch mutator — and unlike the waitlist form it is shipping something the product
depends on. `Login.test.tsx` lands **before** the waitlist test is deleted, so there is
no commit in which the harness has no proof.

## Non-goals

- **The rest of the home page.** Every other section, claim and count stays exactly as
  it is. This change touches the last section and nothing above it.
- **The Chrome Web Store link and `lib/links.ts`.** Unchanged, and still the page's
  closing action.
- **Any other route, table or contract path.** `auth`, `stats`, `jobs`, `coach` and
  their schemas are untouched. The `ErrorResponse` schema stays — thirty other responses
  reference it.
- **The `AuthStore` seam.** One doc comment inside `lib/auth/store.ts` points at
  `routes/waitlist.ts` as the counter-example of a route that reaches for `db` directly;
  the comment is reworded because the file it names will not exist. No interface, no
  implementation, no test changes.
- **Collecting emails some other way.** Not a replacement, not a redirect to a form
  elsewhere, no "we will bring it back". If the owner wants a mailing list later it is a
  new decision with a new reason, not this one restored.
- **A `home-page` capability spec.** See Capabilities.
- **Any change to how the production schema is deployed.** This change does not
  introduce a migration tool or a deploy step; it asks the owner for one SQL statement.

## Seams crossed

- **The `openapi.yaml` contract.** A path, a tag and two schemas are removed, and codegen
  must run in the same task — nothing else regenerates `lib/api-client-react/src/generated`
  and `lib/api-zod/src/generated`.
- **`lib/db/src/schema/`, the DB schema source of truth.** One table leaves it. This is
  on `CLAUDE.md`'s not-trivial list, which is why the change flow applies at all to what
  is otherwise a deletion.
- **The production database**, which no seam in this repo reaches and no test can touch.
  Named here because that is exactly why the last step is the owner's.

## What the owner does, not the change

After the API deploy that removes the route, one statement in the psql session the
ticket describes (`railway link` → service `bingo_website`, then
`railway connect Postgres-EBWW`):

```sql
drop table waitlist;
```

**Not `pnpm --filter @workspace/db run push`.** `replit.md` marks push as dev-only, and
against production it would reconcile the *entire* schema, not this one table — any
drift between the schema files and the live database becomes a change nobody asked for,
in the same command. One `drop table` is surgical, reversible in the sense that matters
(the table is empty, so nothing is lost), and readable in a shell history.

**Order matters.** Deploy first, drop second. Between the two the table is an orphan
that nothing writes to, which is harmless. The other order leaves a live route inserting
into a table that no longer exists.

## Impact

- `artifacts/landing`: `src/pages/Home.tsx`; delete `src/components/WaitlistForm.tsx` and
  `src/components/WaitlistForm.test.tsx`; new `src/pages/Home.test.tsx` and
  `src/pages/Login.test.tsx`.
- `artifacts/api-server`: `src/routes/index.ts`, a comment in `src/lib/auth/store.ts`;
  delete `src/routes/waitlist.ts`; new `src/routes/index.test.ts`.
- `lib/api-spec/openapi.yaml` + codegen: one path, one tag, two schemas.
- `lib/db`: delete `src/schema/waitlist.ts`, drop one export from `src/schema/index.ts`.
- `replit.md`: three places — the schema line, the auth-store decision that cites the
  waitlist route, and the feature description under what the site is.
- No new dependency, no new environment variable, and one production SQL statement run
  by the owner.
