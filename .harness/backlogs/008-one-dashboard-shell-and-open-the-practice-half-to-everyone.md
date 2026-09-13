---
id: 008
title: One dashboard shell behind the login, with practice open to every signed-in user
status: open
origin: User request 2026-09-12. Stated as "growth 的 dashboard 和 aceleetcode 的 dashboard
  塞进我的 account 中，这两个功能都归到 dashboard 这个总的功能中", then refined across the
  same conversation: the shell is for every signed-in user, growth stays owner-only, and
  practice opens to everyone with each person starting from their own empty state.
  Reference form supplied by the user: a left navigation rail with the content beside it,
  not a dropdown.
---

## What this is

Today the logged-in area is **two privileged dashboards sitting side by side**. After this,
it is **one shell** whose navigation lists whichever views the viewer may use.

- `/account` keeps one job: who you are, and signing out.
- `/dashboard` becomes the shell — a left rail, the selected view beside it.
- The rail holds Growth (owner only, unchanged) and Practice (every signed-in user).
- `/coach` redirects into the shell. Existing links and bookmarks keep working.

The user's reason for the shell, in their own words, is what it is **for later**: they
intend to put more things in a signed-in user's own dashboard. The rail is the thing that
makes the next feature a registration rather than a new top-level route.

## Why "everyone can practice" is smaller than it sounds

The coach's data is already per-user and already cascades with the account.
`lib/db/src/schema/coach.ts` keys `coach_reviews`, `coach_daily_log`, `coach_config` and
`coach_api_tokens` on `user_id`; only the NeetCode 150 bank (`coach_problems`) is global,
and it holds no user data. A user with no config row gets defaults rather than an error —
`artifacts/api-server/src/lib/coach/drizzle-store.ts:226` returns `defaults` when the
select finds nothing.

So "everyone gets their own, starting from zero" needs **no schema change and no
migration**. Zero state is zero rows.

What actually stands in the way is one predicate in two places:

- `artifacts/api-server/src/lib/coach/auth.ts:57` — `coachGate`, in front of every
  `/api/coach/*` route
- `artifacts/api-server/src/routes/coach.ts:187` — `POST /coach/token`, deliberately in
  front of that gate so a stolen bearer token cannot mint its own successor

Both read `isCoachUser(email)`. Opening practice means changing what those two ask for.
The 404-not-403 stance is not what is being reversed and must survive.

## What this reverses, by name

`openspec/config.yaml` requires a proposal to name a reversed decision rather than quietly
contradict it. Three:

1. **`openspec/specs/coach-page/spec.md:90`** — "The logged-in area is a console over both
   dashboards… each dashboard the viewer may use as its own entry", with a scenario
   asserting **two distinct entries**. Replaced by one shell with a switcher.
2. **`openspec/specs/coach-page/spec.md:12`** — "The page hides itself from non-allowlisted
   visitors", and the header's Coach link appearing only for them
   (`artifacts/landing/src/components/SiteHeader.tsx`). Once practice is open to every
   signed-in user there is no non-allowlisted signed-in visitor left to hide from.
3. **`artifacts/landing/src/pages/Account.tsx:14`** — "so they are separate entries rather
   than tabs of one thing." The reason given there (the two answer different questions) is
   still true; the user has decided the shell is worth more than the separation.

None of these is being dropped by accident. Each needs a line in the proposal saying what
replaced it.

## What done looks like

- `/account` shows identity and sign-out, plus one entry into the dashboard.
- `/dashboard` renders a rail listing only the views this viewer may use, and the selected
  view beside it. `/coach` redirects to `/dashboard/practice` rather than 404ing.
- The site header sends a signed-in visitor to the dashboard instead of offering "Log in".
- Growth appears for `OWNER_EMAIL` only. Practice appears for any signed-in user.
- A viewer with exactly one available view gets that view without a switcher control — a
  one-item picker is dead UI.
- Two people signed in at once see only their own practice rows. This is already how the
  queries work (`id` comes from the session, never a URL parameter) and the change must not
  introduce any path that takes a user id from the caller.
- **A user with no history sees what will fill the page, not empty panels.** The coach-page
  spec already requires this (`spec.md:107`, "Fresh account sees intent, not empty boxes").
  This change promotes it from an edge case to the first thing every new user meets — see
  the honesty section below.
- `artifacts/landing` gains a test runner and the behaviors above are tested, not eyeballed.

## The honesty problem this change inherits

Grades do not come from the browser. `artifacts/landing/src/pages/Coach.tsx` states the
reason: *"Grading is deliberately absent from this page: grades come from the grilling
session, never from a browser control — self-grading is exactly what this system exists to
prevent."* Grades arrive at `POST /coach/grade` from the local AceLeetcode bridge,
authenticated with a personal token the user issues on the page.

Grade is the only input that moves `ease`, `interval_days`, `due` and `state`. So a person
who signs up and has no local install gets today's problems, a solved checkbox, and a
copyable `Grill me on LC N` — and never a review, never a knowledge gap, never a pattern
strength number. For them it is a daily two-problem list, not a spaced-repetition system.

**Decision already taken by the user (2026-09-12): ship it open, and have the page say so.**
Not a badge on the rail entry, and not a delay — the zero-data state itself explains that
the system moves when grilling happens locally. What is out of bounds is closing the gap by
adding a browser grading control; that is the one thing the design exists to prevent.

The real fix is ticket 009. This ticket must not pretend to be it.

## Decisions taken 2026-09-12

Settled with the user before the proposal, so `/pickup` does not re-open them.

1. **`COACH_EMAILS` is deleted, not repurposed.** It gates nothing once practice is open.
   Remove `coachEmails()` and `isCoachUser()` from
   `artifacts/api-server/src/lib/auth/coach.ts`, both call sites, the env row in
   `replit.md`, and the variable from deploy config.

   Keeping it as a kill switch was considered and rejected, for a reason worth leaving on
   record so nobody re-adds it: the semantics would **invert**. Today an unset
   `COACH_EMAILS` means *nobody may practice* — stated in that file's own comment and
   relied on as a safety property. A kill-switch version makes that same empty value mean
   *everybody may practice*, so restoring an old deploy config would silently open the
   coach. If a kill switch is ever wanted it must be a differently-named variable whose
   default points the safe way.

2. **A view is a path segment**: `/dashboard/growth`, `/dashboard/practice`. Not a query
   parameter, and not component state. Each view is linkable, survives a refresh, and gets
   its own history entry; `/coach` redirects to `/dashboard/practice`.

3. **The switcher is a left rail**, per the reference the user supplied. The earlier
   "dropdown" phrasing is superseded — confirmed with the user rather than assumed. A rail
   still reads at six items; a dropdown does not, and six is where this is heading.

4. **The site header links to the dashboard when signed in.** `SiteHeader.tsx` currently
   renders "Log in" unconditionally — a signed-in user on the home page is still invited to
   log in — and a "Coach" link only for allowlisted users. After this: "Dashboard" when
   signed in, "Log in" when not, no separate Coach link. Fixing the unconditional "Log in"
   belongs here because this change is what makes it visibly wrong.

## Notes

1. **Testing is part of this ticket, not a precondition someone else meets.**
   `artifacts/landing` has no test runner at all — no vitest, no Testing Library, no `test`
   script in its `package.json`. Every test in this repo lives in `api-server` or
   `coach-engine`. The user chose (2026-09-12) to add vitest + RTL here rather than verify
   by hand. Permission-dependent rendering is exactly the kind of thing that silently
   regresses, and this shell is going to keep growing.
2. **`tsx` must stay `catalog:`** when touching `artifacts/landing/package.json` — see the
   gotcha in `replit.md`. A second copy of it breaks other packages' typecheck with an
   unrelated-looking error.
3. **Every registered user will be able to mint a coach API token** once the gate opens.
   That is per-user, revocable, and already the design — but it is a consequence worth
   stating out loud rather than discovering.
4. This is a website-only change. AceLeetcode's local engine is untouched, so there is no
   counterpart ticket.
