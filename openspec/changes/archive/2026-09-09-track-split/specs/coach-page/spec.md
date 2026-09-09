# coach-page — spec delta (track-split)

## MODIFIED Requirements

### Requirement: Settings are editable in place
The page SHALL show the coach config and let the user change daily
minutes, new-per-day, sprint window, interview date, target companies
(a multi-select over the server-provided company roster) and the active
track (an SDE / AI Engineer toggle, labeled as applying from the next
plan) via `PUT /coach/config`, surfacing the server's 422 as an inline
error without losing the edit.

#### Scenario: Setting the interview date
- **WHEN** the user sets a valid interview date and saves
- **THEN** the page shows the updated value returned by the server

#### Scenario: Choosing target companies
- **WHEN** the user selects companies from the roster and saves
- **THEN** the config round-trips them and subsequent plans weight new
  problems toward those companies

#### Scenario: Switching the track
- **WHEN** the user toggles to AI Engineer and saves
- **THEN** the config round-trips `ai-engineer` and the panel notes it
  applies from the next plan
