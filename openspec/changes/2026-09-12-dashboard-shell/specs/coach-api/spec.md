# coach-api — spec delta (dashboard-shell)

## MODIFIED Requirements

### Requirement: Coach access is a session, refused uniformly
Access to every coach endpoint SHALL be limited to callers the server can
resolve: a signed-in session, or a valid unrevoked personal token. Any other
request SHALL receive the same uniform 404 the stats routes use — never a
401/403 that confirms the routes exist.

This replaces "Coach access is an env allowlist, closed by default". The
allowlist existed to keep the coach shut while it was in development; the
owner ended that phase on 2026-09-12. `COACH_EMAILS` is deleted rather than
inverted, because an inverted variable would make the same empty value mean
"everybody" where it used to mean "nobody" — restoring an old deployment
config would then open the coach silently.

#### Scenario: An ordinary signed-in user calls a coach route
- **WHEN** a signed-in user who is on no list calls `GET /api/coach/plan`
- **THEN** the response is their own plan, dealt from their own history

#### Scenario: Signed-out caller probes a coach route
- **WHEN** a signed-out caller calls any coach endpoint
- **THEN** the response is 404 with the generic not-found body

#### Scenario: One user cannot reach another's rows
- **WHEN** a signed-in user calls any coach endpoint
- **THEN** the rows read and written are those of the caller resolved from
  the session or token, and no request parameter can select another user

### Requirement: Personal API tokens for browserless access
A signed-in user SHALL be able to create a personal API token via the
session-authenticated token endpoint. The plaintext token SHALL be returned
exactly once at creation; the server SHALL store only its SHA-256 hash in a
revocable row. Creating a new token SHALL revoke the caller's previous tokens
(one live token per user), and a revoke endpoint SHALL invalidate the current
token. Coach endpoints SHALL accept a valid, unrevoked token via
`Authorization: Bearer <token>` as equivalent to that user's session. The
token endpoint SHALL continue to take the session cookie only, never a bearer
token, so a stolen token cannot mint its own successor.

Only the eligibility clause changes: "an allowlisted user" becomes "a
signed-in user". Every other property — single live token, hash at rest,
rotation revoking the predecessor, cookie-only issuance — is unchanged.

#### Scenario: Token round-trip
- **WHEN** a signed-in user POSTs to the token endpoint with a valid session,
  then calls `GET /api/coach/plan` with only
  `Authorization: Bearer <returned token>`
- **THEN** the plan request succeeds as that user

#### Scenario: Rotation revokes the predecessor
- **WHEN** a user issues a second token and then presents the first
- **THEN** the request with the first token receives the uniform 404

#### Scenario: A token cannot mint a successor
- **WHEN** a caller presents only a bearer token to the token endpoint
- **THEN** the response is the uniform 404

### Requirement: Config endpoints expose per-user coach settings
Unchanged in behavior; the eligibility wording follows the access requirement
above. `GET /api/coach/config` SHALL return the caller's coach settings,
creating the row with defaults (60 minutes, 2 new per day, 14-day sprint
window, no interview date, empty target companies) on first read.
`PUT /api/coach/config` SHALL validate and update only the caller's row;
interview date must be a valid ISO date or null, numeric fields must be
positive integers within sane bounds, and invalid input SHALL be a 422
leaving the row unchanged.

#### Scenario: First read creates defaults
- **WHEN** a signed-in user with no config row fetches config
- **THEN** the response carries the default values and a row now exists

## REMOVED Requirements

### Requirement: Unset allowlist closes the feature
The scenario "`COACH_EMAILS` is unset and any user calls any coach endpoint →
the uniform 404" is removed with the variable itself. The property it
protected — that a misconfiguration fails closed rather than open — no longer
has a variable to protect: access is now a session, and a caller the server
cannot resolve still gets the uniform 404.

### Requirement: Tokens do not bypass the allowlist
Removed with the allowlist. A token remains bound to one user, revocable, and
cascades away with the account, so the narrower property that scenario tested
— a token cannot outlive the reason it was issued — is still carried by the
rotation and revocation scenarios above.
