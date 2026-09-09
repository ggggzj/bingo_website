# Proposal — company-bank

## Why

Origin: `AceLeetcode/.harness/backlogs/company-bank-expansion.md` (user
decision 2026-09-09). Problem selection weights by company frequency, but
the existing 8 big-tech columns are heuristic guesses, and the user also
targets two groups the bank knows nothing about: unicorn/pre-IPO companies
and AI startups. On top of that, the `/coach` settings panel cannot edit
target companies at all — the weighting exists but the user cannot steer it
from the page.

## What Changes

- **Research** (the bulk of the work): a per-company frequency table over
  the 150-problem bank for the new companies, with sources and collection
  dates recorded, plus recalibration of the existing 8. Proposed roster —
  the owner trims or extends it at the review gate:
  - unicorn / pre-IPO: `databricks`, `stripe`, `airbnb`, `doordash`,
    `snowflake`, `uber`, `coinbase`
  - AI startups: `anthropic`, `xai`, `scale`, `perplexity`
  - AI-startup interview data is sparse in public sources; low-confidence
    values are marked as such in the research table rather than invented.
- **Owner review gate**: the researched table is presented for approval
  before any of it is merged — this is the ticket's own acceptance rule.
- **Bank refresh**: approved numbers land in
  `lib/db/data/coach-problems.json` (with source/date metadata at the top
  level), re-seeded via the existing idempotent seed script; the
  AceLeetcode `data/problems.json` copy follows so the two banks stay
  aligned.
- **Settings UI**: the `/coach` settings panel gains a target-companies
  multi-select over the known company list (served with the config so the
  page never hardcodes the roster).
- **Not in this change**: selector mechanics (unchanged by design), track
  split, sprint cram lists.

## Capabilities

### New Capabilities

- `company-bank`: what the company-frequency data promises — coverage,
  provenance, calibration review, and how the roster reaches the settings
  page.

### Modified Capabilities

- `coach-page`: the settings requirement grows target-company editing.

## Impact

- `lib/db/data/coach-problems.json` + reseed; a small research artifact
  committed under `openspec/changes/company-bank/research/` for the review.
- `lib/api-spec/openapi.yaml`: config response gains the known-company
  roster; regenerated clients.
- `artifacts/api-server`: config route includes the roster (derived from
  the bank's distinct company keys).
- `artifacts/landing`: settings panel multi-select.
- AceLeetcode repo: refreshed `data/problems.json` copy.
