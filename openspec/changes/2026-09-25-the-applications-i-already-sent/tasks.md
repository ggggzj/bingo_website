# Tasks — the-applications-i-already-sent

Each group leaves the system working end to end. Close each one with the `replit.md` working
loop before starting the next — ticking the box without the loop is not done.

The contract tests below run against the scratch Postgres named by `COACH_TEST_DATABASE_URL`,
the way `drizzle-store.contract.test.ts` already does. `.harness/session-todos/2026-09-22-…`
says whether one is still running on 127.0.0.1:55432 and how to recreate it.

## 1. The tables exist, and the folder's 94 rows are in them

- [x] 1.1 Add `lib/db/src/schema/applications.ts` — `applications`, `application_status`,
      `application_events`, all cascading from `users`, per design.md. Export from `index.ts`.
- [x] 1.2 `pnpm --filter @workspace/db run generate`, read the emitted SQL, and record the exact
      statements in this change directory as `1-create-the-application-tables.sql`. **Do not run
      it against production in this task** — applying is the owner's step, the way `018` did it.
- [x] 1.3 Write the reader for the folder's data files in
      `artifacts/api-server/src/lib/applications/folder.ts`: `window.JOB_DATA`,
      `window.JOB_OVERRIDES`, `window.JOB_ARCHIVE` are **JavaScript, not JSON** — comments and
      trailing commas included. Reuse the folder's own key normalisation; do not invent a second.
      Proven by `folder.test.ts` against **fixtures committed in this repo**
      (`src/lib/applications/fixtures/`), covering the shapes that actually bite: a comment header,
      a trailing comma, a `"公司名|职位名"` key, a `workday:` key, and a URL carrying `?embed=true`.
      **Not against the owner's live folder, and this reverses the first draft of this task.**
      Asserting "94 applications" would fail the next morning the owner applies to a job, and a
      test that reads `~/Desktop/job_dashboard` fails anywhere that folder is absent. The real
      folder is checked **once, by hand, and reported** — a live count is evidence, not an
      assertion.
- [x] 1.4 Write the import in `artifacts/api-server/src/lib/applications/import.ts` — upsert the
      machine half by `source_key`, insert the 18 hand-written rows once as the seed of
      `application_status`, attach the 80 JD bodies. Proven by `import.contract.test.ts`
      against the same fixtures: one row per application, a `jd_markdown` wherever the archive has
      one, a status row per override, and **running it twice yields the same count, not double**.
- [x] 1.5 Append the push to `~/Desktop/job_dashboard/scripts/add_job.py` — a third entry in the
      loop that already runs 导入 then 归档 JD, so applying to a job stays one command. It reads the
      database URL from the folder's own config and, when there is none, **prints one line and
      carries on** — the folder is documented as offline-capable and a missing account must never
      fail an application that was already recorded locally. This is the one file this change edits
      outside the repo; the other two scripts stay untouched. Proven by running it with the config
      absent and then present, and checking the row lands once.

## 2. The server answers with them

- [ ] 2.1 Add `GET /applications` to `lib/api-spec/openapi.yaml` and **run codegen in this same
      task** (`pnpm --filter @workspace/api-spec run codegen`). Generated files are never
      hand-edited.
- [ ] 2.2 Add `artifacts/api-server/src/routes/applications.ts` — list the owner's rows with their
      status, stage, note and whether a JD exists; never the JD body itself. Owner-only through
      `OWNER_EMAIL`, **404 for everyone else**, the uniform answer `routes/new-grad.ts` gives.
      Proven by `applications.test.ts`: the owner sees 94; a signed-in non-owner gets 404; no
      session gets 404; the response carries no `jd_markdown`.

## 3. The rail lists it, and the page says how old it is

- [ ] 3.1 Add the fourth entry to `artifacts/landing/src/pages/dashboard/views.tsx` —
      `id: "applications"`, label `Applications`, after New grad, `entitled: (viewer) =>
      viewer.isOwner`. Proven by `Shell.test.tsx`: the owner's rail lists four views, a
      signed-in non-owner's lists one.
- [ ] 3.2 Add `artifacts/landing/src/pages/dashboard/Applications.tsx` — the table (company, role,
      location, ATS, status, stage, applied date, days waiting, apply link), the status counts,
      and a header stating **when the import last ran**. Proven by `Applications.test.tsx` through
      MSW: 94 rows render, the counts match, the header shows the import date, and the empty state
      says what fills it.

## 4. The browser changes the human half, and nothing is overwritten

- [ ] 4.1 Add `PATCH /applications/{id}` to `openapi.yaml` and **run codegen in this same task**.
- [ ] 4.2 Extend `routes/applications.ts` — write status, stage and note, and **append to
      `application_events` in the same transaction** with `hand: "browser"` and the previous
      value. Proven in `applications.test.ts`: a move applied → interviewing → closed leaves three
      trail rows and all three previous values readable; a non-owner gets 404.
- [ ] 4.3 Add the editing control to `Applications.tsx`. Proven in `Applications.test.tsx`: a
      status change posts once and the row shows the new value after the refetch.

## 5. A second import cannot touch what the browser wrote

- [ ] 5.1 The test this whole change exists for, in `import.contract.test.ts`: import, change a
      status and a note through the store, import again — **the change is still there**, and the
      machine half did refresh. Extend the importer only if this fails.

## 6. The archived JD opens from a row

- [ ] 6.1 Add `GET /applications/{id}/jd` to `openapi.yaml` and **run codegen in this same task**.
- [ ] 6.2 Serve the body from `routes/applications.ts`, owner-only, 404 otherwise. Proven in
      `applications.test.ts`: a row with an archive returns its markdown; a row without returns
      404; a non-owner returns 404 for both.
- [ ] 6.3 Open it from the row in `Applications.tsx`; a row with no archive says so rather than
      offering a dead control. Proven in `Applications.test.tsx`.

## 7. Say what changed

- [ ] 7.1 Update `replit.md`: the three tables and who owns which half, the import and how the
      owner runs it, the fourth view, and the fact that the machine half is as old as the last
      import. Append the two-tables-not-one decision to "Architecture decisions" with the option
      that was rejected.
- [ ] 7.2 Set `.harness/backlogs/024` to `status: built` with a pointer to this change, and write
      a session-todo for the folder's own `dashboard.html` — after cutover it must stop showing a
      status it no longer owns.
