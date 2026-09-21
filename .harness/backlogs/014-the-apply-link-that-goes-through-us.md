---
id: 014
title: The apply link that goes through us — /go/<job_id> redirects, counts, and later records
status: open
origin: ROADMAP.md 第一步 1 and 5 (owner decisions 2026-09-17): every apply link in the GitHub
  intern list and on /jobs passes through the site before the employer's page — a signed-in
  click lands in the tracker, a signed-out click is a redirect and a count. Simplify's list does
  exactly this: all 1,917 apply links in SimplifyJobs/Summer2027-Internships go through
  simplify.jobs/p/<id>?utm_source=GHList (counted 2026-09-17).
counterpart: ../h1_checker/.harness/backlogs/021-the-summer-2027-intern-list-on-github.md —
  the list that emits these links. It can launch with direct links and switch when this ships.
blocks: nothing on its own. The "record into the tracker" half waits for .harness/backlogs/017.
related: .harness/backlogs/021 (written 2026-09-20) — the /jobs login wall and the Summer 2027
  intern section. Counterparts in one repo, pushing on the same sentence from two sides: this
  ticket reads a session when one exists, 021 requires one. **This route must stay reachable
  without a session after that wall lands** — a signed-out click is the number 021's own
  decision is meant to be reviewed with, and the GitHub list links here for people who have
  not signed in. The intern section's rows are what these links will carry.
---

## What this is

One route, `GET /go/<job_id>`, that answers with a redirect to the posting's own apply URL —
and, on the way, does two small things:

1. **Counts the click**, with no identity: one row per posting per day, incremented. This is the
   only number that ever says how many people the GitHub list sends to the site (`ROADMAP.md`
   第三步), and it costs one table.
2. **Records the click on the person's tracker card** when there is a session — an "opened the
   application page at T" event, never a status change (`017`, decision 2). Until 017 exists
   this half does nothing, and the route must not wait for it.

Numbered 014 rather than 013: the `drop-waitlist` worktree's branch already carries a 013.

## What it must refuse

- **A URL that is not http or https.** The jobs-page spec already withholds unsafe links from the
  page ("an unsafe link is not rendered"); a redirect route is a stronger version of the same
  hazard, because a `javascript:` or `data:` URL from a third-party board would now be served by
  us. Same rule, enforced again here: anything else answers 404.
- **An id it does not know**: 404, not a redirect to `/jobs` — a wrong link should look wrong.
- **Anything in the query string beyond `utm_*` passthrough.** The route takes the posting's URL
  from the upstream record by id, never from the caller.

## Where the URL comes from

The site holds no postings; `/api/jobs` proxies `../h1_checker`'s `/api/postings` behind
`POSTINGS_TOKEN`. The route needs one posting by id. Either the upstream gains
`GET /api/postings/<id>` (one more allowlisted proxy call, same secret module), or the redirect
target is resolved through the existing list endpoint filtered to that id. The proposal picks;
the seam is the same `lib/jobs/` proxy the page already uses, and the secret stays in one module.

## What it reverses, by name

`openspec/specs/jobs-page/spec.md` — "Applying leaves for the employer". It still does; it now
leaves via us. The proposal cites the line and says why (the count, and later the tracker), per
`openspec/config.yaml`. And `replit.md`'s "`/jobs` is public and identity-free" is not reversed
by this ticket — a signed-out click stays identity-free — but the route reading a session when
one exists is the first thing on the jobs side that looks at one, and the proposal should say so.

## What done looks like

- `/go/<job_id>` for a known posting answers a 302 to its http(s) URL, with `utm_*` parameters
  carried through and nothing else.
- Unknown id → 404. Non-http(s) URL → 404. A hand-edited query string changes nothing.
- The click count for that posting and day goes up by one, whether or not anyone is signed in,
  and no personal data is written for a signed-out click — proven by a test that inspects what
  was stored.
- With a session, and once 011 exists, the person's card for that posting gains an open-event;
  before 011 exists the route behaves identically minus that write.
- The privacy policy (served by the extension's API, `GET /privacy`) gains one sentence: apply
  clicks through the site are counted; nothing identifying is kept for visitors who are not
  signed in. That sentence is a counterpart edit in `../h1_checker`, and it ships before the
  first README link points here.
- Tests: the real route against a fake upstream, the way `stats.ts` and `jobs.ts` are tested.

## Notes for whoever picks this up

1. **Ship before the README switches its links, not after.** A README link to a route that
   answers 404 is worse than a direct link. `../h1_checker/021` (the GitHub list — not this
   repo's `021`, which took that number on 2026-09-20) can launch with direct ATS links and flip
   in one generator change once this is live.
2. **Rate limiting.** The list can send a burst; the upstream proxy already limits per calling
   server. The redirect should not spend an upstream call per click if a cache of id → URL is
   cheap — a design call for the proposal, not a requirement.
3. **Do not add "clicked" as a tracker status.** It is an event on a card, and the card stays
   where the person put it (011, decision 2).
