# coach-page — spec delta

## Purpose

The interview coach's face: a `/coach` page where the candidate sees today's
plan, ticks solved problems, watches their consistency and review load, and
manages the grill-bridge token — while non-allowlisted visitors see only the
ordinary not-found page.

## ADDED Requirements

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
minutes, new-per-day, sprint window and interview date via
`PUT /coach/config`, surfacing the server's 422 as an inline error without
losing the edit.

#### Scenario: Setting the interview date
- **WHEN** the user sets a valid interview date and saves
- **THEN** the page shows the updated value returned by the server

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
