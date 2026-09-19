---
id: 011
title: One way in, and for now it is Google — the page the whole funnel starts at
status: picked-up
produced: openspec/changes/2026-09-18-one-way-in-and-it-is-google/ — proposal drafted
  2026-09-18, awaiting owner approval. Two of this ticket's recorded positions were reversed
  by the owner the same day and are cited in that proposal: the page carries Google only (the
  drawn-but-disabled password area is out), and this server verifies the token rather than
  posting it next door — this ticket's reason for the latter did not survive the schema, see
  the change's design.md §2. Supersedes the deleted openspec/changes/google-sign-in/, which
  was drafted against the archived ticket 015.
origin: Owner decision 2026-09-13, from thirteen screenshots of Simplify's onboarding —
  "我希望 welcome sign in/up 的界面是图一这样的（目前先只支持 google）". Two calls were
  settled at the same time and are recorded below: this lands on **this site**, not the
  extension's welcome tab; and the email-and-password area is drawn but only Google works.
counterpart: ../h1_checker/.harness/backlogs/010-turn-the-funnel-around.md — this replaces
  the first three arrows of that ticket's flow, and the mail in the middle of it
blocks: .harness/backlogs/012 entirely — nobody answers questions before signing in
grounded: 2026-09-13 — read against Login.tsx, the api-client, and h1_checker's deployed
  POST /auth/google.
---

## What was asked for

The split page: the product's case on the left with the logos it is trusted by, the way in
on the right — provider buttons stacked at the top, a separator, then the address and
password below them. Pressing the Google button reaches **Google's own account chooser**,
not something this repo drew.

## What is here today, measured

`artifacts/landing/src/pages/Login.tsx`, 187 lines: a centred card at `max-w-sm`, two tabs
(Sign in / Create account) over one form, address and password. It is not the shape above,
and that is the whole of the visual work.

**There is no Google sign-in anywhere in this repo.** Grepping for it returns the Chrome
icon beside the extension link in the header, the footer and `Home.tsx`, plus a fixture in a
coach test. Nothing that signs anybody in.

**But it exists next door, and it is live.** `POST /auth/google` in h1_checker shipped on
2026-09-13: it verifies the ID token against Google's published keys, passes the audience
**explicitly** (the check that is skipped silently when the argument is left off), and
refuses an address that already holds credentials. `GOOGLE_CLIENT_ID` is set on that
service. Production answers 401, not 404.

## The call this ticket exists to make

There are two ways to put a working Google button on this page, and they are not close:

**(a) Build Google here.** A second client id, a second verifier, a second place that can be
wrong about who somebody is. It also mints identities into **this** repo's database — the
one that `.harness/backlogs/010` and h1_checker's `015` exist to stop growing.

**(b) Post the token to h1_checker's `/auth/google`.** One verifier, one audience check, one
place an identity is created — and it is the database `015` decided survives. Costs a CORS
decision and a decision about where the cookie lands.

**(b) is recommended, and the reason is not effort.** Every identity this page creates in
this repo's database is a row somebody has to move by hand later. `015` measured that cost
at 157 rows and called moving them the cheaper side of a one-sided comparison. There is no
argument for adding to the pile while the plan is to empty it.

## What done looks like

- Somebody with a Google address signs in from this page in one press, and is never sent to
  their inbox — the delivery problem D-038 recorded is not worked around here, it is absent.
- The page is the shape above: the case on one side, the way in on the other.
- **The address-and-password area is present, drawn, and disabled.** Owner's decision
  2026-09-13: the fields cannot be focused or typed into, and one short line beside them says it
  is coming. **Not** a field that accepts typing and then refuses on submit — a box you can type
  in is a box you believe works, and being refused after typing reads as breakage rather than as
  "not built yet". Same for the LinkedIn and Apple controls.
  Not deleted either: nine identities already hold passwords, and a page that never mentions
  passwords gives them nothing to recognise when it is switched on.
- **Do not wire it to `/auth/login`, even though that would work.** The endpoint is live and those
  nine could sign in through it today — which makes this the cheapest line of code on the page and
  the wrong one. The owner removed the password path from the product on 2026-09-13
  (`../h1_checker/.harness/backlogs/015`); a working password box here quietly puts it back, and
  the rule it would need — how long, which characters — is exactly the argument that decision
  ended.
- The Google button is Google's own, rendered by Google's library. Nothing in this repo
  draws one — a hand-drawn Google button asking for a Google address is the shape of a
  phishing page even when the intent is honest.
- Whichever database ends up holding the identity, it is the one the job feed reads.

## Notes for whoever picks this up

- **`MIN_PASSWORD_LENGTH = 10` at `Login.tsx:24`.** The owner decided **8, with upper case,
  lower case and a symbol** on 2026-09-13 (h1_checker's `015`, which also records the
  argument against composition rules and the owner's reasons for overruling it). This page is
  where that disagreement physically lives and this ticket rewrites this page. Changing it
  here without h1_checker's copy only moves the disagreement — `015` says the number lives in
  one place and is read by three.
- **The page is the owner's screenshot, and the screenshot is the specification.** Split layout,
  the case and the trusted-by logos on the left, the way in on the right: provider buttons
  stacked, a separator reading "Or login with your email", then the address and password. Build
  that page. Google is the one that works on day one; LinkedIn, Apple and the password are drawn
  and not yet wired.
- **This is deliberately NOT the rule the extension's own surface follows.** There, a control that
  cannot be pressed is left out entirely, because that surface has room for exactly one thing and
  a dead button on it reads as breakage. Here the opposite holds: this is a full page somebody
  will come back to, the ways in that are coming are part of what it says about the product, and
  nine identities already hold passwords and need to see where they will type them. Two surfaces,
  two answers, and the difference is on purpose.
- **The extension does not need this page, and that was settled deliberately.** The first
  reading of h1_checker's `sign-in-through-a-window-chrome-owns` had it render a sign-in of its
  own, which would have been a second page to keep in step with this one. The owner chose
  otherwise on 2026-09-13: the window Chrome opens goes **straight to Google**, so no second
  sign-in is rendered anywhere and there is nothing here for it to drift from. The extension's
  own surface carries one Google control and nothing else — no provider list, no address box.
  **What must still agree between here and there is the rule, not the layout**: the same password
  rule, the same refusal for an address that already holds credentials, and Google's own control
  in both places rather than a drawn one.
- **This page is the only place the address-and-password path will ever exist.** Somebody with no
  Google address cannot sign in to the extension at all until this ships — accepted deliberately,
  because the path that exists for them today is a mailed link, and the mail is what 46 of 48
  people never opened.

---

## Folded in from ticket 015, 2026-09-18

A second session ticketed this same work on 2026-09-17 as `015-sign-in-with-google-and-nothing-else`,
not knowing this ticket existed, and drafted `openspec/changes/google-sign-in/` against it. That
ticket is archived and this one survives — it is older, it carries the thirteen screenshots as the
visual specification, and it was grounded against h1_checker's live `POST /auth/google` rather
than assuming greenfield. Three things from it are worth keeping, and are easy to lose in a
consolidation:

### 1. Two doors, one address — and the two doors prove different things

`POST /auth/register` is open and **does not verify the address**; that is why it reserves
`OWNER_EMAIL` (`routes/auth.ts:99`). So a password row on `alice@gmail.com` is a *claim* on that
address, possibly by somebody else. A Google sign-in on the same address is *proof* of it.

**Decided: proof wins.** The Google sign-in reaches the existing account and **clears its
password** — with **`OWNER_EMAIL` exempt**, because that password is the recovery path the owner
chose to keep, and without the exemption the first thing this ships in production is the deletion
of its own fallback. The person is told, on the page they land on, that the account now signs in
with Google.

Sessions already open on a cleared account are **not** revoked. Revoking is safer and is not this
change's call — it would sign the legitimate owner out of their other browser as a side effect of
signing in. Recorded as a known limit rather than decided quietly.

Email verification would dissolve this whole question — a mailed link proves exactly what Google
proves — and it is unavailable until the account merge, because this service cannot send mail at
all. See `ROADMAP.md` 第二步 1.5.

### 2. The null hash already lands safely, and needs a test rather than a fix

`routes/auth.ts:142` already reads:

```ts
const matched = await verifyPassword(parsed.data.password, user?.passwordHash ?? DECOY_HASH);
```

`??` catches `null` as readily as the missing user it was written for, so once ticket 010 makes
the column nullable, a password-less account is **already** refused with the same body and the
same scrypt cost as anyone else — the timing channel that comment closes stays closed, with no
code change.

Nothing in the code says that is deliberate, so the next refactor can remove it silently. It needs
a test: sign in against a password-less account, assert the same 401 body and that a hash was
still computed.

### 3. If the page ever hides the email form, the kept fallback still needs an address

Settled here as "drawn but disabled", so this does not bite today. Recorded because the question
came back twice on 2026-09-17: a fallback nobody can reach is not a fallback. If the form is ever
removed from the page rather than disabled, `/login?password=1` rendering it unlinked is the cheap
answer — and it is **not** a security boundary and must not be built as one.
