---
type: eval
target: fix-a-canadian-ca-reads-as-california
version_key: 4f1b561
dimension: correctness
verdict: mixed
judge: claude-opus-5-5
created: 2026-10-02T14:21:31-07:00
created_ns: 1790976091546861000
scope:
---

Fix correct: repro RED at 084ae5c (Toronto, ON, CA -> us), green at 4f1b561; 6,000 feed rows re-measured: 54 us->elsewhere, 24 unknown->us, nothing else. Regression introduced: US towns sharing a foreign city's name with only a state code now read elsewhere (Dublin, CA / Dublin, OH / Vancouver, WA / Waterloo, IA / London, KY / Paris, TX) — probed old vs new; 0 such rows in today's sample.
