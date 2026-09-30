# Tasks — the-front-door-shows-the-jobs

Seven slices, ordered so each one leaves the site working: the narrowing exists and is tested
before a route calls it, the contract exists before a route claims to satisfy it, the route answers
before a page reads it, and the sign-in is one component before two places render it.

**One file, one group.** `lib/new-grad/titles.ts` is written in group 1 and never again;
`openapi.yaml` only in group 2, `routes/index.ts` only in group 3, `Login.tsx` only in group 4,
`Home.tsx` only in group 5, `SiteHeader.tsx` and `App.tsx` only in group 6, `replit.md` only in
group 7.

Baseline measured 2026-09-29, **on a working tree carrying uncommitted changes from an earlier
session** (`drizzle-store.ts`, `Login.tsx`, `lib/db/src/schema/auth.ts` and others) — re-measure
before starting rather than trusting these two lines:

- `pnpm --filter @workspace/landing run test` → **12 files, 64 passing**
- `pnpm --filter @workspace/api-server run test` → **18 files passed / 3 skipped, 204 passing / 31 skipped**

**Re-measured 2026-09-30 in a clean worktree, and the header above was indeed wrong** — it was
taken on a tree carrying an earlier session's uncommitted `Login.test.tsx` (+2 tests) and an
untracked `drizzle-store.contract.test.ts` (the third skipped file). The real baseline, and
where this change left it:

| | baseline | after |
|---|---|---|
| landing | 12 files, **62** passing | 14 files, **87** passing |
| api-server | 18 files / 2 skipped, **204** passing | 20 files / 2 skipped, **226** passing |
| `pnpm run typecheck` | clean | clean |

Nothing that passed before fails now. One existing test changed meaning rather than breaking:
`Shell.test.tsx`'s signed-out visitor lands on `/` instead of `/login`, which is the forward
6.4 blesses, and it now asserts the landing.

## 1. The intern net, and the one list it shares

- [x] 1.1 In `artifacts/api-server/src/lib/new-grad/titles.ts`, export the existing `SOFTWARE`
      patterns. Nothing else in the file changes. The comment above `EARLY_CAREER_TERMS` already
      gives the reason one list must not become two; add nothing that repeats it.
- [x] 1.2 New `artifacts/api-server/src/lib/internships/titles.ts`: `INTERN_TERMS` (the upstream
      queries, one per term) and `isSoftwareInternship(title)`, which imports `SOFTWARE` from 1.1
      rather than restating it, requires a word-boundary `intern` / `internship`, and applies the
      same seniority exclusions. Also `namesTargetSeason(title)` and `TARGET_SEASON` as a constant,
      not a literal — this page outlives one hiring cycle.
- [x] 1.3 New `artifacts/api-server/src/lib/internships/titles.test.ts` proves, at minimum:
      `Software Engineer Intern (Summer 2027)` is accepted and names the season;
      `International Program Manager` is **refused** (the word-boundary case the owner's own
      collection run was burned by); `Senior Software Engineer Intern` is refused;
      `Marketing Intern` is refused for having no software signal; `Data Engineer Intern` is
      accepted; and a title naming no season is accepted with `names_target_season` false.
- [x] 1.4 Same test file: one test that imports `SOFTWARE` and asserts
      `isSoftwareInternship` and `isEarlyCareerSoftware` agree on the software half for a shared
      fixture, so a pattern added to one cannot silently miss the other.

## 2. The contract, and the shape it does not duplicate

- [x] 2.1 `lib/api-spec/openapi.yaml`: add `GET /internships` and the schemas
      `InternshipPosting` (`allOf` the existing `JobPosting` plus `location_read`:
      `us` | `unknown` and `names_target_season`: boolean) and `InternshipList`
      (`total`, `postings`, `newest_posted_at`, `board_note`, `preview`). `total` is documented as
      **the count before the preview cut, in both answers**. `location_read` documents that
      `elsewhere` never appears and `unknown` means the string could not be read and SHALL be
      marked, not assumed American — the same three words the `NewGradPosting` schema already uses.
      **Run codegen in this task**, per `openspec/config.yaml`; nothing else regenerates the
      frontend hooks.
- [x] 2.2 Confirm the generated output changed and is not hand-edited: `lib/api-client-react` and
      `lib/api-zod` carry the new hook and schema, and `git diff --stat` on `src/generated` shows
      only generated churn.

## 3. The route, wired, answering two sizes

- [x] 3.1 New `artifacts/api-server/src/routes/internships.ts`. Public and session-aware: it takes
      an `AuthStore` and `UpstreamJobs`, fans `INTERN_TERMS` out to the upstream one term per
      request, merges and de-duplicates by `job_id`, drops `readLocation(...) === "elsewhere"`,
      drops anything `isSoftwareInternship` refuses, sorts season-first then newest-first, and
      returns the whole list with a session or the preview without one. Export `PREVIEW_ROWS` (8)
      and `PREVIEW_MAX_PER_EMPLOYER` (2) as constants the test imports. It writes nothing on either
      path.
- [x] 3.2 Wire it in `artifacts/api-server/src/routes/index.ts` beside the others, with a one-line
      comment saying what is unusual about it: **public, but the session changes the size of the
      answer rather than the existence of the route** — the opposite of the 404 the coach, new-grad
      and applications routes give a stranger.
- [x] 3.3 New `artifacts/api-server/src/routes/internships.test.ts`, the real route against a fake
      upstream and the memory auth store, the way `jobs.test.ts` and `new-grad.test.ts` are:
      a stranger gets at most `PREVIEW_ROWS` rows and the **full** `total`; a session gets every
      row and the same `total`; a Sydney row is absent from both; an `International` title is
      absent from both; an unreadable location is present and marked `unknown`; one employer with
      six matching rows contributes at most two to the preview and all six to the signed-in answer;
      `newest_posted_at` is the newest row actually returned; one term per intern term reaches the
      upstream, pinned by count; and **a test that asserts nothing was written on either path**.
- [x] 3.4 Same file: an upstream 502 answers 502 with the shared error shape and never leaks
      `POSTINGS_TOKEN` into the body or the message — the rule `lib/jobs/upstream` already holds
      and the one that costs most if it regresses.

## 4. The sign-in becomes one component

- [x] 4.1 Create `artifacts/landing/src/components/auth/SignInPanel.tsx` by moving the right half of
      `Login.tsx` into it: the Google control, the failure line, the `passwordCleared` toast, the
      `?password=1` form and the empty-client-id fallback. It takes where to go after a successful
      sign-in as a prop rather than hard-coding `/jobs`, because group 5 renders it on a page whose
      answer is "stay here".
- [x] 4.2 `Login.tsx` renders it and changes in no other way. **`Login.test.tsx` is not edited in
      this group** — its tests passing untouched is the whole evidence that the extraction was
      faithful, and a test edited in the same breath proves nothing. Note this file carries
      uncommitted changes from an earlier session; read it before moving anything.
- [x] 4.3 New `artifacts/landing/src/components/auth/SignInPanel.test.tsx` pins the three things a
      copy loses: `?password=1` reaches the password form, an empty client id shows the form
      instead of a dead end, and a cleared password produces the notice.

## 5. The front page

- [x] 5.1 Rewrite `artifacts/landing/src/pages/Home.tsx` as the front door. Above `lg`: two
      columns, the right one carrying `SignInPanel` and staying in view, the left one scrolling and
      carrying the internship block above the existing introduction. Below `lg`: one column,
      ordered what-this-is, Google control, extension link, the internship block, then the
      introduction. The left half must **not** inherit `hidden lg:flex` from `Login.tsx` — on a
      phone that class is what makes the current login page a button with no explanation.
- [x] 5.2 Same group, the block itself: rows rendered with the existing
      `@/components/jobs/SponsorshipEvidence`, imported rather than re-implemented, so the
      employer's filings and the posting's own refusal stay two claims that never merge and
      `no_sponsor: null` keeps meaning nobody has read it. A row marked `unknown` says its location
      could not be read. The block states the date of its newest row and the board note, and no
      copy anywhere on the page says live, daily or updated.
- [x] 5.3 Extend `artifacts/landing/src/pages/Home.test.tsx`: postings render for a signed-out
      visitor; the "N more, sign in" line names the number the response gave and is **absent** when
      the preview is the whole list; a signed-in visitor sees every row and no sign-in control; zero
      postings renders the board note and no empty frame; a failed load still renders the
      introduction and the sign-in; the newest date is on the page and the word "daily" is not; at
      320px the control and the extension link both precede the body of the introduction. **The two
      existing mailing-list tests must still pass** — `013` removed that section on 2026-09-15 and
      a rewrite is exactly how it comes back.
- [x] 5.4 Check every claim the moved copy makes against `../h1_checker` before it lands. The badge
      strings are the extension's own; `DATA_FACTS`' 72,135 is a database count and **stays away
      from the job rows**, because next to them it reads as "72,135 employers are hiring here".

## 6. The header stops pointing at sections, and the two redirects

- [x] 6.1 Delete `SECTIONS` from `artifacts/landing/src/components/SiteHeader.tsx`, its desktop and
      mobile rendering, and the comment above it about three items not fitting a 320px bar — it
      describes a bar that no longer has them. The conditional door stays. Extend
      `SiteHeader.test.tsx`: none of the four labels renders, desktop or mobile, and its existing
      tests keep passing.
- [x] 6.2 In `artifacts/landing/src/App.tsx`: `/login` sends everyone to `/` unless the query
      carries `password=1`, which still renders `Login`. **`/` does not redirect anybody** — a
      signed-in visitor stays and the block expands (owner, 2026-09-29). Any redirect here waits
      for `/auth/me` to settle first, the way `Account.tsx:27` and `Shell.tsx:42` already do.
- [x] 6.3 New `artifacts/landing/src/App.test.tsx`: `/login` lands on `/`; `/login?password=1`
      renders the form; a signed-in visitor at `/` **stays** at `/`; and one test that leaves
      `/auth/me` unresolved and asserts no navigation happened — without it this suite cannot fail
      the bug this group exists to prevent.
- [x] 6.4 Leave the four `navigate("/login")` callers alone (`Account.tsx:27` and `:77`,
      `Shell.tsx:45` and `:100`). They take one redirect hop and land right. Pointing them at `/`
      would save the hop and cost the single address that means "the way in".

## 7. Say what changed

- [x] 7.1 Append to `replit.md` "Architecture decisions": the front door now carries postings; a
      public route whose session changes the size of the answer rather than the existence of the
      route, and why that is not the 404 pattern; the preview cut and the per-employer cap with the
      measurement that forced it; filtering never labelling, inherited from the new-grad list; and
      the vintage rule with the number that made it necessary (newest row 2026-09-18, measured
      2026-09-29). `replit.md` carries uncommitted changes from an earlier session — re-read it
      before writing rather than appending to a stale copy.
- [x] 7.2 Run both suites and record the numbers against the baseline at the top of this file.
- [x] 7.3 Do **not** sync the `sign-in` delta into `openspec/specs/sign-in/`: that spec has no base
      there — it lives only inside the unarchived `2026-09-18-one-way-in-and-it-is-google`.
      Whoever archives this change reconciles both, or that one syncs first. `front-door` is a new
      capability and syncs normally.
- [x] 7.4 Close with the `replit.md` working loop, and say plainly in the reply that **the feed
      itself is stale** (newest row 2026-09-18) and that nothing should link to this page until
      `../h1_checker`'s ingest is running again —
      `.harness/session-todos/2026-09-29-the-public-job-feed-stopped-eleven-days-ago.md`.
