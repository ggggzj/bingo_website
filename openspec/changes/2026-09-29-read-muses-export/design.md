# Design — read-muses-export

## One normaliser, and the bug it has been carrying

`import_simplify.py:norm_url` turns a link into a dedupe key. For Workday it returns
`workday:<tenant>/<site>/<slug>` — lowercasing the tenant and leaving the site as it came:

```python
tenant, rest = m.group(1).lower(), m.group(3).split("?")[0]
```

So `…/Careers_GM/job/…` and `…/careers_gm/job/…` are different keys for one posting. That is
the whole of the General Motors confusion on 2026-09-29, and it will recur on every Workday
employer whose links the owner reaches two ways.

The fix is to lowercase the whole key. It is safe for the existing data: keys are compared to
each other, never to anything stored elsewhere, and `applications.js` is regenerated from the
raw exports on every run. Verified before proposing: with the case folded, **15 of Muse's 18
rows match an existing application**; the three that remain are genuinely different reqs.

`import_muse.py` imports this function rather than copying it. A second normaliser would be a
second opinion about what "the same posting" means, and the two would disagree on the day one
of them is fixed.

## A link-less row is the same application, not a new one

This is the part that needs real thought rather than a regex.

A row born from email has key `"公司名|职位名"` and no URL. A Muse row for the same application
has a URL key. They are the same thing and nothing in the key says so.

What is available to match on:

| | |
|---|---|
| Company name | necessary, never sufficient — one company can hold four applications |
| Job title | Muse's is the posting's real title; email's is often `职位名待补` |
| Date | Simplify's is when it was recorded, Muse's is when it was submitted — they differ by days |

So the rule: **a Muse row may adopt a link-less row only when that company has exactly one
link-less row and no ambiguity.** Where a company has several, print them and let the owner
point. Adopting means the existing row keeps its identity in the account — its status, its note
and its trail survive — and gains the link, title and location.

That last clause is why this cannot be "delete and re-add". The five pairs deleted by hand today
were safe only because they carried nothing; a row the owner has written on must never be
replaced by a new id.

## What the 备注 column is worth

Muse's notes are facts that exist in no other system: *经她明确批准提交*, *浏览器误点直接提交，
她说保留不撤回*, *手动过 hCaptcha 提交*, *账号显示已提交，提交者待她确认*. Two of those record
**consent** for a submission, and one records a submission the owner did not intend and chose to
keep. They belong in the row's provenance and must survive the import.

## What this importer must never do

Decide. The rejection letter misfiled today — GM's AV HIL letter written onto the AV Launch row —
happened because a human (Claude) picked one of two rows that a machine had not distinguished.
The importer's failure mode is the same shape, so its answer to ambiguity is to print.
