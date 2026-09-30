---
type: eval
target: 2026-09-30-the-dashboard-says-when-the-feed-last-moved
version_key: 5e2760b
dimension: production
verdict: pass
judge: opus-5
created: 2026-09-30T12:16:12-07:00
created_ns: 1790795772960619000
scope:
---

Public API surface touched (lib/api-spec/openapi.yaml). Compatibility: two added properties, both optional and nullable, purely additive - no existing consumer breaks. Blast radius: one owner-only route behind the OWNER_EMAIL gate, which is unchanged and answers the same uniform 404. No schema, migration, secret or new upstream call; lib/stats/upstream.ts never opened. Reversible by revert. Latent risk ticketed as 031: 21 'nullable: true' in a document declaring OpenAPI 3.1.
