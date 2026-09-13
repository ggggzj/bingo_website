# Design — dashboard-shell

## 1. A view is a path segment

`/dashboard/growth`, `/dashboard/practice`. Not `?view=`, and not component state.

A view is a place, not a mode: it is linkable, it survives a refresh, and the back button
walks between views rather than out of the dashboard. Component state fails all three, and a
query parameter passes them while reading as a filter over one page rather than a choice
between pages.

`/dashboard` with no segment redirects to the first view in rail order this viewer may use —
growth for the owner, practice for everyone else. `/dashboard/<unknown>` does the same
rather than 404ing: a stale bookmark from a future rename should land somewhere useful.

`/coach` redirects to `/dashboard/practice`. It is kept rather than deleted because it is
the address in every existing bookmark and in the archived coach specs.

## 2. The registry is the extension point

One array declares the views. Each entry: an id (the path segment), a label, an icon, an
entitlement predicate over what `useAuth()` knows, and a component.

The rail renders the entries whose predicate passes. The router resolves a segment against
the same array. Nothing else enumerates views — adding the owner's next dashboard is one
entry, not a route plus a rail item plus a redirect that can disagree with each other.

This is the whole reason the shell exists. If a later feature needs a second place that
lists views, the registry has failed and the fix is to delete that place.

## 3. What an entitlement decides, and what it does not

`isOwner` comes from the server (`GET /api/auth/me`). `use-auth.ts` already states the
stance and it is unchanged here: *"`isOwner` here decides what to render, never what the
server will hand over."* The rail is a convenience, not a boundary.

So each view keeps its own server-side refusal:

- `/dashboard/growth` for a non-owner renders the ordinary not-found page, because
  `/api/stats/*` answers 404. Unchanged behavior, new address.
- `/dashboard/practice` needs only a session, which the shell already required.

**`useCoachAccess` loses its gate half.** It exists today to answer "may this browser use
the coach" by probing `GET /coach/plan` and reading success as yes. After this change every
signed-in user may, so the question is answered by `isSignedIn`. The query itself stays —
the practice entry shows today's progress and the view needs the plan anyway — but
`hasAccess` and `refused` go, and with them the last reason for a component to learn
entitlement by trying.

## 4. The chrome moves up

`Dashboard.tsx` and `Coach.tsx` each render their own sign-out control today, because each
was a destination. Under a shell there is one of everything: the shell owns the frame
(identity, sign-out, the rail) and a view renders only its own content.

`/account` keeps identity and sign-out too. That is deliberate duplication, not an
oversight: `/account` is where an ordinary user with no views lands, and it must still be
able to say who they are and let them leave.

## 5. One view is not a choice

A viewer entitled to exactly one view sees that view with no rail control at all — not a
rail with one item, and not a disabled picker. Today that is every signed-in non-owner, so
it is the common case, not the edge.

The shell still owns the frame in that case; only the switcher is absent.

## 6. Narrow screens

The rail becomes a row of view chips above the content below `md`. No hamburger, no drawer:
with two entries — and with the one-view case rendering nothing — a sheet would be more
chrome than content. Revisit when the registry holds four.

## 7. The zero state has to be true

The practice view's existing requirement is that empty panels explain what will fill them.
Opening practice to everyone promotes that copy from an edge case to the first thing every
new user reads, and it now has to carry one more fact: **the schedule advances when a
grilling grades you, and grilling runs locally today.**

Constraints on that copy:

- It states the dependency plainly. A new user should not tick five problems across a week
  before working out that nothing is being scheduled.
- It does not promise browser grilling is coming. Ticket 009 is unscheduled and may land on
  "no honest free path exists."
- It does not read as an error. Dealing today's problems is a real, working thing to do.

## 8. Testing: intercept the network, not the hooks

The api-server tests run the real routes, the real hashing and the real cookies against a
memory store — the repo's stated position is seams over mocks. The frontend equivalent is
to answer HTTP, not to replace the generated hooks: a test that stubs `useGetMe` proves the
component renders what the stub said, which is the one thing never in doubt.

**Decision: intercept at `fetch` with MSW.** Two endpoints matter (`/api/auth/me`,
`/api/coach/plan`), the generated hooks run for real, and the next person writing a frontend
test finds a standard rather than inventing a stub shape.

**Alternative considered:** a ~20-line `fetch` stub, no new dependency. Rejected for
precedent — this is the repo's first frontend test setup, and whatever it does becomes the
pattern. Put to the owner at pickup and confirmed 2026-09-12, dependency accepted; the
tests named in `tasks.md` are written the same way either way.

Setup: Vitest with the jsdom environment, Testing Library plus `jest-dom` matchers, scoped
to `artifacts/landing`. `tsx` stays `catalog:` — a second copy of it gives other packages
two incompatible sets of vite types and breaks their typecheck with an unrelated-looking
error (`replit.md`, Gotchas).
