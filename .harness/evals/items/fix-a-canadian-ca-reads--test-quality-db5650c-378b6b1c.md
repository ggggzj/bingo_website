---
type: eval
target: fix-a-canadian-ca-reads-as-california
version_key: db5650c
dimension: test-quality
verdict: pass
judge: claude-opus-5-5
created: 2026-10-02T14:56:27-07:00
created_ns: 1790978187548785000
scope:
---

Homonym case now pinned by 'reads a US town that shares its name with a foreign city as US' — RED at 152a2cf (Dublin, CA -> elsewhere), GREEN after. Suite 231 passed, 2 DB-contract files skipped (no scratch Postgres).
