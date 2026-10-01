---
type: eval
target: 2026-09-29-the-front-door-shows-the-jobs
version_key: a519840
dimension: test-quality
verdict: mixed
judge: opus-5
created: 2026-09-30T17:18:56-07:00
created_ns: 1790813936887678000
scope:
---

Mutation checking across the run killed every rule except three that survived and were then fixed: the ?password=1 door (VITE_GOOGLE_CLIENT_ID is empty under vitest, so the form appeared via the missing-client-id fallback and deleting the door left the suite green), newest_posted_at dated from the whole list rather than the rows returned, and two vacuous assertions (JSON.stringify on InMemoryAuthStore is constant; a 502 fake whose error never carried the token). Mixed rather than pass because all three were found by mutation, not by writing the tests.
