# Tasks — jobs-page

Four groups, each leaving the site working end to end.

**How each group is proven.** `replit.md:51` records this repo's convention: *"Tests: Vitest
+ supertest (api-server only)"*. `artifacts/landing` has no test runner and no test
dependencies, by decision rather than by omission. So groups 1 and 2 carry Vitest tests, the
way `stats.ts` and `upstream.ts` already do, and groups 3 and 4 are proven in a real browser
against the real dev server: drive the page, read the DOM, check the console and the network
calls, capture a screenshot. Owner's call, 2026-09-11, after a first draft named six
frontend test files that could not run.

## 1. The contract

Leaves the system working: the route exists in the spec and in generated code; nothing
serves it yet.

- [x] 1.1 `lib/api-spec/openapi.yaml` — `GET /api/jobs`: the eight query parameters with
      their types and bounds (`design.md` §1), and a response of `total` plus an array of
      postings carrying job id, employer, title, url (nullable), location, remote, posted
      date, tier, certified-filing count, last active year, and the nullable `no_sponsor`.
      **Run codegen in this task** — nothing else regenerates the hooks and Zod schemas.

## 2. The proxy, gated and bounded

Leaves the system working: the site can fetch postings; no page shows them.

- [ ] 2.1 `artifacts/api-server/src/lib/jobs/upstream.ts` — the only place `POSTINGS_TOKEN`
      is read or sent, mirroring `lib/stats/upstream.ts`. Header not query string, because
      the value is a password. Fails loudly when the variable is unset rather than sending
      an empty token. Errors name the path and the status and never the token.
      *Proven by:* `upstream.test.ts::sends the secret as a header`,
      `::throws when the secret is unset`, `::never puts the token in an error`
- [ ] 2.2 `artifacts/api-server/src/routes/jobs.ts` — the route builds the upstream query
      itself from an allowlist, one entry per parameter, each named, typed, bounded and
      re-encoded. Anything unrecognised is dropped; an out-of-range value is dropped rather
      than rejected, per the `stats.ts` precedent.
      *Proven by:* `jobs.test.ts::forwards only allowlisted parameters`,
      `::drops an out-of-range limit`, `::drops an unknown parameter`,
      `::cannot be steered to another upstream path`
- [ ] 2.3 `artifacts/api-server/src/routes/jobs.ts` — text parameters are length-capped and
      URL-encoded before they reach the upstream URL, so a quote, an ampersand or a `#`
      cannot change which upstream path is requested.
      *Proven by:* `jobs.test.ts::encodes text parameters`,
      `::rejects oversized text`
- [ ] 2.4 `artifacts/api-server/src/app.ts` — mount the router under `/api`, beside the
      others. The real route against a fake upstream, the way `stats.ts` is tested.
      *Proven by:* `jobs.test.ts::serves a page through the mounted route`

## 3. The page

Leaves the system working: `/jobs` renders the feed.

- [ ] 3.1 `artifacts/landing/src/pages/Jobs.tsx` + `App.tsx` — the route, the split pane,
      and the site chrome it inherits. Left column of cards, right sticky detail pane.
      Stacks at 320px and never scrolls horizontally.
      *Proven in the browser:* the feed renders against the running dev server; at a 320px
      viewport the panes stack and `document.documentElement.scrollWidth` does not exceed the
      viewport width. Screenshot at both widths.
- [ ] 3.2 `artifacts/landing/src/pages/Jobs.tsx` — selecting a card swaps the detail pane
      without navigation and writes the posting's id into the URL, so a posting can be
      linked to and the back button behaves.
      *Proven in the browser:* clicking a card changes the detail pane and the address bar
      with no document navigation; reloading that URL opens the same posting.
- [ ] 3.3 `artifacts/landing/src/components/jobs/SponsorshipEvidence.tsx` — the employer's
      filing count and years, and separately the posting's own refusal. Never merged into
      one badge. `no_sponsor` null renders **nothing**, never "does not sponsor".
      *Proven in the browser:* with upstream seeded so one posting has a refusal, one has a
      null verdict and one has neither, the rendered DOM shows the filings and years on all
      three, the refusal only on the first, and **nothing** about refusal on the null one.
- [ ] 3.4 `artifacts/landing/src/pages/Jobs.tsx` — the apply button leaves for the
      employer's own posting. When upstream withheld the URL the card shows no apply link
      and no substitute. No `dangerouslySetInnerHTML` anywhere on this page.
      *Proven in the browser:* the apply control's href is the employer's URL; a posting
      served without a URL renders no apply link and no substitute. `grep` proves no
      `dangerouslySetInnerHTML` on this page.

## 4. The filter row, and saying what this page is

Leaves the system working: the feed can be narrowed, and the page states its own scope.

- [ ] 4.1 `artifacts/landing/src/components/jobs/FilterRow.tsx` — company, location text,
      posted-within, remote, and the sponsorship control, in the shape of the owner's
      reference image. The sponsorship control is a three-option dropdown, not a checkbox,
      because the data has three states.
      *Proven in the browser:* applying each control changes the list and the count together,
      and the network request carries the matching query parameter. The sponsorship control
      offers three options.
- [ ] 4.2 `artifacts/landing/src/components/jobs/FilterRow.tsx` — the seniority and category
      controls send title searches and set no label on any row. Picking "New grad" sends
      `title=new grad`; a posting titled "Sr. Solutions Architect" is absent from that
      search and carries no seniority badge anywhere.
      *Proven in the browser:* picking "New grad" issues a request carrying `title=new grad`
      and no seniority parameter; with a "Sr. Solutions Architect" posting seeded, it is
      absent from that result and no rendered row carries a seniority badge.
- [ ] 4.3 `artifacts/landing/src/pages/Jobs.tsx` — the page states what the feed covers and
      what it does not, and where the sponsorship evidence comes from. A requirement, not
      copy: it is what makes the coverage gap a stated scope rather than a defect.
      *Proven in the browser:* the rendered page text states the coverage limit and names the
      source of the filing data.
- [ ] 4.4 `replit.md` — record that `/jobs` now exists and what it does not cover, in the
      section the lifted instruction already lives in. Never a second document repeating an
      existing one.
