# dashboard-shell — spec delta (dashboard-shell)

## ADDED Requirements

### Requirement: The logged-in area is one shell, and a view is a path
`/dashboard/<view>` SHALL render one shell — identity, sign-out and the view
switcher — with the selected view beside it. A view SHALL be addressed by path
segment, so that it is linkable and survives a reload. `/dashboard` with no
segment, and `/dashboard/<unknown>`, SHALL redirect to the first view in rail
order that this viewer may use. `/coach` SHALL redirect to
`/dashboard/practice` rather than answer not-found, because it is the address
in existing bookmarks. An anonymous visitor SHALL be sent to the login page.

#### Scenario: A view is linkable
- **WHEN** a signed-in user opens `/dashboard/practice` directly and reloads
- **THEN** the practice view is shown both times

#### Scenario: No segment picks the first entitled view
- **WHEN** the owner opens `/dashboard`
- **THEN** they are redirected to `/dashboard/growth`

#### Scenario: An old coach link still works
- **WHEN** a signed-in user opens `/coach`
- **THEN** they land on `/dashboard/practice`

### Requirement: The rail lists only what this viewer may use
The shell SHALL draw one rail entry per view the viewer is entitled to: the
growth view for the owner, and the practice view for any signed-in user. A
viewer SHALL see no entry, and no hint, for a view they may not use.

#### Scenario: Owner sees both
- **WHEN** the owner opens the dashboard
- **THEN** the rail lists growth and practice

#### Scenario: An ordinary user sees practice only
- **WHEN** a signed-in non-owner opens the dashboard
- **THEN** nothing on the page names or links the growth view

### Requirement: The practice entry carries today's progress
The rail's practice entry SHALL show today's live state beneath its label —
graded-of-assigned, and how many are solved but not yet grilled — rather than
the bare word. When nothing is assigned today it SHALL say so. While the plan
is still loading, or the coach API refuses, the entry SHALL show the label
alone rather than a placeholder or an error. This carries forward what the old
account-page entry showed, so that a viewer looking at another view can see
where today's practice stands without switching to it.

The rail reaches that state through the registry — a view entry may declare a
status component — never by the rail itself knowing about the coach. Because
the rail is not drawn for a viewer with a single view, the line is seen by
viewers who have somewhere else to be; a single-view viewer is already on the
practice view, which shows the same numbers in its own panel.

#### Scenario: Progress under the practice entry
- **WHEN** the owner opens `/dashboard/growth` with 5 problems assigned today,
  2 graded and 3 solved
- **THEN** the practice rail entry reads "Today: 2 of 5 graded · 1 solved but
  not grilled"

#### Scenario: Nothing due
- **WHEN** the owner opens the dashboard and nothing is assigned today
- **THEN** the practice rail entry says nothing is due today

#### Scenario: The plan is refused
- **WHEN** the coach API answers 404 to the plan request
- **THEN** the practice rail entry shows its label and no progress line, and
  nothing on the page reads as an error

### Requirement: One view is not a choice
A viewer entitled to exactly one view SHALL be shown that view with no
switcher control rendered at all — not a one-item rail, and not a disabled
one. The shell SHALL still own identity and sign-out in that case.

#### Scenario: Single-entitlement viewer
- **WHEN** a signed-in non-owner opens the dashboard
- **THEN** the practice view fills the shell and no rail control is present,
  while sign-out remains available

### Requirement: Entitlement draws the rail; the server still refuses
What the rail lists SHALL be a convenience only. Each view SHALL keep its own
server-side refusal, so that reaching a view's address without entitlement
gives the same answer it gave before this shell existed.

#### Scenario: Typing a growth URL as a non-owner
- **WHEN** a signed-in non-owner opens `/dashboard/growth`
- **THEN** they see the site's ordinary not-found page, because the stats API
  answers 404

### Requirement: The account page keeps identity and one way in
`/account` SHALL show who the viewer is, offer sign-out, and offer a single
entry into the dashboard. It SHALL NOT enumerate the views — that is the
rail's job — and it SHALL remain useful to a signed-in user regardless of
what they are entitled to.

#### Scenario: Account page after the shell exists
- **WHEN** a signed-in user opens `/account`
- **THEN** they see their email, one dashboard entry, and sign-out, and no
  per-view entries

### Requirement: The site header offers the dashboard to signed-in visitors
The marketing header SHALL show a dashboard link when the viewer is signed in
and a login link when they are not, never both, in the bar and in the mobile
sheet alike. It SHALL NOT carry a separate coach link.

#### Scenario: Signed-in visitor on the home page
- **WHEN** a signed-in user opens the home page
- **THEN** the header offers the dashboard and does not invite them to log in
