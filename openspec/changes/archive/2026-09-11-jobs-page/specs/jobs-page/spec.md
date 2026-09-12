# Spec — jobs-page

The public job feed on this site: what it renders, what backs each control, and what it is
allowed to claim.

## ADDED Requirements

### Requirement: The page renders a split pane and works narrow

`/jobs` SHALL render a scrolling column of posting cards beside a detail pane for the
selected posting. At narrow viewports the panes SHALL stack, and the page SHALL NOT scroll
horizontally at 320px.

#### Scenario: A narrow viewport
- **WHEN** the page is opened at 320px wide
- **THEN** the panes are stacked and no horizontal scrollbar appears

### Requirement: Selecting a posting changes the pane, not the page

Selecting a card SHALL show that posting in the detail pane without a page navigation, and
SHALL reflect the selection in the URL so a posting can be linked to and shared.

#### Scenario: Opening a shared link
- **WHEN** a URL naming a posting is opened directly
- **THEN** that posting is shown in the detail pane

### Requirement: The employer's claim and the posting's claim are shown separately

Every posting SHALL carry the employer's certified filing count and the years it covers.
Where the posting's own description refuses sponsorship, that SHALL be shown as a separate
statement about the posting.

The page SHALL NOT merge the two into one badge or one verdict.

#### Scenario: A sponsoring employer posts a refusing role
- **WHEN** an employer with certified filings has a posting whose description refuses
- **THEN** both are shown, and the page distinguishes which is about the employer and which
  is about the posting

### Requirement: An unread description is never rendered as a refusal

Where the posting's refusal verdict is absent, the page SHALL show nothing about the
posting's own text. Absent means no description has been read, which is not a refusal, and
rendering it as one would be a false claim about a real employer.

#### Scenario: A posting whose description was never read
- **WHEN** a posting carries no refusal verdict
- **THEN** the card and the detail pane say nothing about that posting refusing sponsorship

### Requirement: Seniority and category narrow by title and label nothing

The seniority and category controls SHALL send a title search. The page SHALL NOT assign a
seniority or a category to any posting, and SHALL NOT render a seniority or category badge
on any row.

Nothing upstream stores either value, and inferring one from a title is how a reference
product came to tag "Sr. Solutions Architect" as entry level.

#### Scenario: Searching for early-career roles
- **WHEN** the seniority control is set to new grad
- **THEN** postings whose titles contain those words are listed, a posting titled
  "Sr. Solutions Architect" is not listed, and no listed row carries a seniority badge

### Requirement: The sponsorship control offers only choices the server can honour

The sponsorship control SHALL offer: hide postings whose description refuses, and
everything. It SHALL default to hiding refusals.

Both narrow on a claim about the posting's own description, and every option SHALL be one
the request to the server carries.

A third — only employers with filing history — was specified, built, and removed at review.
Nothing upstream takes a minimum-filings floor, so it could only have filtered the rows
already fetched, while the result count silently changed from "roles matching your filters"
to "roles on this page that survived a second filter". A control that narrows what the
reader can see rather than what they asked for SHALL NOT be offered.

#### Scenario: Default
- **WHEN** the page is first opened
- **THEN** postings whose description refuses sponsorship are absent, and postings whose
  description has not been read are present

#### Scenario: Every option reaches the server
- **WHEN** any sponsorship option is chosen
- **THEN** the request carries that choice, and no sponsorship filtering is applied to the
  page after it arrives

### Requirement: Applying leaves for the employer, and an unsafe link is not rendered

The apply control SHALL link to the employer's own posting. Where no usable URL was served,
the card SHALL show no apply link and SHALL NOT substitute a URL from another field.

Postings are third-party text. The page SHALL render them through normal escaping and SHALL
NOT construct markup from them.

#### Scenario: A posting whose link was withheld
- **WHEN** a posting arrives without a usable apply URL
- **THEN** it is still listed and readable, with no apply link

### Requirement: The page states its own coverage and its evidence

The page SHALL say what the feed covers and what it does not, and SHALL name where its
sponsorship evidence comes from.

The feed is drawn from a limited set of employer boards. Saying so is what makes that a
stated scope rather than a defect a reader discovers by searching for a company and finding
nothing.

#### Scenario: A reader looking for the limits
- **WHEN** the page is read
- **THEN** it states that the feed covers postings from employers with sponsorship history
  rather than every job, and names the source of the filing data

### Requirement: The result count matches the list

The count shown SHALL be the number of postings the current filters matched, counted the
same way the list pages through them.

#### Scenario: Filters narrow the list
- **WHEN** a filter is applied
- **THEN** the count changes to what that filter matched, and paging to the end reaches that
  many postings

### Requirement: Only allowlisted parameters reach the upstream service

The server route SHALL build the upstream request from an allowlist, one entry per
parameter, each named, typed, bounded and encoded. Unrecognised parameters SHALL be dropped,
and an out-of-range value SHALL be dropped rather than refused so the page still renders.

The route SHALL NOT be steerable into requesting a different upstream path.

#### Scenario: An unknown parameter
- **WHEN** a caller adds a parameter the allowlist does not name
- **THEN** it does not reach the upstream request

#### Scenario: Text carrying URL syntax
- **WHEN** a text parameter contains a quote, an ampersand or a fragment marker
- **THEN** it is encoded as a value and cannot change which upstream path is requested

### Requirement: The shared secret lives in one module and never in a log

The upstream secret SHALL be read and sent in exactly one module, as a header rather than a
query parameter. When it is unset the module SHALL fail loudly rather than send an empty
credential. Errors SHALL name the path and the status and SHALL NOT contain the secret.

#### Scenario: The secret is unset
- **WHEN** the service is reached without the secret configured
- **THEN** it fails with a message naming the missing variable, and sends no request
