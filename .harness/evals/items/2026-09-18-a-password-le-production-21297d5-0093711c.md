---
type: eval
target: 2026-09-18-a-password-less-identity
version_key: 21297d5
dimension: production
verdict: mixed
judge: opus-5
created: 2026-09-18T12:29:50-07:00
created_ns: 1789759790292690000
scope:
---

Schema declares password_hash nullable; the real database is only nullable after a push nobody verifies. Zero production callers of createPasswordlessUser today, so it cannot fire now; it fires the day ticket 011 lands if the push was skipped, as a NOT NULL violation surfacing as a 500 on a sign-in route. Tests run against memory and a dummy DATABASE_URL and cannot catch it. Documented in replit.md; not guarded. lib/coach/store.contract.test.ts already runs the drizzle implementation against a real scratch Postgres via COACH_TEST_DATABASE_URL, so the same shape applied to auth would be the actual guard.
