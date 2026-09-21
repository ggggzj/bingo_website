---
id: 020
title: The front door and the way in — the left half explains, the right half signs you in
status: picked-up
produced: openspec/changes/2026-09-20-the-front-door-signs-you-in/ — proposal drafted
  2026-09-20, awaiting owner approval. Classified a bounded change: no server seam, no
  contract, no schema, and every decision this ticket raised was answered by the owner the
  same day. Two things the proposal carries that this ticket did not: `/login` has **four**
  callers rather than the two named below (two signed-out guards, two after a deliberate log
  out), and the `sign-in` spec it modifies is not in `openspec/specs/` yet — it lives inside
  the unarchived `2026-09-18-one-way-in-and-it-is-google`, so archiving order is a decision
  rather than a surprise.
origin: ROADMAP.md 第一步 4 (owner decision 2026-09-17) — "首页改成：左边介绍网站和插件，右边整个是
  Google 登录". The owner's words in full, same day: "网站的主页就是左边是对网站的介绍和 extension
  的介绍，然后右边整个是 sign in/up". The roadmap's own acceptance for the item: 手机上（320px）能用；
  没登录的人能看懂这是干嘛的、装插件的按钮在哪。
related: .harness/backlogs/021 — the /jobs login wall sends a signed-out visitor to the home page,
  so what that page is depends on the decision below. `openspec/changes/2026-09-18-one-way-in-and-it-is-google`
  built the shape this ticket reuses.
blocks: nothing. 021 can ship against either answer to the decision below, but reads better after this.
grounded: 2026-09-20 — measured against Login.tsx, Home.tsx, SiteHeader.tsx and the route table, not assumed.
---

## The shape already exists, and it is not on the home page

`artifacts/landing/src/pages/Login.tsx` **is** the page the owner described. It shipped
2026-09-18 (`630a04d`) out of `openspec/changes/2026-09-18-one-way-in-and-it-is-google`:
`grid lg:grid-cols-2`, the product's case on the left, one Google button on the right.

So this ticket is not "build a split page". It is **"the home page is still the old long
marketing page, and the owner asked for the split one at `/`"** — plus one decision nobody
in a session gets to make.

What is at `/` today: `Home.tsx`, 453 lines, five sections (hero, badges, `#where`,
`#how`, `#data`, a closing extension CTA) between `SiteHeader` and `SiteFooter`. No sign-in
anywhere on it — the way in is the header's "Log in" door (`SiteHeader.tsx:37`), which
points at `/login`.

## The decision, and it is the owner's

**Do `/` and `/login` become one page, or stay two?**

Both are defensible. Neither is a session's call, and the answer changes the tasks
materially, so it is recorded here rather than assumed — the same way `019` recorded its
landing decision instead of inheriting one.

### A — one page. `/` becomes the split page; `/login` redirects to it

- The owner's sentence read literally: the home page *is* the sign-in page.
- One surface to maintain, one place the Google button exists, one answer to "where do I
  sign in".
- **The cost is the left column.** It holds three sentences and a three-item list today.
  The home page's five sections do not fit there, so choosing A is also choosing **what of
  the current home page survives** — and the header's section anchors (`#badges`, `#where`,
  `#how`, `#data`, `SiteHeader.tsx:23`) point into content that would no longer exist.
- **And a signed-in visitor landing on `/`.** Today they get the marketing page; under A
  they get a sign-in button for the account they already hold. `SiteHeader.test.tsx`
  already treats that confusion as worth a test ("offers the dashboard to someone already
  signed in"), so A needs an answer for the signed-in case — pass through to `/jobs`, or
  render something else.
- `/login` cannot simply be deleted: `Account.tsx:27` and `Shell.tsx:45` both
  `navigate("/login")` when a visitor is not signed in, and `?password=1` is the owner's
  documented way back in when Google is misconfigured. Under A it stays as an address that
  resolves, whatever it renders.

### B — two pages. `/` gains the split shape above the fold; `/login` stays as it is

- The marketing page survives below the fold, so "what does the left half say" stays a
  small question and the section anchors keep their targets.
- The extension's case, the badges and the data provenance keep the room they need — that
  content is read by people deciding whether to trust the badge (`replit.md`, "The home
  page describes only what the extension actually ships").
- **The cost is two surfaces carrying a Google button**, which makes the reuse below
  mandatory rather than merely tidy, and two pages that must both work at 320px.

### Answered by the owner, 2026-09-20 — A, with a layout neither option described

The owner chose **one page**, and then specified the shape in their own words:

> 我希望右边是 login，左边是可以上下滑的页面，然后介绍 extension 和网站的功能

So it is not "the left column holds three sentences", which is what option A assumed and
costed. **The right half is the sign-in and it stays put. The left half scrolls, and the
introduction lives in it.** That answers the objection A was written around: nothing has to
be deleted to make room, because the room is vertical.

What this settles, and what it does not:

- **`/` is the only front door.** `/login` still has to resolve, for the reasons under A
  below. What it renders is a proposal call.
- **The five sections keep their content.** They do not keep their layout. Today they are
  full-width: `max-w-7xl`, multi-column grids, type that steps up at `md` and `lg`. In a
  half-width scrolling column every one of them is re-laid-out, and that is the bulk of
  this ticket's work. It is not a move, it is a re-fit.
- **The anchors can survive, and how is a real question.** `SiteHeader`'s four entries
  (`#badges`, `#where`, `#how`, `#data`) are ordinary fragment links that scroll the
  window. When the thing that scrolls is a column rather than the window, that has to
  keep working or the header items have to go. Decide it, do not discover it.
- **The header and footer become an open question.** `Login.tsx` renders neither;
  `Home.tsx` renders both. A header whose right-hand door says "Log in", on a page whose
  entire right half is the sign-in, is the duplication `SiteHeader`'s own comment already
  objects to in the other direction. The proposal says what the merged page carries.

**The sharpest remaining question is the phone, and the roadmap already set the bar:**
手机上（320px）能用；没登录的人能看懂这是干嘛的、装插件的按钮在哪. There is no room for two
columns at 320px, so one of them comes first, and both requirements have to survive the
choice. A reader must not have to scroll the whole introduction to reach the button, and a
visitor must not meet a bare Google button with nothing saying what this is. That is a
design call for the proposal, with both constraints stated rather than traded.

## Settled by the owner, 2026-09-20 — the three that were left

Nothing below is a recommendation. They were put to the owner with their costs and
answered in one sitting, the same day the layout was.

**1. On a phone, neither requirement is traded away.** There is no room for two columns at
320px, so the two stack, in this order: one line saying what this is, then the Google
button, then the extension button, then the full introduction below. A visitor meets an
explanation and a way in without scrolling, and the introduction is still all there for
anyone who keeps going. This is the roadmap's 手机上（320px）能用 and 没登录的人能看懂这是
干嘛的、装插件的按钮在哪, satisfied together rather than one at the other's expense.

**2. The four section links come out of the header.** `SECTIONS` in `SiteHeader.tsx:23`
(`#badges`, `#where`, `#how`, `#data`) is deleted rather than rewritten. They work today
because the window scrolls; after this the window does not scroll and the left column
does, so they would need rebuilding to keep a behaviour the page no longer needs. The left
column is one short piece read top to bottom, and four jump links into it are furniture.

Measured 2026-09-20: **no test asserts any of the four**, in `SiteHeader.test.tsx` or
anywhere else, so this is a deletion and not a test rewrite. `SiteHeader`'s own comment
about three items not fitting a 320px bar goes with them; it describes a bar that no
longer has them.

**3a. A signed-in visitor at `/` is sent to `/jobs`.** They do not get shown a sign-in
button for the account they are already holding.

**3b. `/login` keeps resolving and redirects to `/`, except with `?password=1`.** That one
parameter still renders the password form exactly as it does today. The address cannot be
deleted: `Account.tsx:27` and `Shell.tsx:45` both send a signed-out visitor there, and the
form behind that parameter is the owner's way into their own dashboard when Google
sign-in is misconfigured. A redirect that swallowed it would close the back door while
looking like tidying.

### The hazard those two redirects create, and the pattern that already solves it

`/` sends a signed-in visitor to `/jobs`. Once `.harness/backlogs/021` lands, `/jobs`
sends a signed-out visitor to `/`. Two redirects pointing at each other, decided by an
answer that is **not instant** — `useGetMe` has a loading state before it knows.

Redirecting while the answer is still outstanding is how that becomes a loop. The repo
already has the guard and it is one line: `Account.tsx:27` reads
`if (!isLoading && !isSignedIn)`, and `Shell.tsx:42` opens with `if (isLoading) return;`.
Every new redirect here waits the same way, and a test drives the loading state rather
than only the settled ones.

## The right half is reused, not copied

Whichever answer, the sign-in half comes from the existing component — extracted from
`Login.tsx` into something both pages render, never transcribed a second time. Three things
in those 40 lines are load-bearing and a copy is how one of them quietly goes missing:

1. **`?password=1`** (`Login.tsx:68`) — the owner's documented way in when the Google client
   id is wrong. The comment says it is not a security boundary; it is still the back door,
   and a second page that forgot it is a second page the owner cannot get in through.
2. **The empty-client-id fallback** (`Login.tsx:88`) — with no client id there is no working
   button, so the form stands in rather than rendering a dead end.
3. **The `passwordCleared` toast** (`Login.tsx:97`) — somebody whose password just stopped
   working is told why. A copy without it leaves them concluding the site is broken.

## What must NOT be inherited from that page

**The left half is `hidden lg:flex`** (`Login.tsx:159`). Below the `lg` breakpoint it is
gone, so `/login` on a phone is a Google button and nothing else.

The roadmap's acceptance for *this* item is the opposite: 手机上（320px）能用；没登录的人能看懂
这是干嘛的、装插件的按钮在哪. A home page that hides its own explanation on a phone fails its
own criterion. Whatever the layout does at `lg`, the explanation and the extension link
have to survive at 320px.

Related: the Chrome store link on `/login` is small print inside the left column
(`Login.tsx:176`), so today it is doubly invisible on a phone. The roadmap asks for a
button somebody can find.

## What the left half may claim

The same bar the current home page is held to, which `replit.md` states outright: **only
what the extension actually ships.** The badges are the extension's own strings, the counts
are row counts, the DOL data is refreshed quarterly by hand. `Login.tsx`'s left column
already obeys this — three claims, and a line saying filing history is evidence of past
sponsorship rather than a promise of future sponsorship. Carry that line across; it is the
compliance sentence, not decoration.

Nothing predictive. `ROADMAP.md` 明确不做 and the 中签率计算器 removed 2026-09-10.

## What done looks like

- The home page renders the product's case and the extension's case beside a Google
  sign-in, per whichever answer the owner gave to the decision above, recorded in the
  proposal.
- **At 320px the explanation and the extension link are both present and reachable**, and
  the page does not scroll horizontally — the bar `/jobs` is already held to in
  `openspec/specs/jobs-page/spec.md`.
- The sign-in half is one component rendered in every place it appears. Proven by a test
  that `?password=1` still reaches the password form from the new page, and that an empty
  client id still falls back to the form rather than a dead end.
- Signing in with Google from the new page lands on `/jobs` — the roadmap's 登录后直接进
  `/jobs`, which is what `Login.tsx:108` already does.
- **A signed-in visitor arriving at `/` lands on `/jobs`**, and is never shown a sign-in
  button for the account they already hold.
- **`/login` still answers.** Without the parameter it redirects to `/`; with
  `?password=1` it renders the password form unchanged. Both proven by a test, because the
  second is the owner's only way in when Google sign-in is broken.
- **Neither redirect fires before the server has answered who this is.** A test drives the
  loading state, not just signed-in and signed-out, so `/` and `/jobs` cannot bounce a
  visitor between them.
- **At 320px the order is: what this is, the Google button, the extension button, then the
  introduction.** No horizontal scroll, and nothing above the button that has to be
  scrolled past to reach it.
- **The header carries no `#badges` / `#where` / `#how` / `#data` links**, and nothing else
  in the app links to those fragments.
- The mailing list stays gone. `Home.test.tsx` asserts it appears nowhere on the page
  (`013`, 2026-09-15); a rewrite that drops that test re-opens the question silently.
- Every claim on the page checks out against `../h1_checker`. Tested in
  `artifacts/landing`, which has had a test runner since `008`.

## Notes for whoever picks this up

- **`004` is not this ticket and is not cancelled by it.** That one lands somebody who has
  just finished the profile form and hands them the extension — a different arrival, from a
  different place, and its counterpart in `../h1_checker` has not shipped. Read it before
  designing the hero so the two do not contradict each other.
- **`013` already took one section off this page.** The closing CTA that remains is the
  extension link that replaced the email box. It is the only CTA on the page today.
- **The header's door is conditional already** (`SiteHeader.tsx:37`): "Dashboard" when
  signed in, "Log in" when not, never both. Under A that door points at a page that now
  signs people in at `/`; say what it points at rather than leaving it.
