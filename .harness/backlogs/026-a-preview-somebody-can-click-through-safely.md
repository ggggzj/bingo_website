---
id: 026
title: Make a preview deployment safe to click through, by serving it mocked data
status: open
origin: User request 2026-09-27, from a session asking whether this workspace could be
  worked on from Claude Code on the web. Cloud sessions have no browser, so visual review
  would be delegated to an outside reviewer that works from a URL. Checking what a preview
  URL actually serves surfaced the gap below. The reviewer has since agreed in writing to
  touch no forms on a preview until this ships — that agreement is the current mitigation,
  and it is a promise, not a guard.
---

## A preview is a new front end wired to the live database

Vercel Preview deployments are already running on this repo — most recent one checked
2026-09-22. They are genuinely useful: every PR gets a public URL, which is the only way
a reviewer without a checkout can see a change.

But `vercel.json` rewrites `/api/:path*` to `https://bingowebsite-production.up.railway.app`,
and there is one `vercel.json` for every environment. So a preview URL is the branch's front
end talking to **production**.

Two things follow, and the second is the one nobody expects.

**Anyone clicking through a preview writes real rows.** Ask a reviewer to "walk the signup
flow and tell me if it looks right" and they create a real account, with a real session, in
the real database. Nothing on the page says otherwise. The reviewer is behaving correctly;
the URL is lying to them.

**The preview is not showing what the branch built.** A branch that changes the API renders
its new front end against the *old deployed* API. The page looks fine, the reviewer reports
fine, and the thing being reviewed was never the thing that was built. Ticket 007 is the
same species of bug — an operator who cannot tell what they are actually pointed at.

## Why "just point the preview somewhere else" is not the fix

The same-origin rewrite is not laziness. It is the reason login works.

The session cookie is `sameSite: "lax"` (`artifacts/api-server/src/lib/auth/session.ts`),
so it does not ride a cross-site request. And the API mounts bare `cors()`
(`artifacts/api-server/src/app.ts`), which answers `Access-Control-Allow-Origin: *` — under
which no browser will send credentials at all. Move the API to another origin and the
symptom is a login that silently does nothing, which is precisely the failure CLAUDE.md
Rule 1 already warns about for the third port number.

`setBaseUrl()` exists in `lib/api-client-react/src/custom-fetch.ts` and looks like the
seam for this. Its own docstring says never to use it on web, for this reason. It is there
for Expo.

Pointing a preview at a *real* second API also means a second Postgres, which is the thing
Rule 1 exists to prevent. That is a bigger decision than this ticket, and it should not be
made as a side effect of wanting to look at a page.

## So: no API at all on a preview

Serve preview builds mocked responses in the browser. No production traffic, no second
database, no auth weakening, and the reviewer can click anything.

MSW is already a dependency here — `msw ^2.15.0` in `artifacts/landing`, used today only
as `setupServer` in `src/test/server.ts` for vitest. This ticket adds the browser half and
turns it on for preview builds only.

## What done looks like

- On a preview deployment, **no request reaches the production API**. Verified by looking,
  not assumed: the network panel on a preview shows the calls intercepted, and production
  logs show nothing arriving from it.
- **Production builds ship neither the worker nor the fixtures.** Checked against the built
  bundle, not against intent.
- **One set of fixtures**, shared with the vitest handlers. Two copies that drift is a worse
  state than today, because then the mock lies too.
- The preview **says on screen that it is sample data**, unmissably. Without that a reviewer
  files a fabricated number as a bug, and the next hour goes to chasing it.
- **Signed-out and signed-in are both reachable without a real login.** The dashboard is
  most of what there is to look at; a preview that can only show the logged-out home page
  has not solved the problem.
- **A reviewer can walk the signup flow**, get a plausible success screen, and write nothing
  anywhere.
- **The same fixtures produce the same screen on every deploy**, so two screenshots taken
  weeks apart differ only where the code did. This is not a side benefit — it is what makes
  visual regression possible at all, and it is the reason fake data is the *better* choice
  here rather than a compromise. (Reviewer's own point, 2026-09-27: real data changes every
  time and cannot be diffed.)
- Someone arriving cold can find, in `replit.md`, what turns the mock on and how to get a
  preview with the real API if that is ever needed.

## Do not

- **Do not touch `sameSite`, and do not add `credentials` or an origin allowlist to
  `cors()`.** Both are ways to make a cross-origin API work, and both weaken production
  auth to make a preview convenient. Anything in `lib/auth/` is a Rule 6 non-trivial change
  regardless of line count.
- **Do not remove the rewrite from `vercel.json`.** Production still needs it. This ticket
  adds a preview-only path; it does not replace the production one.
- **Do not gate the mock on `NODE_ENV`, or on Vite's `MODE`.** A Vercel preview build is a
  production-mode build — both read `production` there, so either gate ships the mock to
  real users. Gate on the deployment environment the platform reports.
- **Do not stand up a staging API or a second Postgres here.** If that is wanted it starts
  from Rule 1 and gets its own ticket.
- **Do not let the mock invent behavior the API does not have.** A fixture that returns a
  shape the server never returns produces a review of a product that does not exist.

## Notes

1. **If a real staging API ever happens**, the tool is `vercel.ts` — Vercel's TypeScript
   config, which executes at build time and can emit different rewrites per environment by
   reading `VERCEL_TARGET_ENV` (`VERCEL_ENV` reports custom environments as `preview`, so it
   is the wrong one to read). Recorded here so the next person does not spend the afternoon
   rediscovering that `vercel.json` cannot do it.
2. **This is one half of a two-part problem.** The other half is that `.claude/launch.json`
   is gitignored, so `preview_start` by name works in neither a fresh worktree nor a cloud
   session. Same underlying question — how does someone without this checkout look at the
   page — but a different fix, and not this ticket.
3. **The Chrome extension is out of scope and stays out.** It has no URL; verifying it means
   installing a build in a real browser. No amount of preview work reaches it.
4. **Until this ships**, the standing agreement holds: on a preview, static pages only, no
   forms, no signup. Worth deleting from here the day the mock lands, so it does not outlive
   its reason.
