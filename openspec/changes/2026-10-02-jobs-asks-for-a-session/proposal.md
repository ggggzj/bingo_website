# Proposal — 2026-10-02-jobs-asks-for-a-session

Origin: `.harness/backlogs/021` Part 1 (网站 021), from `ROADMAP.md` 第一步 5 —
"没登录的人打开 `/jobs` 会被送到首页". Part 2 of the same ticket is its own change,
`2026-10-02-the-summer-2027-section-on-jobs`; the two do not depend on each other.

## Why

The roadmap's funnel is "GitHub 上公开一部分把人引来，登录后的东西让人留下". Since 2026-10-02 the
front page shows a public cut of the internships and says "N more. Sign in to see the rest."
— but the whole feed is still one unauthenticated request away at `/jobs` and `GET /api/jobs`.
The sign-in the front page asks for buys nothing the visitor could not already see.

**Owner decisions, 2026-10-02** (asked at pickup, answered the same session):

| Question | Answer |
|---|---|
| How does `GET /api/jobs` refuse a caller with no session? | **401.** The route has been public since 2026-09-21 and is known to exist; the 404 rule (a 403 confirms a route exists) protects routes nobody has seen, and pretending this one is absent hides nothing. The page also needs to tell "not signed in" apart from "no such thing". |
| Ship the wall before `014`'s click count exists? | **Yes, now.** Accepted cost below. |
| One change with the intern section, or two? | **Two.** |

## What this reverses, by name

`openspec/config.yaml` requires naming every recorded decision a proposal reverses.

1. **`replit.md`, "`/jobs` is public and identity-free, and its secret is a third one."** The
   first half reverses. Its stated reason — *"The page reads no session and writes nothing,
   which is what kept the two-account-systems question out of shipping it"* — no longer binds:
   that question was settled when the site moved onto the surviving database (`018`, built
   2026-09-21), and in any case the session this wall reads is the one this site issues.
2. **`openspec/specs/jobs-page/spec.md`, Purpose:** *"Read-only and identity-free. No session
   is read…"* becomes "read-only, for a signed-in visitor".
3. **`routes/index.ts`, the comment on the `/jobs` mount:** *"Public and identity-free — no
   auth store, because it reads nothing about a user."* The router now takes the `AuthStore`
   seam; the comment must say why.

**What does not reverse, so it is not re-litigated:** `POSTINGS_TOKEN` stays separate from
`STATS_TOKEN` (the blast-radius reason holds); the proxy keeps building its own allowlist; the
route still writes nothing — the session is read to decide whether to answer and for nothing
else; nothing on the page starts classifying a posting. **The 2026-09-10 owner instruction
("解除禁令,网站 /jobs") is not undone**: the feed still ships on this site; what changes is who
may read it.

## What Changes

- **The server is the wall.** `GET /api/jobs` resolves the caller through the `AuthStore` seam
  (`currentUser`, as every gated route does). No live session → **401** with a one-line JSON
  error, returned **before** the upstream is called, so a stranger cannot make this server spend
  `POSTINGS_TOKEN` or its share of the upstream's per-server rate limit. A failure to *read* the
  session is a 500 logged with the error, not a 401 — "the database is down" must not tell a
  signed-in person they are signed out.
- **The page is courtesy.** `/jobs` waits for `useAuth`; a signed-out visitor is sent to `/`
  (the front door, `028`), a signed-in one sees the feed exactly as today. The jobs query is not
  fired until the visitor is known to be signed in, so a signed-out load makes no doomed request.
  Same split as `Shell.tsx`: the client decides what to render, the server decides what to hand
  over.
- **Contract.** `lib/api-spec/openapi.yaml` gains the 401 response on `GET /jobs`; codegen runs
  in the same task.
- **Docs say what is true.** The three places above are rewritten together, so none contradicts
  another.

## The accepted cost, stated now rather than discovered in October

`ROADMAP.md` 第三步 plans to 用这个数复核登录墙的决定 — GitHub → site → sign-in, a number that
comes from `014`'s apply-link counter. `014` is not built. **Between this wall shipping and
`014` shipping, nobody can measure how many people the wall turns away.** The owner chose to
ship the wall first. The funnel history in `ROADMAP.md` (60 emails → 5 passwords → 4 profiles)
says every wall loses people; this one's loss will be unmeasured until `014`.

## Constraints this leaves for others

- **`014`'s `/go/<job_id>` must stay open to a signed-out caller** — its first purpose is
  counting the people the GitHub list sends who have not signed in. It is not built, so this
  change cannot test it; `014`'s proposal must, and this change's spec says why.
- **`../h1_checker/.harness/backlogs/021` (插件 021, the GitHub list)** may say "sign in to see
  the rest" only once this ships — before, it would promise a sign-in that shows nothing new.

## Non-goals

- `014` (the apply redirect and its counter), and the privacy-policy sentence it owns.
- The Summer 2027 section (`2026-10-02-the-summer-2027-section-on-jobs`).
- Any change to who may sign in or how (`011` built; `033` open).
- `016`, a feed filtered to the person.
- A rate limit of this server's own (`.harness/session-todos/2026-09-30-the-api-server-has-no-rate-limit-of-its-own.md`).

## Impact

- `artifacts/api-server/src/routes/jobs.ts`, `routes/index.ts`, `routes/jobs.test.ts`
- `lib/api-spec/openapi.yaml` → generated client (codegen, never by hand)
- `artifacts/landing/src/pages/Jobs.tsx` (+ a new `Jobs.test.tsx`)
- `replit.md`, `openspec/specs/jobs-page/spec.md` (Purpose, via this change's delta)
