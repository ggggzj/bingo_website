# sign-in Specification (delta)

## MODIFIED Requirements

### Requirement: The page offers Google and nothing else

The **front page** SHALL render Google's own control — rendered by Google's library, never
drawn by this repo — and no email, password, LinkedIn or Apple control. It SHALL NOT link to
another way of signing in.

The email routes SHALL remain served and unchanged, and the existing form SHALL remain
reachable at an address the page does not link to, so that the recovery path kept by decision
is a path somebody can walk.

The sign-in control SHALL be one component wherever it is rendered. The back door, the
missing-client-id fallback and the notice that a password was cleared SHALL NOT exist in two
places.

#### Scenario: Opening the front page
- **WHEN** `/` is opened with a client id configured and nobody signed in
- **THEN** Google's control is the only sign-in control, and no password field is rendered

#### Scenario: The fallback, reached deliberately
- **WHEN** `/login?password=1` is opened and an account with a password signs in through it
- **THEN** it succeeds exactly as it did before this change

#### Scenario: The old address
- **WHEN** `/login` is opened without that parameter
- **THEN** the visitor arrives at `/`, which offers the same Google control

#### Scenario: The owner's address still cannot be registered
- **WHEN** sign-up is attempted at `POST /auth/register` with an address listed in `OWNER_EMAIL`
- **THEN** the response is 409 with the same body a taken address receives

### Requirement: A misconfigured client leaves a usable page, not a broken one

When the client id is unset the page SHALL NOT render a control that cannot work, and SHALL
show the email form in its place. The route SHALL refuse rather than accept an unverifiable
token.

#### Scenario: No client id configured in the browser
- **WHEN** `/` is opened with `VITE_GOOGLE_CLIENT_ID` unset
- **THEN** no Google control is rendered and the email form is shown instead

#### Scenario: No client id configured on the server
- **WHEN** `GOOGLE_CLIENT_ID` is unset and a token is posted
- **THEN** the response is 401 and the server log names the missing configuration

## ADDED Requirements

### Requirement: The front page explains itself before it asks for anything

`/` SHALL carry, on one page, what this site and the extension do, and a control that signs
somebody in. The explanation SHALL claim only what the extension ships.

Above the wide breakpoint the sign-in SHALL remain in view while the explanation is read.
At 320px the page SHALL NOT scroll horizontally, and a visitor SHALL reach both a statement
of what this is and the sign-in control without scrolling past the explanation to find it.

#### Scenario: A visitor on a phone
- **WHEN** `/` is opened at 320px by somebody not signed in
- **THEN** a statement of what the site is, the Google control and the extension link are all
  reachable ahead of the body of the introduction, and no horizontal scrollbar appears

#### Scenario: A visitor reading the introduction on a wide screen
- **WHEN** `/` is opened above the wide breakpoint and the introduction is scrolled
- **THEN** the sign-in control stays in view

### Requirement: Somebody already signed in is not asked to sign in again

A visitor with a session arriving at `/` SHALL be sent to `/jobs`.

No redirect on this page SHALL fire before the server has said who the visitor is. The
question is answered asynchronously and the answer decides the direction, so acting on the
unresolved state is what makes two pages redirect at each other.

#### Scenario: A signed-in visitor opens the front page
- **WHEN** `/` is opened by a browser holding a valid session
- **THEN** the visitor arrives at `/jobs` and is never shown a sign-in control

#### Scenario: The answer has not arrived yet
- **WHEN** `/` is opened and the request asking who this is has not resolved
- **THEN** no navigation occurs
