---
id: 011
title: One way in, and for now it is Google — the page the whole funnel starts at
status: open
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
- **The address-and-password area is present and says it is not on yet.** Not deleted: nine
  identities already hold passwords, and a page that never mentions passwords gives them
  nothing to recognise when it is switched on.
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
- **LinkedIn and Apple are in the picture and are not in this ticket.** Owner's words: Google
  only, for now. Drawing three buttons and wiring one is a page that lies about what it can
  do; drawing one is a page that is honest and has room to grow.
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
