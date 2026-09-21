# Proposal — the-front-door-signs-you-in

## Why

`/` is a 453-line marketing page with no way in. `/login` is the split page the owner asked
for, shipped 2026-09-18 by `2026-09-18-one-way-in-and-it-is-google`. The owner's instruction
(`ROADMAP.md` 第一步 4, 2026-09-17) is that the split page **is** the home page:

> 网站的主页就是左边是对网站的介绍和 extension 的介绍，然后右边整个是 sign in/up

Origin: `.harness/backlogs/020-the-front-door-and-the-way-in.md`. Every question that ticket
raised was put to the owner and answered on 2026-09-20; the answers are recorded in the ticket
and repeated below, because a proposal that makes the reader open another file to learn what
was decided is not a proposal.

## What Changes

- **`/` becomes the only front door.** Two columns above `lg`: the right one carries the
  sign-in and does not move, the left one scrolls and carries the introduction. The five
  sections keep their content and lose their full-width layout.
- **The sign-in becomes one component**, rendered wherever a sign-in appears, rather than a
  second copy of the forty lines that hold the back door, the misconfigured-client fallback
  and the password-cleared notice.
- **`/login` stops being a destination and keeps being an address.** It redirects to `/`,
  except with `?password=1`, which renders the password form exactly as it does today.
- **A signed-in visitor at `/` is sent to `/jobs`** rather than shown a sign-in for the
  account they already hold.
- **The header's four section links are deleted.** They scroll the window; after this the
  window does not scroll and a column does.

## The owner's decisions, all taken 2026-09-20

Recorded rather than re-opened. Each was put with its cost.

1. **One page, not two.** `/` and `/login` merge.
2. **The layout is right-fixed, left-scrolling** — the owner's words: 我希望右边是 login，
   左边是可以上下滑的页面，然后介绍 extension 和网站的功能. This is what makes decision 1 cheap:
   nothing is deleted to make room, because the room is vertical.
3. **At 320px the order is** one line saying what this is, the Google button, the extension
   button, then the introduction. Both halves of the roadmap's acceptance survive, rather
   than one being traded for the other.
4. **The four header anchors are deleted, not rewritten.**
5. **A signed-in visitor at `/` lands on `/jobs`.**
6. **`/login` redirects to `/`, except `?password=1`.**

## The seam this crosses, and the one it does not

It crosses **no server seam**. No route, no `AuthStore`, no `lib/api-spec/openapi.yaml`, no
`lib/db` schema, no secret. `POST /auth/google` and the email routes are untouched and this
change adds no call they do not already receive. Everything here is `artifacts/landing`.

What it does cross is the **sign-in surface contract** — the `sign-in` spec's "The page offers
Google and nothing else" and "A misconfigured client leaves a usable page, not a broken one"
are written about `/login`, and after this they are about `/`. The delta in `specs/sign-in/`
carries them.

**Sequencing note, and it is real.** That spec does not exist in `openspec/specs/` yet. It
lives only inside `2026-09-18-one-way-in-and-it-is-google`, which is unarchived because its
task 5.2 is owner-run Google console work. So this change's delta stacks on an unsynced spec.
Either that change archives and syncs first, or whoever archives this one reconciles both.
Naming it here so it is a decision rather than a merge surprise.

## Non-goals

- **The `/jobs` login wall and the Summer 2027 intern section.** That is
  `.harness/backlogs/021`, and it reverses recorded decisions this change does not touch.
  This change sends a signed-in visitor to `/jobs`; it does not change who may read it.
- **Anything about what `/jobs` shows.** Untouched.
- **The password rules, the email routes, the owner's recovery path.** `?password=1` renders
  what it renders today, unchanged, and this change adds no rule to it.
- **Account merging across the extension and the site.** `018`, and orthogonal.
- **New claims on the page.** The introduction says what the extension ships, the same bar
  `replit.md` already holds the home page to. Content moves and is re-laid-out; it is not
  rewritten into something the extension does not do.
- **The mailing list.** Removed 2026-09-15 by `013` and it stays removed. `Home.test.tsx`
  asserts its absence in two tests and both must keep passing through the rewrite.
- **`SiteFooter`.** Out of scope; whatever the merged page does with the header, the footer
  keeps its current behaviour.

## Capabilities

`sign-in` — modified. The surface that offers Google moves from `/login` to `/`, `/login`
gains a redirect with one documented exception, and a signed-in visitor at the front door is
sent on rather than asked to sign in again.
