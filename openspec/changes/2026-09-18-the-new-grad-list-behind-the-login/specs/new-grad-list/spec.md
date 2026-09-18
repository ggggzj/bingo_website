# new-grad-list

The signed-in owner's list of US early-career software postings: what is open, what arrived
since they last looked, and what closed.

## ADDED Requirements

### Requirement: The list is the owner's and the refusal is the server's

The view SHALL appear in the `/dashboard` rail only for the owner, and its route SHALL refuse
every other caller with **404**, never 403 — the rule already in force for the coach.

The rail's `entitled` predicate SHALL NOT be the only thing standing between a caller and the
data. Reaching the route's address without entitlement SHALL give the same answer as a route
that does not exist.

#### Scenario: A signed-in non-owner
- **WHEN** a signed-in user who is not the owner requests the route
- **THEN** the response is 404, and the rail does not list the view

#### Scenario: A signed-out visitor
- **WHEN** a visitor with no session requests the route
- **THEN** the response is 404

### Requirement: Early-career is decided by title terms, and nothing is labelled

The list SHALL narrow to postings whose titles carry an early-career term **and** a
software-role term **and** no seniority term. The seniority exclusions SHALL be applied after
the terms and SHALL win.

The page SHALL NOT assign a seniority to any posting, SHALL NOT render a seniority badge, and
SHALL state that it is a title search. This preserves, and does not amend, the requirement in
`jobs-page` that seniority narrow by title and label nothing.

Internship postings SHALL be excluded. That list is a different product with its own gate.

#### Scenario: A new-grad role not titled "new grad"
- **WHEN** the list is built and the upstream holds a posting titled
  `Entry Level Java Developer Associate`
- **THEN** it is listed, and it carries no seniority badge

#### Scenario: A title that satisfies a term and an exclusion
- **WHEN** the upstream holds a posting titled `Senior Software Engineer I`
- **THEN** it is not listed

#### Scenario: An internship
- **WHEN** the upstream holds a posting titled `Software Engineering Intern`
- **THEN** it is not listed

### Requirement: A location that cannot be read is marked, never assumed

Each posting SHALL resolve to exactly one of: reads as US, cannot be read, plainly elsewhere.
A posting that reads as US SHALL be listed. One that cannot be read SHALL be listed **and
marked as unconfirmed**. One that is plainly elsewhere SHALL be absent.

A location string that cannot be read SHALL NOT resolve to US.

#### Scenario: A location naming several places without saying where
- **WHEN** a posting's location is `2 Locations`
- **THEN** it is listed and marked as unconfirmed

#### Scenario: A posting abroad
- **WHEN** a posting's location is `London, UK`
- **THEN** it is not listed

### Requirement: The page states what it cannot see

The page SHALL name its own coverage gap wherever the list is shown, including when the list
is empty: how many boards feed it, and that employers running their own careers sites are not
among them.

#### Scenario: An empty list
- **WHEN** no posting matches
- **THEN** the page states the coverage gap rather than showing an empty box

### Requirement: New since the last visit is recorded, not guessed

"New since your last visit" SHALL be computed against a marker stored server-side for that
user, not against browser storage.

The marker SHALL advance only on an explicit acknowledgement. Rendering the view, reloading
it, or opening it on a second device SHALL NOT advance it.

A posting that has closed since the marker SHALL be shown as closed rather than omitted.

#### Scenario: Opening the view twice without acknowledging
- **WHEN** the owner opens the view, and opens it again without acknowledging
- **THEN** the same postings are still reported as new

#### Scenario: Acknowledging
- **WHEN** the owner acknowledges, and then re-opens the view
- **THEN** no posting is reported as new, and postings that closed are shown as closed

### Requirement: The list states facts and predicts nothing

Each row SHALL carry the employer's certified filing count and tier, the posting's own refusal
verdict where one has been read, the posted date and the days since.

The list SHALL NOT render a match score, a percentage, an interview-rate claim, or an
application deadline. Ordering SHALL be by observable facts and SHALL show its reason.

#### Scenario: A posting whose description was never read
- **WHEN** a posting carries no refusal verdict
- **THEN** the row says nothing about that posting refusing sponsorship
