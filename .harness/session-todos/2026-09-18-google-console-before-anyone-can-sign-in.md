---
title: Two Google console actions — until both are done, nobody can sign in, including the owner
status: open
origin: Task 5.2 of `openspec/changes/2026-09-18-one-way-in-and-it-is-google/tasks.md`, marked
  "Owner-run, not part of /implement". Its own text says it becomes a session todo rather than
  a tick if the change is archived first; the change is merged and this is that record.
---

**摘要:** 代码全都上线了，但 Google 后台两件事没做之前**谁都登不进去，包括你**。而且失败起来
像 bug，不像"还没配置"。

## The two, in the Google Cloud console

The client is the extension's existing one,
`1069740098250-jg66jfblauhtkk6hg497fuukbpqd9vdd` (owner's decision 2026-09-17: one client,
two origins).

1. **Authorized JavaScript origins** — add both:
   - `http://localhost:5273` (or `5173`, whichever port the dev server runs on)
   - `https://bingocareer.com`

   No redirect URI is needed. The ID-token flow returns the credential to the page's own
   JavaScript, which is why this change needs no client secret either.

2. **Move the app from Testing to Production.** While it is in Testing only listed test users
   can sign in. The three scopes this uses — `email`, `profile`, `openid` — are non-sensitive,
   so **no Google review stands between here and Production**; it is one switch.

## Then set the variable in two places

- `GOOGLE_CLIENT_ID` on the api-server (Railway), which is what `aud` is checked against.
- `VITE_GOOGLE_CLIENT_ID` at build time for the web app (Vercel) — same value.

They are one value in two places and drift is not silent: a mismatch fails every sign-in
immediately on `aud`. With `VITE_GOOGLE_CLIENT_ID` unset the page shows the email form instead
of a button that cannot work, so the site is never a dead end — but nobody signs in with
Google either.

## How to tell it worked

Open `/login`. One Google button, no password field. Sign in with a Google address that has
never been here; you should land on `/jobs` and `/account` should name that address. Your own
USC address still reaches the growth dashboard, and **your password still works** at
`/login?password=1` — the owner exemption exists so that stays true.

Delete this file once both are done.
