# coach-page — spec delta (dashboard-shell)

## REMOVED Requirements

### Requirement: The logged-in area is a console over both dashboards
Superseded by `dashboard-shell`, which owns the logged-in area now. Its
"each dashboard the viewer may use as its own entry" and the scenario
asserting two distinct entries are replaced by one shell with a rail. What
that requirement was protecting — a viewer entitled to neither seeing no hint
that either exists — is carried forward in `dashboard-shell`'s rail
requirement, unchanged.

### Requirement: The page hides itself from non-allowlisted visitors
Renamed and rewritten as "The practice view is reached through the shell, not
hidden" below. There is no longer a signed-in visitor to hide from; what the
original protected — not confirming the feature's existence to probers —
survives as the anonymous 404 and the login redirect.

## ADDED Requirements

### Requirement: The practice view is reached through the shell, not hidden
The practice view SHALL be available to any signed-in user, rendered inside
the dashboard shell at `/dashboard/practice`. An anonymous visitor SHALL be
sent to the login page. The uniform not-found answer for anyone the coach API
refuses SHALL remain, so a caller learns nothing about what exists from the
shape of the refusal.

This replaces "The page hides itself from non-allowlisted visitors" and the
header's coach link appearing only for allowlisted users. There is no longer a
signed-in visitor to hide from; what the original protected — not confirming
the feature's existence to probers — survives as the anonymous 404.

#### Scenario: An ordinary signed-in user reaches practice
- **WHEN** a signed-in user who has never practiced opens `/dashboard/practice`
- **THEN** they see their own plan for today, dealt from an empty history

#### Scenario: Anonymous visitor
- **WHEN** a signed-out visitor opens `/dashboard/practice`
- **THEN** they are sent to the login page and learn nothing about the feature

## MODIFIED Requirements

### Requirement: The coach page leads with what to do next
Unchanged except for the zero state. With no grading history, each panel SHALL
still say what will fill it rather than render an empty container — and the
view SHALL additionally state that the schedule advances only when a grilling
grades the problem, and that grilling runs locally today. That statement SHALL
NOT promise a browser-based grilling path, and SHALL NOT read as an error:
dealing today's problems is a working thing to do.

This requirement's zero state used to be an edge case for one owner's fresh
account. Opening practice to every signed-in user makes it the first thing
every new user reads, and a page that showed only empty panels would leave
them ticking problems for a week before working out that nothing was being
scheduled.

#### Scenario: A brand-new user's first visit
- **WHEN** a signed-in user with no reviews and no day log opens the practice
  view
- **THEN** the gaps and pattern panels explain what will fill them, and the
  view states that grading comes from a grilling session run locally

#### Scenario: No self-grading affordance appears
- **WHEN** any user views a problem row
- **THEN** nothing on the page lets them record a grade themselves
