---
id: 004
title: Land somebody who just finished the profile form, and hand them the extension
status: open
origin: Owner statement 2026-09-11 — "填完后跳转到 bingo 的 website,然后在那个上面可以安装
  extension", the last two steps of a funnel reorder whose first four live in h1_checker.
  SpeedyApply's four-step onboarding supplied as the shape to look at.
counterpart: ../h1_checker/.harness/backlogs/010-turn-the-funnel-around.md
blocks: nothing yet — the redirect that sends people here does not exist until the
  counterpart ships its half
---

## Where this sits

The owner is turning the funnel around. Today the extension is the front door: you install
it, it opens its welcome tab, and it asks for an address. Under the new shape the address
comes first and the extension comes last:

```
address → verification mail → click the link → profile form → THIS SITE → install the extension
```

Everything left of this site is h1_checker's half and mostly exists already — `POST
/register` sends the mail, `GET /verify` already serves the profile form behind the link.
What does not exist is the arrow into this repo and the page at the end of it.

## What this repo owes the flow

1. **A place to land.** Somebody arrives here having just typed their name, school, roles,
   graduation and visa status into a form on another host. They must not be asked for any of
   it again, and the page must make sense to somebody who has never seen this site.
2. **The extension, handed over.** A link to the Chrome Web Store listing
   (`fjlefpeahmeahjbadnnogdnailahdafe`), framed as the next step rather than an advert.
3. **The state to know who they are.** Whether that is a session, a signed token in the
   redirect, or nothing at all is the open question below.

## What done looks like

- Finishing the profile form on the other host lands on a page here that greets the person
  by what they just said, not with a generic marketing page.
- The page's single most obvious action installs the extension.
- Somebody who closes the tab and comes back later still finds their way — this cannot be a
  one-shot URL that means nothing on a second visit.
- Somebody who already has the extension installed is not told to install it.
- The page works for somebody who arrives with no state at all, because they will.

## Notes for whoever picks this up

Three calls, and the first two are the owner's:

1. **Whether the profile form moves here.** The owner's line puts the form behind the mailed
   link, which today is a FastAPI page at `h1bchecker-production.up.railway.app/verify`.
   Leaving it there costs one redirect; moving it here costs carrying the verification token
   across hosts but puts the whole account-shaped part of the funnel on one property. This is
   the landing decision the workspace router requires be recorded in a proposal rather than
   assumed — see `../CLAUDE.md`.
2. **What crosses the boundary.** If the form stays on the other host, this page needs to
   know who arrived. A session cookie will not cross two origins; a signed, short-lived
   token in the URL will, and is the same shape the unsubscribe links already use
   (`h1_checker/main.py:1609` `unsubscribe_token`, HMAC-SHA256 over the id). Whatever is chosen, nothing identifying goes in a query
   string that ends up in an access log — the counterpart's repo has a standing rule about
   this (DECISIONS D-003).
3. **Whether this page is new or an existing one grown.** This repo already serves the
   marketing site and accounts. A fifth page that only one flow ever reaches is a page that
   rots; an existing page that learns one new state does not.

## What to take from the screenshots, and what not to

The owner supplied four SpeedyApply screenshots. They are its extension options page, not a
website, so read them for step shape rather than for where things live:

- **Skip next to Next on every step.** Nothing in the current funnel is skippable.
- **A picture of the feature beside every step**, showing what that step buys.
- **"Pin to Your Browser" as its own step.** Worth stealing outright. h1_checker's D-037
  recorded that the toolbar icon is invisible unless pinned, and D-039 measured the popup
  never opening on its own — so the extension's one voice is an icon most people never see.
  If this page is where somebody installs, it is also where somebody can be told to pin.
