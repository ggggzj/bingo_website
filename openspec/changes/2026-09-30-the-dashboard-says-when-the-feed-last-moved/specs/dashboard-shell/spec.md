# dashboard-shell Specification

## ADDED Requirements

### Requirement: The Growth view says when the job feed last moved

The Growth view SHALL state, without a click, when the job feed last synced. The statement SHALL
name the job feed, so that it cannot be read as a claim about the installs and registrations shown
beside it.

The statement SHALL be visually distinct from the tile row. Every tile there is a count whose
polarity is "more is better"; this is the view's only alarm and its polarity is the opposite.

Freshness past **30 hours** SHALL read as not-normal rather than as an ordinary number. Thirty is
the stated threshold: the upstream sync is daily, so a healthy value sits under about 24, and 30
allows one full cycle plus headroom. There SHALL be one threshold, not a graded scale — a second
level is a second thing to remember, and a warning level left standing becomes the new normal.

"Never synced" SHALL be a state of its own and SHALL NOT be rendered as a number. Upstream reports
both fields as null together when no sync has ever run, and rendering that as `0` would read as
"just now" — the inverse of the truth.

The view SHALL NOT compute freshness from the postings themselves. A posting's date is the
employer's, so a sync that runs and stores nothing new would leave it unchanged while the sync time
moves; those two quantities disagreeing is a diagnosis, not a substitute.

This statement is for the owner. It SHALL NOT appear on any screen a non-owner can reach, and the
uniform 404 that these routes answer to everyone who is not the owner SHALL NOT change.

#### Scenario: A feed that synced recently reads as normal
- **WHEN** the owner opens the Growth view and the feed synced 2 hours ago
- **THEN** the view states when the job feed last synced, and does not read as an alarm

#### Scenario: A stopped feed is visible without a click
- **WHEN** the owner opens the Growth view and the feed last synced 288 hours ago
- **THEN** the statement reads as not-normal, and says how stale the job feed is

#### Scenario: Thirty hours is the line
- **WHEN** the feed last synced 31 hours ago
- **THEN** the statement reads as not-normal
- **AND WHEN** it last synced 29 hours ago
- **THEN** it does not

#### Scenario: Never having synced is not "just now"
- **WHEN** the upstream reports no last sync at all
- **THEN** the view says the feed has never synced, and shows no hour count

#### Scenario: A non-owner sees none of it
- **WHEN** somebody who is not the owner reaches the Growth view
- **THEN** they get the same not-found page they got before, with nothing about the feed in it
