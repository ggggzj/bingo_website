# coach-page Specification

## Purpose

The interview coach's face: a `/coach` page where the candidate sees today's
plan, ticks solved problems, watches their consistency and review load, and
manages the grill-bridge token — while non-allowlisted visitors see only the
ordinary not-found page.

## Requirements

### Requirement: The page hides itself from non-allowlisted visitors
`/coach` SHALL be routed unguarded. A visitor who is not signed in SHALL be
sent to the login page; a signed-in user whose plan request answers 404
SHALL see the site's ordinary not-found page, indistinguishable from a
route that does not exist. The header's "Coach" link SHALL appear only
when the coach API has answered successfully for the current user.

#### Scenario: Signed-in but not allowlisted
- **WHEN** a signed-in, non-allowlisted user opens `/coach`
- **THEN** they see the standard not-found page and no coach content or
  hint of it in the navigation

### Requirement: Today's plan is visible and tickable
The page SHALL render the plan from `GET /coach/plan`: reviews first (mode,
minutes, overdue days, the weak points the next grilling will open with),
then new problems, each linking to its LeetCode problem page and showing
number, title, difficulty, patterns and minutes. Each problem SHALL have a
solved checkbox wired to `POST /coach/solved`; a problem already graded
today SHALL show its grade with the checkbox disabled (a grade implies
solved and cannot be un-ticked). Budget, sprint state and deferred-review
count SHALL be visible.

#### Scenario: Ticking solved
- **WHEN** the candidate ticks an ungraded problem's checkbox
- **THEN** the page records it via the API and re-renders showing the
  problem solved, without dealing any new problems

#### Scenario: Graded problem is locked
- **WHEN** a problem was graded today
- **THEN** its row shows the grade and its checkbox is disabled

### Requirement: Consistency and forecast panels
The page SHALL show the current streak, the trailing adherence numbers and
a day-status heatmap built from `GET /coach/log` (statuses colored
distinctly, with solved-but-ungraded days visually distinct from complete
ones), and a review-load forecast for the next two weeks from
`GET /coach/forecast` (count and minutes per day).

#### Scenario: Ungraded day stands out
- **WHEN** a past day had all problems solved but none graded
- **THEN** the heatmap renders that day in the ungraded color, not the
  complete color

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


### Requirement: Token management shows the secret exactly once
The page SHALL offer "issue token" (and revoke) actions. On issuance the
plaintext token SHALL be displayed once, with a copy control and an
`export COACH_TOKEN=...` shell hint, plus a warning that it will not be
shown again and that issuing again revokes the old token. The page SHALL
never store the plaintext anywhere after navigation.

#### Scenario: Issue and lose
- **WHEN** the user issues a token, navigates away and returns
- **THEN** the token is no longer displayed anywhere, and the page offers
  issuing a new one

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
