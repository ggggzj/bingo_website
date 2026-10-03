# front-door Specification (delta)

## MODIFIED Requirements

### Requirement: The front page carries real postings, not a description of them

`/` SHALL render a list of open postings from employers with certified H-1B filing history,
reachable without signing in. Every row SHALL carry the employer's certified filing count and the
years it covers, and SHALL NOT carry a tick, a checkmark or the word "verified" in their place.

The list SHALL be US software internships. A posting whose location reads as outside the United
States SHALL NOT appear on this page in any state, signed in or out. A comma followed by two
letters SHALL NOT, on its own, outweigh a foreign place named in the same location.

#### Scenario: A stranger opens the front page
- **WHEN** `/` is opened by somebody with no session and the list is not empty
- **THEN** postings are rendered, each showing the employer's certified filing count and years

#### Scenario: A posting outside the United States
- **WHEN** the upstream returns a posting located in Sydney, London or Singapore
- **THEN** it is absent from the list, whether or not the visitor has a session

#### Scenario: A foreign location ending in a code that is also a US state
- **WHEN** the upstream returns a posting located at `Toronto, ON, CA`, `Berlin, DE`,
  `Buenos Aires, AR` or `Canada - Remote (ON, AB, BC, or NS Only)`
- **THEN** it is absent from the list
  (was: listed as a US posting — `CA` read as California, `DE` as Delaware, `AR` as Arkansas,
  `or` as Oregon)

#### Scenario: Regression guard — a posting open in the US and abroad
- **WHEN** the upstream returns a posting located at `London, UK; San Francisco, CA` or
  `Toronto, NY, SEA, SF`
- **THEN** it is listed, as before

#### Scenario: A location string that cannot be read
- **WHEN** a posting's location is `Hybrid`, `Distributed` or `In-Office`
- **THEN** the row is listed and marked as unread, and is never presented as being in the
  United States
