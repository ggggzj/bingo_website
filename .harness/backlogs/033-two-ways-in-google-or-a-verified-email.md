---
id: 033
title: Two ways in — Google, or an email address the person has proved — and a way back when the password is forgotten
status: open
origin: The owner, 2026-10-02, looking at the new front door's sign-in panel in a local
  preview: "现在create和sign in我打算有两条路，一个是google登录和注册，一个是用自己的其他邮箱sign
  in和注册". Asked the follow-ups the same day and answered all three: "要验证邮箱，同一个邮箱
  算同一个人" and "需要有忘记密码这个功能". This **reverses the 2026-09-17 decision** recorded
  in `ROADMAP.md` (已经定了的事, 09-17: "网站只用 Google 登录… 登录页上只有 Google 一个按钮")
  and pulls `ROADMAP.md` 第二步 1.5 (忘记密码) forward into it.
counterpart: possibly `../h1_checker` — see "Where the mail comes from". Decided at pickup; if
  the answer needs a change there, it gets its own ticket there, cross-linked here.
grounded: 2026-10-02 — read against `artifacts/landing/src/components/auth/SignInPanel.tsx`,
  `artifacts/api-server/src/routes/auth.ts`, `lib/db/src/schema/auth.ts`, and
  `../h1_checker/main.py` (`/auth/signup`, `/auth/forgot-password`, `/auth/reset-password`),
  `../h1_checker/models.py` (`users`, `email_verifications`), `../h1_checker/mailer.py`.
---

**摘要:** 登录/注册改成两条路并排:Google 一键进;或者任意邮箱 + 密码,但邮箱必须验证过。同一个
邮箱不管走哪条路都是同一个账户。加上忘记密码。推翻 09-17 的"只用 Google"。

## What was asked for

On the sign-in panel (home page right column, and `/login`), both of these, visible to everyone:

1. **Google** — sign in, and on first use that is the sign-up.
2. **Any other email + password** — sign up and sign in, for people who do not want to use a
   Google account (school address, Outlook, QQ…).

Plus a **"Forgot password?"** that actually works.

## The three decisions, as the owner gave them

| Question | Answer |
|---|---|
| Does an email sign-up have to verify the address? | **Yes.** |
| Same address via Google and via password — one person or two? | **One person, one account.** |
| Forgot password? | **Required, in this ticket.** |
| What does verifying look like? | **A link in the mail; opening it is the whole proof.** The page it opens says the address is verified and sends the person back to sign in. (Owner, 2026-10-02: "在邮箱中发一个link，只要用户点进去，就算验证成功了。点进去，界面的大致内容就是，已经验证成功，返回界面登录账号 就OK") |

The last answer also fixes the order of an email sign-up: **create account → mail → open the
link → "verified" page → sign in.** Creating the account does not sign the person in.

Two edge cases proposed the same day and **agreed by the owner** ("同意", 2026-10-02): signing in
before opening the link is refused with the reason and a "resend" offer; a link opened a second
time or after it expired explains which, and offers a new one. Both are in the criteria below.

## What is here today, measured 2026-10-02

- **The panel draws Google only.** `SignInPanel.tsx:122` shows the email form only when the
  URL carries `?password=1` or when `VITE_GOOGLE_CLIENT_ID` is empty. With the client id set,
  a visitor sees one button and no form. The comment above `wantsPasswordForm` cites the 09-17
  decision this ticket reverses.
- **Google sign-in clears a password it collides with.** `routes/auth.ts` ~L258: a non-owner
  address that already has a `password_hash` gets it cleared, because "sign-up does not verify
  an address, so a password on this one may have been set by somebody else". That rule exists
  *because* passwords were unverified; once a verified password is possible it is wrong for
  that case (it would delete a proven owner's password).
- **The website cannot send mail.** No mail provider anywhere in `artifacts/api-server`.
- **One `users` table, shared with the extension** since 2026-09-21 (`018`, built). So any rule
  about "same address = same person" governs accounts the extension creates too.
- **Next door already has the whole email half, live.** `../h1_checker`: `mailer.py` (Resend,
  `RESEND_API_KEY` / `MAIL_FROM`), the `email_verifications` table (hashed token,
  `verified_at`), `POST /auth/forgot-password`, `GET /auth/reset`, `POST /auth/reset-password`.
  Its `forgot-password` already refuses to run without a provider rather than log a working
  credential.
- **But the extension's sign-up deliberately does not verify.** `POST /auth/signup`'s docstring:
  the address is UNVERIFIED and usable at once, because requiring the mailed link produced "two
  confirmed addresses in two months, both the owner's". So the same `users` table will hold
  verified and unverified passwords side by side, and "verified" has to be read from
  `email_verifications.verified_at`, not inferred from the presence of a password.

## Acceptance criteria

- [ ] The sign-in panel shows a Google button **and** an email/password area (sign in and create
      account) together, without `?password=1`. Still usable at 320px.
- [ ] Creating an account with email + password sends a verification mail and does **not**
      start a session; the panel says to check the inbox. Signing in with that password before
      the link is opened is refused with a message that says why (and offers to resend).
- [ ] The mailed link, opened once, marks the address verified. The page it lands on says so
      in one line and has one action: back to sign in. Opening it again, or after it expired,
      says what happened and offers a new link — never a bare error.
- [ ] One address = one account, whichever path came first:
      - password account, then Google with the same address → same account, signed in;
      - Google account (no password), then "create account" with the same address → it becomes
        that account's password only after the mailed link proves the address — never by
        typing it into a form alone.
- [ ] Google sign-in no longer clears a password on an address that `email_verifications`
      shows as verified. On an unverified one the current protection stays.
- [ ] "Forgot password?" on the panel: enter an address → a one-time link is mailed → the link
      sets a new password. The answer on screen is the same whether or not the address has an
      account.
- [ ] No mail provider configured → reset and verification fail closed with a clear message,
      never write a usable link to the log.
- [ ] Destinations after sign-in are one rule for both paths, or `023` is explicitly left open —
      the proposal says which.
- [ ] `ROADMAP.md` records the 2026-10-02 reversal in 已经定了的事 and moves 1.5 into 第一步/this
      ticket in 条目 → 票. **Not done when this ticket was written**: `ROADMAP.md` carried
      another session's uncommitted edits that day.

## Open for pickup (the proposal answers these; do not decide them in code)

1. **Unverified accounts the extension made.** A website sign-up cannot sign in until it
   verifies (settled above). An extension-created, unverified password account signing in on
   the website — allowed as today, or sent through the same link first? Put back to the owner.
   Also: how long the link lives.
2. **Where the mail comes from.** Call h1_checker's live routes from this server, or send from
   here against the same tables with this repo's own Resend key? The first adds a counterpart
   ticket there and a cross-service hop; the second duplicates a mailer and two token flows.
3. **The identities that hold passwords today** (`SignInPanel.tsx` says nine; not re-counted
   2026-10-02, and how many are verified was not measured) — do the unverified ones get a
   verify prompt, or are they left as the extension's unverified accounts are?
4. **Abuse.** Sign-up and reset now mail strangers; rate limits per address and per IP, and the
   sender domain's reputation.

## Not in this ticket

- The extension's own sign-up policy. If the website's rule and the extension's should become
  one rule, that is a decision for the owner and a ticket in `../h1_checker`.
- Account merging beyond "same address" (different addresses for the same human).
