---
id: 031
title: The spec declares OpenAPI 3.1 and writes 3.0's nullable — 21 fields whose null is held up by orval's goodwill
status: open
origin: Review finding, 2026-09-30, during `2026-09-30-the-dashboard-says-when-the-feed-last-moved`.
  Tagged `[beyond-diff]` there and deliberately not fixed inside that change: it follows the file's
  existing convention, and 19 of the 21 uses predate it.
grounded: 2026-09-30 — counted in `lib/api-spec/openapi.yaml`, not estimated.
---

## What is there

`lib/api-spec/openapi.yaml:1` declares `openapi: 3.1.0`. The document then uses `nullable: true`
**21 times**, which is 3.0 syntax. OpenAPI 3.1 removed the keyword; the 3.1 spelling is
`type: [integer, "null"]`.

Nothing is broken today. Orval 8.5 honours `nullable` regardless of the declared version, so
`lib/api-client-react/src/generated/api.schemas.ts` really does carry `| null` on all 21, and the
code that branches on those nulls typechecks.

## Why it is worth a ticket rather than a shrug

The nullability of 21 fields currently rests on a generator being lenient about a keyword its
declared spec version does not have. An orval upgrade that tightens to the declared version, or a
stricter validator entering CI, removes `| null` from every one of them — and that failure is
quiet in the worst way:

- A `number | null` becomes `number`. Code written as `if (hours === null)` becomes a branch
  TypeScript believes is unreachable. It does not error; it just stops being checked.
- The concrete case: `Dashboard.tsx`'s feed-freshness line distinguishes "never synced" (null)
  from "upstream said nothing" (absent) from a real hour count. Collapse the null and the never
  branch is dead code while the page keeps rendering something plausible.

That is a whole class of silent behaviour change arriving from a dependency bump, which is the
kind of thing that gets diagnosed twice before anyone looks at the YAML.

## Two ways out, pick one

1. **Convert the 21 to `type: [X, "null"]`** and stay on 3.1. Correct, and the diff is mechanical —
   but it is 21 schema edits plus codegen, and the generated output must be diffed to prove the
   types did not move.
2. **Declare the document `3.0.3`.** One line, and every `nullable: true` becomes legal. The cost
   is giving up 3.1 features; check first whether anything in the file already uses one
   (`examples`, `const`, `webhooks`, a JSON-Schema-only keyword).

Either way the acceptance evidence is the same: **`git diff` on `lib/api-client-react/src/generated`
and `lib/api-zod/src/generated` shows no type changing**. If a `| null` disappears, the fix found a
field whose nullability was already a fiction, and that is a finding of its own, not a rebase.

## Do not

- Do not fix this as a side quest inside another change. It touches every schema in the contract
  and its whole proof is "the generated types did not move" — that needs to be the diff a reviewer
  is looking at, not a paragraph in someone else's.
