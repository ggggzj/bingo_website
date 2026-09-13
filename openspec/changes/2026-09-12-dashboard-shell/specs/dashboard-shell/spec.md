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
