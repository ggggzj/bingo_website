---
type: eval
target: fix-a-canadian-ca-reads-as-california
version_key: 4f1b561
dimension: test-quality
verdict: mixed
judge: claude-opus-5-5
created: 2026-10-02T14:21:31-07:00
created_ns: 1790976091655259000
scope:
---

Repro test fails on revert (location.test.ts 'does not read a two-letter code as a US state...'); guard covers US+abroad strings. No test pins the homonym case (Dublin, CA) either way.
