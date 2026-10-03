---
type: eval
target: fix-a-canadian-ca-reads-as-california
version_key: db5650c
dimension: correctness
verdict: pass
judge: claude-opus-5-5
created: 2026-10-02T14:56:27-07:00
created_ns: 1790978187431944000
scope:
---

Review finding fixed in unit 4.1: Dublin, CA / Dublin, OH / Vancouver, WA / Athens, GA / Melbourne, FL read us again; Dublin, Ireland / Melbourne, Australia / Vancouver, BC stay elsewhere. 6,000 feed rows vs 4f1b561: 0 moved; vs 084ae5c: 54 us->elsewhere, 24 unknown->us.
