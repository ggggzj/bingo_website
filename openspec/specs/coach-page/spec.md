# coach-page Specification

## Purpose

The interview coach's face: the practice view at `/dashboard/practice`, where
any signed-in user sees today's plan, ticks solved problems, watches their
consistency and review load, and manages the grill-bridge token — while an
anonymous visitor is sent to log in and learns nothing.

## Requirements

### Requirement: The practice view is reached through the shell, not hidden
The practice view SHALL be available to any signed-in user, rendered inside
the dashboard shell at `/dashboard/practice`. An anonymous visitor SHALL be
sent to the login page. The uniform not-found answer for anyone the coach API
refuses SHALL remain, so a caller learns nothing about what exists from the
shape of the refusal.

#### Scenario: An ordinary signed-in user reaches practice
- **WHEN** a signed-in user who has never practiced opens `/dashboard/practice`
- **THEN** they see their own plan for today, dealt from an empty history

#### Scenario: Anonymous visitor
- **WHEN** a signed-out visitor opens `/dashboard/practice`
- **THEN** they are sent to the login page and learn nothing about the feature

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

### Requirement: The coach page leads with what to do next
With no grading history, each panel SHALL
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

### Requirement: Every problem hands over its grilling prompt
Each problem row SHALL offer the exact prompt to start its grilling
(`Grill me on LC <number>`) as a copyable control, because the browser cannot
launch the local session that does the grading.

#### Scenario: Copying the prompt
- **WHEN** the candidate uses a row's grill control
- **THEN** that problem's prompt is copied and the control confirms it
