---
id: 005
title: Say what the location box can and cannot do, and stop it promising a place
status: open
origin: Observed on the live /jobs page 2026-09-11, the first hour it ran against real data.
counterpart: ../h1_checker/.harness/backlogs/011-stop-serving-jobs-that-need-no-visa.md
---

## The symptom

Someone opens `/jobs`, wants roles in America, and types **United States** into the box
labelled Location.

They get the 8 postings whose text literally contains those words. They do not get the 37
that say `San Francisco`, the 15 that say `San Francisco, CA`, the 12 that say
`Remote - US`, the 10 that say `Remote - USA`, or the 9 that say `US-CA-Menlo Park`.

The box did exactly what it is designed to do — match text — and the person reading it had
no way to know that. It looks like a location filter. It is a substring search.

## The evidence

Measured against production 2026-09-11, the twelve most common location values in a 500-row
sample:

```
  37  San Francisco
  32  Hybrid                    ← no location at all
  16  Hybrid - New York, NY
  15  San Francisco, CA
  12  Remote - US
  11  Singapore
  10  Remote - USA
   9  US-CA-Menlo Park
   9  Toronto, Canada
   8  New York, NY (HQ)
   8  United States
   8  Hybrid - San Francisco, CA
```

One place, many spellings; and 32 rows carrying no place at all.

`../h1_checker/openspec/changes/archive/2026-09-11-browse-postings/design.md` already
records that upstream matches this as text and resolves nothing — there is no normalised
city, state or country in the schema to resolve against. The page inherited that honestly
and then presented it as a Location control, which is where the promise crept back in.

## What done looks like

- The control stops implying it understands places. A placeholder or hint that says what it
  actually does — matches the words the employer wrote — so typing a country and getting
  little back is an understood outcome rather than a broken-feeling one.
- Where practical, the control helps rather than only warns: the common values are few
  enough that suggesting them, or offering the frequent US metros as choices beside the free
  text, would turn a guessing game into a pick.
- **When the counterpart lands**, a US-only control appears here and is on by default, and
  it is a separate thing from this box: one asks "which country's rules apply to this job",
  the other asks "which city". Do not merge them into one input.

## Notes

1. **Do not fix this by normalising in the browser.** The page cannot know that
   `US-CA-Menlo Park` and `San Francisco, CA` are the same country; it would be guessing
   over a field it did not write. That work belongs upstream, in the counterpart ticket,
   where the rule can be one pure function shared by every surface.
2. **The 32 `Hybrid` rows are the interesting case.** Whatever copy this ticket lands on has
   to be true for a posting with no location at all, because the reader will meet one.
3. This is copy and a control, not a data change. Small — but it is the difference between a
   reader thinking the feed is thin and a reader understanding what they searched.
