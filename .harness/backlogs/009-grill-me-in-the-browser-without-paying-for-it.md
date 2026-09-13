---
id: 009
title: Grill me inside the dashboard, on a path that costs nothing to run
status: open
origin: User request 2026-09-12, made while approving ticket 008 — "后期我还是希望有免费的
  api，或者任何不花钱的方法，解决能在 dashboard 中 grill me 的问题". The gap it closes is the
  one 008 knowingly ships with. Also the ticket the archived `2026-09-09-coach-console`
  proposal promised ("browser-based grilling… separately ticketed") and nobody ever opened.
---

## The gap

The web coach can plan, but it cannot grade. `POST /coach/grade` is fed by the local
AceLeetcode bridge over a personal token; the page itself offers a copyable
`Grill me on LC N` and nothing more.

Grade is the only input that advances `ease`, `interval_days`, `due` and `state`
(`lib/db/src/schema/coach.ts`). So for anyone without a local install, the spaced-repetition
half of the product never starts. Ticket 008 ships practice open to every signed-in user
with that gap present and disclosed. This ticket is what closes it.

## The part that is not about money

The obvious reading is "find a free model API". That is the smaller half.

The larger half is why the browser has no grading control today, and it is not an
oversight. `artifacts/landing/src/pages/Coach.tsx` says it plainly: *"Grading is
deliberately absent from this page: grades come from the grilling session, never from a
browser control — self-grading is exactly what this system exists to prevent."* The value
of a `pass` is that something adversarial produced it. A free API that hands the user a
button which writes `pass` is not a cheaper version of grilling — it is the thing the
system was built to refuse, wearing grilling's clothes.

So a proposal here has to answer two questions, and the second is the one that decides
whether this ships:

1. What runs the grilling without a bill.
2. What makes the resulting grade worth the same as one from a local session.

If an option answers 1 beautifully and cannot answer 2, it is not a candidate.

## Directions worth pricing out

Not a decision — the shape of the search, so whoever picks this up does not start cold.

- **Bring your own key.** The user pastes their own provider key; the server never pays.
  Costs nothing to operate and the grilling is genuinely adversarial. Hands every user a
  setup step, and puts a secret in the database that has to be stored like one.
- **A free tier fronted by the server.** Simplest for the user, and the one that has to
  answer what happens when the quota runs out mid-grilling, and who absorbs the
  rate limit when more than one person practices at once.
- **In-browser model.** No bill, no key, no server round trip. Whether anything runnable in
  a browser today can grill hard enough to produce a grade worth trusting is the open
  question, and the honest answer may be no.
- **Asynchronous grading.** The browser collects the session and the grade lands later from
  something the owner runs. Keeps integrity, costs the user immediacy.

## What done looks like

- A signed-in user with no local install can complete a grilling and receive a grade that
  moves their schedule.
- A grade produced this way is **indistinguishable in trustworthiness** from one produced
  locally, and the proposal says why — not "we assume", but what structurally prevents the
  user from awarding it to themselves.
- Whatever it costs to run is stated as a number, including at the point where more than
  one person is grilling at once.
- Failure is honest: when the path is unavailable (quota gone, key missing, model refuses),
  the page says the grilling did not happen rather than recording a grade.
- The zero-data copy shipped by 008 stops being the permanent state of affairs for new
  users.

## Notes

1. **Sequenced after 008, not blocked by it.** 008 is the shell and the open gate; this is
   the content that makes the open gate worth walking through. They touch different files.
2. **Routing is an open question.** The grilling logic itself lives in AceLeetcode. If this
   turns out to need that logic rather than a fresh web-side implementation, it becomes a
   cross-repo feature — one ticket per repo, cross-linked with `counterpart:`, each shipping
   through its own `/implement` (workspace router). Settle that at pickup before proposing.
3. **Nothing here goes near the extension's secrets.** `STATS_TOKEN`, `POSTINGS_TOKEN` and
   the coach's own tokens are three separate things for three separate blast radii
   (`replit.md`, Architecture decisions). A model key is a fourth, not a reuse of any.
