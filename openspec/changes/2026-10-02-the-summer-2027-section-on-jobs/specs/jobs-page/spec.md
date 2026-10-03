# jobs-page Specification (delta)

## ADDED Requirements

### Requirement: A Summer 2027 internships section shows the front page's list, counted honestly

`/jobs` SHALL offer two sections: all roles, and Summer 2027 internships. The internships section
SHALL list exactly what `GET /api/internships` returns for the caller, SHALL show that answer's
`total` as its count, and SHALL NOT offer any control that narrows the fetched rows. The chosen
section SHALL be carried in the URL.

No row in either section SHALL carry an internship, season or seniority badge. The section's name
SHALL be presented as the name of the list, with a line saying it sorts Summer 2027 first and is
not limited to it.

#### Scenario: Opening the internships section
- **WHEN** a signed-in visitor opens `/jobs?section=summer-2027`
- **THEN** the list shows the postings `/api/internships` returned, the count equals its `total`,
  and the filter row is not rendered

#### Scenario: A title that only contains "intern"
- **WHEN** the upstream holds `Director, US International Tax Planning` or
  `Principal Software Developer - Query Engine, Database Internals`
- **THEN** neither appears in the internships section

#### Scenario: Selecting an internship
- **WHEN** a row in the internships section is selected
- **THEN** the same detail pane opens, showing the employer's filings and the posting's own
  sponsorship statement as separate claims

#### Scenario: Regression guard — all roles is unchanged
- **WHEN** a visitor opens `/jobs` with no `section` parameter
- **THEN** the page, its filter row, its count and its paging behave exactly as before

#### Scenario: Regression guard — the picker gains nothing
- **WHEN** the filter row's role presets are listed
- **THEN** none is labelled Internship and none searches `intern`
