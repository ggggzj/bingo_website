# applications-list Specification

## Purpose

The applications the owner has already sent, in their account: imported from the folder that
produces them, with status, stage and note changed in the browser and every change kept.

## Requirements

### Requirement: The owner's applications are a view in the dashboard rail
`/dashboard/applications` SHALL render the owner's sent applications — company, role, location,
ATS, status, stage, applied date, days waiting and the apply link — with counts by status. The
route serving them SHALL answer **404** to a signed-in non-owner and to an anonymous visitor
alike, so that the rail's entitlement predicate is convenience and the server is the boundary.

#### Scenario: The owner sees the list
- **WHEN** the owner opens `/dashboard/applications`
- **THEN** every imported application is listed with its current status

#### Scenario: A signed-in non-owner cannot reach it
- **WHEN** a signed-in user who is not the owner requests the applications
- **THEN** the answer is 404, the same answer an anonymous request gets

### Requirement: Status, stage and note are changed in the browser and persist
A change to an application's status, stage or note SHALL be written to the account and SHALL
survive a reload. These three fields SHALL be the only fields the browser may write.

#### Scenario: A status change survives a reload
- **WHEN** the owner sets an application to interviewing and reloads
- **THEN** the row still reads interviewing

### Requirement: Every change is trailed and nothing is overwritten
Every change to status, stage or note SHALL append a row recording when it happened, which hand
made it, and the previous value. A later change SHALL NOT destroy an earlier one.

#### Scenario: The history of a rejected application is recoverable
- **WHEN** an application moves applied → interviewing → closed
- **THEN** all three states are readable from the trail afterwards

### Requirement: Re-importing refreshes the machine half and never the human half
Running the import again SHALL update the imported fields of an existing application and SHALL
NOT change its status, stage or note. Re-importing SHALL NOT duplicate an application.

#### Scenario: A hand-written note survives the next import
- **WHEN** the owner writes a note in the browser and the import runs again
- **THEN** the note is unchanged and the application appears once

### Requirement: The page states how old the imported half is
The view SHALL state when the import last ran, so that an absence of recent applications reads as
a stale import rather than as a quiet week.

#### Scenario: The header carries the import date
- **WHEN** the owner opens the view
- **THEN** the header states when the applications were last imported

### Requirement: An archived JD is readable, and its absence is stated
Where a JD body was archived, the row SHALL open it. Where none was archived, the row SHALL say
so rather than offer a control that leads nowhere.

#### Scenario: A row with an archived JD opens it
- **WHEN** the owner opens the JD of an application that has one
- **THEN** the archived text is shown

#### Scenario: A row without one says so
- **WHEN** an application has no archived JD
- **THEN** the row states that no copy was kept
