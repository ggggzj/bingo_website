# track-split Specification

## Purpose

Two application tracks, two recommendation profiles: the coach weights new
problems differently for SDE and AI Engineer practice, from one reviewed
pattern-level table, without disturbing scheduling or the default track's
existing behavior.

## Requirements

### Requirement: Track relevance derives from reviewed pattern weights
Track relevance SHALL be defined by a pattern→multiplier table (per
track), reviewed and approved by the owner before merging, with a recorded
rationale for every non-1.0 entry. A problem's track factor SHALL be the
maximum multiplier across its patterns, clamped to [0.5, 1.5]. Problems
added to the bank later SHALL inherit track relevance from their patterns
with no additional tagging.

#### Scenario: Review before merge
- **WHEN** the pattern table is drafted
- **THEN** the flow stops for owner approval, and only the approved table
  ships

### Requirement: The active track steers new-problem selection only
Each user SHALL have an active track (`sde` or `ai-engineer`, default
`sde`). New-problem scoring SHALL multiply by the active track's problem
factor; review scheduling, day freezing and grading SHALL be entirely
unaffected by the track. Switching tracks SHALL take effect from the next
dealt day — a day already frozen keeps its assignment.

#### Scenario: AI track reorders new problems
- **WHEN** two unseen problems score equally except one carries an
  ML-adjacent pattern, and the active track is `ai-engineer`
- **THEN** the ML-adjacent problem ranks first

#### Scenario: Frozen day survives a switch
- **WHEN** the user switches tracks after today's plan was dealt
- **THEN** today's plan is unchanged, and tomorrow's reflects the new
  track

### Requirement: The default track preserves existing behavior exactly
With the `sde` track active, every multiplier SHALL be 1.0 and scoring
SHALL produce bit-identical results to the pre-track engine — the parity
fixtures SHALL pass unmodified.

#### Scenario: Parity is untouched
- **WHEN** the engine test suite runs after this change
- **THEN** the golden parity fixtures pass without regeneration

### Requirement: The track is configurable end to end
The coach config SHALL carry `activeTrack`, validated to the known track
names, exposed on config GET/PUT, and editable as a toggle in the settings
page which states that a change applies from the next plan.

#### Scenario: Toggle round-trips
- **WHEN** the user switches to AI Engineer in settings and saves
- **THEN** the config round-trips `ai-engineer` and persists across
  reload
