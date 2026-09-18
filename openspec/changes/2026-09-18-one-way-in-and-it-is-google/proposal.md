# Proposal — one-way-in-and-it-is-google

## Why

Every way into an identity on this site runs through a typed password, and the funnel's own
numbers say that is where people stop. Measured next door, on the audience this product
shares: **48 verification mails, 2 opened; 60 addresses collected, 5 credentialed, 4 profiles
answered** (`../h1_checker/.harness/prd/email-capture-funnel.md`). Google returns an address it
has already proven, in one press, with no message to open — the delivery problem D-038 recorded
is not worked around here, it is absent.

The audience fits: international students, overwhelmingly on Gmail or a university Google
account. USC, the school on most rows in that repo's `user_profiles`, is Google Workspace.

Origin: `.harness/backlogs/011-one-way-in-and-it-is-google.md`, serving `ROADMAP.md` 第一步 3.
It blocks `.harness/backlogs/012` entirely — nobody answers onboarding questions before signing
in. Its predecessor `010` landed on 2026-09-18: `users.password_hash` is nullable in code and in
production, so the row this change creates is already legal.

## What Changes

- **`POST /api/auth/google`** — the page sends the ID token Google's button hands it; this
  server verifies it against Google's published keys and establishes the same session
  `POST /auth/login` does. **The page is never believed about who somebody is**: the address
  comes from verified claims, never from the request body.
- **`/login` becomes the split page**, and the only control on it is Google's own button.
- **Verification sits behind its own seam**, for the reason `AuthStore` exists: the suite runs
  the real route, the real cookie and the real session against memory, and must not reach
  Google to do it.
- **An address arriving through both doors resolves one way, and it is a security decision
  rather than a merge** — `design.md` §4.
- **`lib/api-spec/openapi.yaml`** gains the route, with codegen run in the same task.

## Two owner decisions taken 2026-09-18, both reversing something recorded

Named here because `openspec/config.yaml` requires a reversed decision to be cited rather than
quietly contradicted.

1. **The page carries Google and nothing else.** Ticket 011 records the owner's 2026-09-13
   decision, taken from thirteen screenshots: provider buttons stacked, a separator, then an
   address-and-password area *drawn but disabled*, so that the nine identities holding passwords
   can see where they will type. On **2026-09-17** the owner said the opposite — *"sign in 的界面
   上只有 sign in with google"* — and confirmed it again on 09-18 when shown both. The later
   decision governs. What it costs is exactly what the earlier one bought, and it is worth
   writing down: somebody who already has a password sees nothing on this page that acknowledges
   them. The route still works (`design.md` §5); the page does not mention it.
2. **This server verifies the token.** Ticket 011 recommends posting it to h1_checker's live
   `/auth/google` instead, on the grounds that *"every identity this page creates in this repo's
   database is a row somebody has to move by hand later"*. **That reason does not survive the
   schema** — see `design.md` §2. The owner chose to verify here on 2026-09-18, having been
   shown the correction.

## Non-goals

- **The home page** (`ROADMAP.md` 第一步 4). The owner's description of it — introduction on the
  left, sign-in on the right — is the same shape this page takes, and its right-hand panel should
  be the component this change builds rather than a second copy. Whether the two pages merge
  into one is that ticket's call, not this one's.
- **Wiring the password path into this page.** `POST /auth/login` stays served and untouched;
  the page simply does not offer it. Ticket 011 is explicit that a working password box here
  would quietly restore a path the owner removed on 2026-09-13.
- **`MIN_PASSWORD_LENGTH`.** It reads 10 here and the owner decided 8-with-composition on
  2026-09-13. Changing it in this repo alone moves the disagreement instead of ending it;
  `../h1_checker/.harness/backlogs/015` says the number lives in one place and is read by three.
  This change deletes the constant's *use* on the page, not the constant.
- **LinkedIn and Apple.** Drawn in the screenshots, not in this page, by decision 1.
- **The account merge** (`.harness/backlogs/018`) and **onboarding questions** (`012`).
- **Password reset.** Still absent, still blocked on this service being unable to send mail at
  all; `ROADMAP.md` 第二步 1.5.

## Capabilities

### New Capabilities

- `sign-in`: how somebody proves which address is theirs on this site, what happens when an
  address arrives through more than one door, and what the page offers.

### Modified Capabilities

None. `openspec/specs/` holds the coach specs, `company-bank`, `dashboard-shell`, `jobs-page`
and `track-split`; none of them specifies signing in.
