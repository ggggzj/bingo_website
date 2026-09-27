# applications-list Specification

## MODIFIED Requirements

### Requirement: Status, stage and note are changed in the browser and persist
A change to an application's status, stage or note SHALL be written to the account and SHALL
survive a reload. These three fields SHALL be the only fields a caller may write.

A caller SHALL be either a signed-in browser session or a personal token whose scope is
`applications`. A token of any other scope SHALL be refused with the same 404 an anonymous caller
gets, so that a credential issued for one part of the account cannot reach another.

#### Scenario: A status change survives a reload
- **WHEN** the owner sets an application to interviewing and reloads
- **THEN** the row still reads interviewing

#### Scenario: A coach token cannot write an application
- **WHEN** a request carries a token issued for practice
- **THEN** the answer is 404 and nothing is written

#### Scenario: A revoked token stops working
- **WHEN** a token is revoked and then used
- **THEN** the answer is 404

### Requirement: Every change is trailed and nothing is overwritten
Every change to status, stage or note SHALL append a row recording when it happened, which hand
made it, and the previous value. A later change SHALL NOT destroy an earlier one.

The recorded hand SHALL distinguish a browser from a script, so that two writers on one row remain
tellable apart afterwards.

#### Scenario: The history of a rejected application is recoverable
- **WHEN** an application moves applied → interviewing → closed
- **THEN** all three states are readable from the trail afterwards

#### Scenario: Two hands on one row stay distinguishable
- **WHEN** a status is set from the browser and a note is later set by the folder's script
- **THEN** the trail attributes each to the hand that made it
