# Proposal — track-split

## Why

Origin: `AceLeetcode/.harness/backlogs/track-split.md` (user decision
2026-09-09). The candidate applies to both SDE and AI Engineer roles, but
the coach recommends identically for both: nothing in the schema, engine or
page knows the concept of a track. Decision already made by the user: the
two tracks get different problem weights — AI Engineer leans toward
ML-adjacent patterns, SDE keeps full coverage.

## What Changes

- **Track relevance is defined at the pattern level, not per problem**: a
  reviewed table mapping the bank's 29 patterns to an AI-track multiplier
  (most patterns 1.0; ML-adjacent ones — matrix, math, heap/top-k,
  hash-map, prefix-sum, simulation-flavored DP — boosted). Every problem's
  track relevance derives from its patterns; 29 reviewed judgments instead
  of 150 invented ones.
- **Owner review gate**: the pattern→multiplier table is approved by the
  owner before merging, same discipline as company-bank's frequencies.
- **Config gains one field**: `activeTrack` (`sde` | `ai-engineer`,
  default `sde`), stored per user, exposed in the API config and as a
  toggle in `/coach` settings.
- **Selector blends the multiplier** for the active track into new-problem
  scoring; `sde` uses multiplier 1.0 everywhere, so existing behavior is
  byte-identical for the default track and the parity fixtures stay green
  untouched.
- **Not in this change**: non-LeetCode content (ML system design etc. —
  future work), per-problem manual tags, any change to review scheduling
  (tracks steer *new problem* selection only).

## Capabilities

### New Capabilities

- `track-split`: how track relevance is defined and reviewed, how the
  active track changes new-problem selection, and the guarantee that the
  default track preserves existing behavior exactly.

### Modified Capabilities

- `coach-page`: the settings requirement grows the track toggle.

## Impact

- `lib/db`: `active_track` column on `coach_config` (additive); the
  pattern table committed under this change's `research/`.
- `lib/coach-engine`: pattern→multiplier data + a track factor in
  `scoreProblem`/`rankNewProblems`; new unit tests; parity fixtures
  untouched.
- `lib/api-spec` + codegen: `activeTrack` on config get/put.
- `artifacts/api-server`: config route field + validation.
- `artifacts/landing`: a two-option track toggle in settings.
