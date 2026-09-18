# Design — the-new-grad-list-behind-the-login

Four decisions. Each was measured rather than assumed, and each names what it costs.

## D1 — The filter runs in `api-server` over several upstream queries, not in one

`GET /api/postings` takes **one** `title`, matched as `ilike '%text%'` (`main.py:3204`,
`jobfeed/adapters.py:281`). What this page needs is

> (a software term) **AND** (an early-career term) **MINUS** (a seniority term)

which no single substring expresses.

**Options.** (a) One upstream query per early-career term, merged here. (b) Add a proper
filter upstream — a cross-repo change and a counterpart ticket. (c) Pull a broad slice and
filter it here.

**Choice: (a).** The early-career terms are the selective half, so each is a small result set;
`BROWSE_LIMIT_MAX` is 100 and `BROWSE_OFFSET_MAX` is 10,000, so paging is available and
bounded. The software test and the exclusions then run here, over the union, keyed by
`job_id`.

**Why not (b).** It is the better long-run shape and it is the wrong thing to do this week:
it makes a page for one reader wait on another repo's proposal-and-implement cycle, and that
repo is mid-flight on `026`. When `016` opens this to every user, the query moves upstream and
this fan-out is what gets deleted — a cost paid once, knowingly.

**Why not (c).** "Broad" is 11,310 postings. Paging all of it per page-load to filter in
Node is the traffic D-013 calls a courtesy, spent on our own upstream.

**What it costs, stated:** one page-load issues N upstream requests instead of one. The
upstream limit is 60/minute for this token and one reader is asking, so the ceiling is not
close — but the number is real and belongs in the PR, the way `022` was made to state its
daily request count.

## D2 — The early-career terms, and why this is a filter and not a classifier

Measured against the owner's 376 US rows, `title` containing the literal `new grad` matches
**55**. The 321 misses are the shape of the term list:

`new grad` · `new graduate` · `entry level` · `early career` · `university graduate` ·
`university hire` · `campus` · `associate software` · `engineer i` · `engineer 1` ·
`graduate engineer` · `class of 20`

Minus, applied after: `senior` · `staff` · `principal` · `lead` · `manager` · `director` ·
`ii` · `iii` · `intern` · `internship` · `phd` · `postdoc`.

Three things about this list are deliberate:

- **`engineer i` over-matches `engineering`.** The upstream `ilike` cannot express a word
  boundary, so the query is the coarse net and the precise test runs here, on the title
  string, with boundaries. This is why D1's filtering happens locally even for terms the
  upstream could have matched alone.
- **The exclusions are applied last and win.** `Senior Software Engineer I` must not be
  listed, and a list that only added terms would list it.
- **The `intern` exclusion is not an oversight.** The intern list is `../h1_checker/021` and
  it is a different product with a different launch gate. Mixing them is how one list stops
  being either.

**This does not label anything.** No row is stored with a seniority, none renders a badge, and
the page says in its own header that it is a title search over these terms. That is the line
`openspec/specs/jobs-page/spec.md` draws, and it is drawn between *narrowing* and *asserting*,
not between one term and twelve.

The term list itself is data, not logic: one exported constant with the owner's own vocabulary
in it, so widening it later is an edit rather than a refactor.

## D3 — Location is three states, because the data has three

`BrowseQuery` has no country (`../h1_checker/.harness/backlogs/011`, still open). The location
string is whatever the provider wrote.

- Reads as US (a state name, a US city, `United States`, `US-Remote`) → **listed**.
- Unreadable (`2 Locations`, empty, a bare city that exists in four countries) → **listed and
  marked**.
- Plainly elsewhere (`London, UK`, `Bengaluru`) → **dropped**.

This is exactly what the owner's own spreadsheet did — its 在美国 column holds 是 / 否 / ?
— and adopting their three states rather than inventing two means the page and the file they
already trust disagree in no case.

The marked rows are the honest part. `016`'s note records that 24% of the live feed was
outside the US; a page that quietly guessed would hand the owner that error as certainty.

## D4 — "New since last visit" is stored, or it is not a fact

`first_seen_at` says when we first saw a posting. "Since **you** last looked" needs the other
timestamp, and it has to survive a reload, a second device, and a refresh that must not consume
the answer.

**Options.** (a) `localStorage`. (b) A column on the owner's `users` row. (c) A small table
keyed by user and view.

**Choice: (c).** (a) is per-browser and silently empty in a private window — and the one thing
this page is for is knowing what is new, so the failure mode is the feature. (b) puts a
view's state on the identity row, which is the shape `../h1_checker/017` warns against when it
sorts tables by what happens if you lose them. (c) is one table, cascades with the account like
`coach_*` already does, and is where the tracker (`017`) will hang its rows too.

**The refresh rule:** opening the view reports what is new **and then** advances the marker;
re-opening within the same session must not empty the list. The marker advances on an explicit
acknowledgement, not on render — otherwise a stray reload spends the answer, which is the same
mistake `/api/postings` avoids by never writing a delivery row.
