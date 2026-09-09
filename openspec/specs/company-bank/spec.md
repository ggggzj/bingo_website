# company-bank Specification

## Purpose

The company-frequency data behind problem selection: which companies the
bank covers, where the numbers come from, and how the roster reaches the
user's settings — so "weight my practice toward my target companies" is
steerable and honest about its sources.

## Requirements

### Requirement: Company coverage spans the user's target groups
The problem bank's per-company frequency data SHALL cover, beyond the
existing big-tech set, an owner-approved roster of unicorn/pre-IPO
companies and AI startups. Every frequency value SHALL trace to a research
table that records its sources and collection date; values with weak
public evidence SHALL be marked low-confidence in that table, never
silently invented. The bank file SHALL carry the research collection date
in its metadata.

#### Scenario: Provenance survives into the bank
- **WHEN** the bank is refreshed from an approved research table
- **THEN** the bank metadata names the collection date, and the research
  table with its sources is committed alongside the change

### Requirement: The roster is data, not code
The list of known companies SHALL be derived from the bank's frequency
keys and served to the client with the coach config, so the settings page
never hardcodes company names and a future bank refresh needs no client
change.

#### Scenario: A company added by data alone
- **WHEN** a future bank refresh adds a company's frequency column and
  reseeds
- **THEN** that company appears as selectable in the settings page with no
  code change

### Requirement: Frequency updates pass an owner review gate
No researched frequency table SHALL be merged into the bank without the
owner explicitly approving it (the numbers steer daily practice; bad data
is worse than no data). The review SHALL present the table with its
sources and confidence marks.

#### Scenario: Review before merge
- **WHEN** the research is complete
- **THEN** the flow stops for owner approval, and only the approved table
  is merged and reseeded
