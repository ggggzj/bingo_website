---
id: 012
title: Ask the questions that make a feed personal, in the order the owner drew
status: open
origin: Owner decision 2026-09-13 — thirteen screenshots of Simplify's onboarding supplied
  as the shape for what happens after somebody signs in: "进去之后的样子参考我发给你的所有
  图片，我们来 pickup 一下". Lands on this site by the same call recorded in
  .harness/backlogs/011.
counterpart: ../h1_checker/.harness/backlogs/015-one-account-on-both-surfaces.md
blocks: nothing. **Blocked by** 011 (nobody answers questions before signing in), and
  blocked by 015 for the half that stores answers — see "The line that decides what can be
  built now"
grounded: 2026-09-13 — every "already exists" below was read off the code, not assumed.
---

## Who arrives here, settled 2026-09-13

Everybody. The owner moved registration out of the extension entirely — the address, password and
profile steps come out, and the LinkedIn card stops taking an address (see the counterpart's own
note). So these screens are not a nicer version of a form that exists elsewhere: **they are the
only place this product asks anybody anything.**

Two consequences worth carrying into the work:

- **The first screen is somebody's first contact with the product**, often arriving straight from
  the extension they just installed. It cannot assume they have seen anything before it.
- **Abandoning halfway must still leave a working identity.** Under the old flow somebody who gave
  up mid-form had at least given an address. Here they signed in with Google *before* the first
  question, so the identity already exists — every answer after that is optional in practice, and
  the product has to behave as if it is.

## The ten screens, and how much of each already exists

Eight questions and two interstitials, in the order the owner drew them. The right-hand
column is what was measured, not what was guessed:

| Screen | Where its answer already has a home |
|---|---|
| How soon are you looking to land a job? | **nowhere** |
| Which locations? (per country, "select all", remote tagged) | `job_prefs.locations` + `remote_only` |
| *"Find your dream job 5x faster"* — no question | — |
| Upload a résumé | **nowhere.** h1_checker's `017` anticipates it and places it |
| *"Analyzing your skills… 53%"* — no question | — |
| What kind of role? | `job_prefs.titles`, chosen from `SPONSORED_ROLES` — **and it is the feed's title filter (D-027)** |
| How much experience? | **nowhere** |
| Minimum expected salary? | **nowhere** |
| *"We found N jobs"* | `job_postings` — 11,310 rows to count against |
| How did you hear about us? | `referral_sources`, from `REFERRAL_SOURCES` (D-008) |

**Three of the eight questions already have a home. Four are new fields. One is a count.**
Every one of those homes is in h1_checker's database, which is what the next section is about.

## The line that decides what can be built now

This repo's `api-client` points at **this repo's** `api-server`, which reads **this repo's**
database. `job_prefs`, `job_postings`, `SPONSORED_ROLES` and `referral_sources` are all in
the other one.

So somebody answers *Los Angeles, $100k, Full-Stack, ASAP*, the answers land here, and the
feed that would act on them cannot see any of it. Nothing errors. Nothing is logged. The
person fills in ten screens and nothing happens — which is the failure that looks exactly
like success right up until somebody checks.

h1_checker's `015` is what closes that, and says so in its own words: until there is a single
`users` table, no arrangement of anything else makes one address one identity.

**That splits this ticket cleanly, and the larger half is not blocked:**

| | buildable now | waits for `015` |
|---|---|---|
| Every screen, its layout, the progress bar, back and forward | ✅ | |
| Answers held across screens and across a reload | ✅ | |
| Answers reaching `job_prefs` and changing what the feed sends | | ⛔ |
| The count on the results screen | | ⛔ |
| Résumé parsed into anything | | ⛔ |

The interface half does not have to be rebuilt afterwards. What gets attached later is where
the answers go, not how they are asked.

## What done looks like

- Somebody who has just signed in is asked these questions in this order, one screen at a
  time, with a progress bar and a way back — and answering none of them still leaves a
  working account rather than a dead end.
- Closing the tab halfway and returning lands on the screen they stopped at, not the first.
- A person who already answered is never asked again — the same rule
  `../h1_checker/.harness/backlogs/004` states for what it hands over.
- The role question offers `SPONSORED_ROLES`, not a new list. That list is grouped by what
  actually gets sponsored and is already the feed's filter; a second vocabulary here becomes
  a filter that matches nothing (D-027).
- Whatever is not yet stored is **not asked**. A question whose answer is thrown away is
  worse than a question not asked.

## Notes for whoever picks this up

- **`REFERRAL_SOURCES` is not Simplify's list and should not become it.** Ours is
  `1point3acres, reddit, school, wechat, chrome_store, friend, other` — an audience that
  overlaps theirs in three places out of eight. D-008 records it as the only record of a
  channel anywhere in this system, so rewriting the list silently re-labels every row already
  collected. Add to it if the audience widened; do not swap it.
- **"🎉 We Found 2,957 jobs" has a floor problem.** Ours would be counted against 11,310
  postings, filtered by everything just answered. A narrow answer makes that number small, and
  a celebration screen reading `We found 3` — or `0` — is worse than no screen. Decide what it
  does at the bottom of the range before it is built, not after somebody meets it.
- **"Analyzing your skills… 53%" is a progress bar over nothing, until the résumé is parsed.**
  Worth building when there is something to analyse. Worth deciding, deliberately and by the
  owner, whether a product that has nothing to analyse yet should show a bar that says it does.
- **Four new fields want placing, not inventing.** h1_checker's `017` already sorted this
  product's tables by what happens if you lose them, and says where new ones go: a résumé and a
  typed answer are irreplaceable, a match is recomputable. Timeline, experience and salary
  belong beside `job_prefs`; the résumé belongs with the irreplaceable group and is the first
  thing this product will hold that a person cannot re-type.
- **Ten screens is a lot to ask before anything is given back.** The two interstitials are
  what Simplify uses to pay for that, and they are the cheapest screens here. If the order has
  to shrink, the questions with nowhere to store an answer are the ones to drop first — they
  cost the most and buy nothing until `015`.
