# Tasks — company-bank

## 1. Research (owner-gated)

- [x] 1.1 Build the frequency research table: for each proposed company
      (databricks, stripe, airbnb, doordash, snowflake, uber, coinbase,
      anthropic, xai, scale, perplexity) and each of the 150 bank problems,
      a 0–1 frequency estimate with sources (recent interview reports,
      公开面经, company-tagged problem lists) and a confidence mark;
      recalibrate the existing 8 companies from the same sources. Commit as
      `openspec/changes/company-bank/research/company-frequencies.md` with
      collection dates. Verify by spot-checking that every non-zero value
      cites at least one source.
- [ ] 1.2 **STOP — present the table to the owner for approval** (trim/
      extend roster, dispute values). Only approved data proceeds; record
      the approval in the research file.

## 2. Bank refresh

- [ ] 2.1 Merge approved values into `lib/db/data/coach-problems.json`
      (with `_research_date` metadata), reseed the production and scratch
      databases via `seed-coach`, and refresh the AceLeetcode
      `data/problems.json` copy; verify row count stays 150 and a sampled
      problem shows the new company keys in both files.

## 3. Roster to the page

- [ ] 3.1 Extend the config GET response with `knownCompanies` (distinct
      keys from the bank) in `openapi.yaml` + codegen + the config route;
      verify with a route test asserting the roster matches the seeded
      bank.
- [ ] 3.2 Add the target-companies multi-select to the settings panel
      (chips or checkboxes over `knownCompanies`, saved via the existing
      PUT); verify in the browser: select two companies, save, reload —
      selection persists and the plan's new-problem ordering shifts toward
      them.

## 4. Verification

- [ ] 4.1 Run the full gates (typecheck, build, coach-engine tests,
      api-server tests — parity fixtures must stay green since selector
      mechanics are untouched) and confirm existing behavior unchanged for
      a user with the old 8-company selection.
