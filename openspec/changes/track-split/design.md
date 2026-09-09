# Design — track-split

## Context

See proposal.md. Constraints that shape this: the engine is pure and
parity-pinned (fixtures must stay green); the bank's 29 patterns are the
only structured signal about problem content; company-bank set the
precedent for data-with-review changes.

## Goals / Non-Goals

**Goals:** one reviewed table, one config field, one multiplicative factor
in scoring; default track provably identical to today.
**Non-Goals:** new content types, multi-track blending (the user practices
one track at a time), track-aware review scheduling.

## Decisions

**1. Pattern-level multipliers, not per-problem tags.** 29 reviewable
judgments beat 150 unreviewable ones; new problems added to the bank
inherit track relevance from their patterns automatically. A problem's
factor = max over its patterns' multipliers (a problem that is even partly
ML-adjacent counts).

**2. The multiplier is multiplicative on the final score, clamped
[0.5, 1.5].** `score × trackFactor(problem)` keeps the four existing
signals' relative structure intact rather than re-tuning weights. For
`sde` every multiplier is 1.0 — same floats, same ordering, parity
fixtures untouched by construction rather than by re-generation.

**3. The table ships as engine data, not DB rows.** A constant module in
`@workspace/coach-engine` (`trackWeights.ts`) — it versions with the
scoring code that interprets it, changes rarely, and needs no query. The
research copy under the change's `research/` is the reviewed source.

**4. `active_track` is a text column with a default, not an enum type.**
Postgres enums make adding a track a migration; a text column with zod
validation (`sde | ai-engineer`) keeps the roster in one place (the API
schema).

**5. Single active track.** The user practices as one persona at a time;
a blend slider is imaginable but nothing asks for it. Switching is one
click and takes effect on the next dealt day (today's frozen assignment
stays frozen — the freeze rule outranks the toggle).

## Risks / Trade-offs

- [Multiplier table is judgment, not measurement] → it passes the owner
  review gate with rationale per boosted pattern; and it only reorders
  *new-problem* selection, never scheduling, so a wrong judgment costs
  ordering, not memory.
- [Frozen day surprises the user after switching tracks] → the settings
  panel says the change applies from tomorrow's plan.

## Migration Plan

Additive column with default `sde` via the existing push flow; rollback is
ignoring the column. No data migration needed.
