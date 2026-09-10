# coach-page — spec delta (coach-console)

## ADDED Requirements

### Requirement: The logged-in area is a console over both dashboards
The account page SHALL present each dashboard the viewer may use as its own
entry: the growth dashboard for the owner, and the practice dashboard for
allowlisted coach users. The practice entry SHALL show live state (today's
graded-of-assigned progress and streak) rather than a bare link. A viewer
entitled to neither SHALL see the account page without either entry and with
no hint that they exist.

#### Scenario: Both dashboards for an entitled viewer
- **WHEN** a signed-in user is both the owner and coach-allowlisted
- **THEN** the account page shows two distinct entries, growth and practice,
  and the practice one carries today's progress

#### Scenario: Neither for an ordinary user
- **WHEN** a signed-in user is neither owner nor allowlisted
- **THEN** the account page shows no dashboard entries

### Requirement: The coach page leads with what to do next
The `/coach` page SHALL show the guidance list above the plan, rendering each
item's tone distinctly, and SHALL show knowledge gaps (open, with hit counts,
and cleared) and pattern strength (as a per-pattern bar with seen/total and
confidence). With no grading history, each panel SHALL say what will fill it
instead of rendering an empty container.

#### Scenario: Fresh account sees intent, not empty boxes
- **WHEN** a user with no grades opens the page
- **THEN** the gaps and pattern panels each explain what will appear after
  the first grillings

### Requirement: Every problem hands over its grilling prompt
Each problem row SHALL offer the exact prompt to start its grilling
(`Grill me on LC <number>`) as a copyable control, because the browser cannot
launch the local session that does the grading.

#### Scenario: Copying the prompt
- **WHEN** the candidate uses a row's grill control
- **THEN** that problem's prompt is copied and the control confirms it
