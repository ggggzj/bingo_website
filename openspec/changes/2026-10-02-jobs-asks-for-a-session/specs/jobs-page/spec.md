# jobs-page Specification (delta)

## ADDED Requirements

### Requirement: The feed is handed only to a signed-in visitor

`GET /api/jobs` SHALL answer only a caller with a live session issued by this site. A caller with
no session, or an expired or revoked one, SHALL receive 401 with a JSON error, and the upstream job
feed SHALL NOT be called for that request. A failure to read the session SHALL be a 500, never a
401. The route SHALL write nothing about the caller.

`/jobs` SHALL send a visitor with no session to `/` and SHALL NOT request the feed for them. A
signed-in visitor SHALL see the page as before.

This wall covers the feed only. A route whose purpose is to count signed-out arrivals (the apply
redirect of `.harness/backlogs/014`) SHALL NOT sit behind it.

#### Scenario: A stranger asks the API for the feed
- **WHEN** `GET /api/jobs` arrives with no session cookie
- **THEN** the answer is 401 and the upstream has received no request

#### Scenario: An expired session
- **WHEN** `GET /api/jobs` arrives with a session cookie whose session has expired or been revoked
- **THEN** the answer is 401 and the upstream has received no request

#### Scenario: A signed-in visitor
- **WHEN** `GET /api/jobs` arrives with a live session
- **THEN** the upstream is asked exactly as before and its page is returned unchanged

#### Scenario: The session store is unreachable
- **WHEN** reading the session throws
- **THEN** the answer is 500, the error is logged, and the upstream has received no request

#### Scenario: A stranger opens the page
- **WHEN** `/jobs` is opened by a visitor with no session
- **THEN** they arrive at `/`, and no request to `/api/jobs` was made

#### Scenario: Regression guard — the allowlist still holds behind the wall
- **WHEN** a signed-in caller sends unknown or out-of-range query parameters
- **THEN** the upstream path is built from the allowlist exactly as before
