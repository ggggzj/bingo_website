# front-door Specification (delta)

## ADDED Requirements

### Requirement: The front page carries real postings, not a description of them

`/` SHALL render a list of open postings from employers with certified H-1B filing history,
reachable without signing in. Every row SHALL carry the employer's certified filing count and the
years it covers, and SHALL NOT carry a tick, a checkmark or the word "verified" in their place.

The list SHALL be US software internships. A posting whose location reads as outside the United
States SHALL NOT appear on this page in any state, signed in or out.

#### Scenario: A stranger opens the front page
- **WHEN** `/` is opened by somebody with no session and the list is not empty
- **THEN** postings are rendered, each showing the employer's certified filing count and years

#### Scenario: A posting outside the United States
- **WHEN** the upstream returns a posting located in Sydney, London or Singapore
- **THEN** it is absent from the list, whether or not the visitor has a session

#### Scenario: A location string that cannot be read
- **WHEN** a posting's location is `Hybrid`, `Distributed` or `In-Office`
- **THEN** the row is listed and marked as unread, and is never presented as being in the
  United States

### Requirement: The preview states truthfully how much it is withholding

Without a session the page SHALL render at most a fixed number of rows and SHALL state how many
postings matched in total, drawn from the same count the signed-in answer uses. It SHALL NOT state
a total it did not receive, and SHALL NOT imply more rows exist when the preview is the whole list.

No single employer SHALL occupy more than two rows of the preview. The signed-in list SHALL NOT be
capped this way.

#### Scenario: More matched than shown
- **WHEN** 31 postings match and nobody is signed in
- **THEN** at most eight are rendered and the page offers the rest behind Google sign-in, naming
  the true remaining count

#### Scenario: Fewer matched than the preview holds
- **WHEN** five postings match and nobody is signed in
- **THEN** all five are rendered and the page does not offer more behind sign-in

#### Scenario: One employer posting most of the list
- **WHEN** the newest matching postings are six from one employer and two from others
- **THEN** the preview renders at most two of that employer's and fills the rest from others

### Requirement: Signing in expands the list where it stands

A visitor with a session arriving at `/` SHALL remain on `/` and SHALL receive every matching
posting. They SHALL NOT be redirected away from the page that holds the list, and SHALL NOT be
shown a sign-in control for the account they already hold.

No redirect on this page SHALL fire before the server has said who the visitor is.

#### Scenario: A signed-in visitor opens the front page
- **WHEN** `/` is opened by a browser holding a valid session
- **THEN** the whole list is rendered, no sign-in control appears, and no navigation occurs

#### Scenario: The answer has not arrived yet
- **WHEN** `/` is opened and the request asking who this is has not resolved
- **THEN** no navigation occurs

### Requirement: The page states how fresh it is and claims nothing beyond that

The list SHALL state the date of the newest posting it is showing. It SHALL NOT describe itself as
live, daily or updated unless that wording is tied to the stated date.

The page SHALL state that the list is built from the employer job boards this product polls, and
that employers running their own careers sites are not among them.

#### Scenario: A feed that has not moved for days
- **WHEN** the newest posting the page shows was posted eleven days ago
- **THEN** the page states that date and does not call the list live, daily or updated

#### Scenario: Nothing matched
- **WHEN** no posting matches
- **THEN** the page renders the note about which boards it polls, and no empty list frame

#### Scenario: The upstream is unreachable
- **WHEN** the postings cannot be loaded
- **THEN** the introduction and the sign-in still render, and a line says the list could not be
  loaded

### Requirement: The list is narrowed by absence, never by assertion

The server SHALL decide which postings appear. It SHALL NOT render, store or return a seniority,
category or experience label for any posting, and SHALL NOT infer one from a title. A posting that
does not qualify is absent rather than labelled.

A title naming the target season SHALL sort ahead of the rest and SHALL NOT be the condition for
appearing.

#### Scenario: A senior posting reaching the net
- **WHEN** the upstream returns `Senior Software Engineer` for an `intern` query
- **THEN** it is absent, and no row anywhere carries a seniority label

#### Scenario: A title that matched only on a word boundary
- **WHEN** the upstream returns `International Program Manager` for an `intern` query
- **THEN** it is absent

#### Scenario: An internship naming no season
- **WHEN** a matching posting's title names no year
- **THEN** it is listed, after the postings naming the target season

### Requirement: Reading the front page writes nothing

`GET /api/internships` SHALL be safe for both visitors: it SHALL write no row, set no cookie
and record nothing about who asked, whether or not a session is present.

#### Scenario: A stranger and a signed-in visitor each load the page
- **WHEN** either loads `/`
- **THEN** nothing is written, and the response differs only in how many postings it carries
