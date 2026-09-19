# sign-in Specification

## Purpose

How somebody proves which address is theirs on this site.

One control does it: Google. The email routes stay served and the page does not offer them —
so the page has one way in, and the account it reaches may still hold a password from before.
Most of what follows comes from that asymmetry: Google proves an address, and a password typed
into an open sign-up form does not.

## Requirements

### Requirement: Signing in with Google needs no password and no mail

`/login` SHALL offer a Google control. A Google address with no account here SHALL get one and
a session; the same address returning SHALL reach the same account. No password SHALL be
required or stored for such an account, and no message SHALL be sent.

#### Scenario: A new Google address
- **WHEN** a verified Google address that has never signed in here presents a valid ID token
- **THEN** an account exists for that address with no password, and the response carries a session cookie

#### Scenario: The same address again
- **WHEN** that address presents a valid ID token a second time
- **THEN** it reaches the account created the first time, and no second account exists

### Requirement: The server decides who somebody is, never the page

The server SHALL verify the ID token's signature against Google's currently published keys, and
SHALL refuse unless `iss` is `https://accounts.google.com`, `aud` equals this deployment's
configured client id, `exp` is in the future, and `email_verified` is true. The address SHALL be
read from the verified claims and never from the request body.

#### Scenario: A tampered token
- **WHEN** a token whose payload was edited after signing is presented
- **THEN** the response is 401, no account is created, and no session cookie is set

#### Scenario: A token for another application
- **WHEN** a correctly signed token whose `aud` is a different client id is presented
- **THEN** the response is 401 and nothing is created

#### Scenario: Google does not vouch for the address
- **WHEN** a correctly signed token carries `email_verified: false`
- **THEN** the response is 401 and nothing is created

#### Scenario: An address in the body is ignored
- **WHEN** a valid token for one address is sent with a different address in the request body
- **THEN** the account reached is the one in the token

### Requirement: Proof beats a claim when one address arrives through both doors

When a Google sign-in resolves to an address that already holds a password account, the person
SHALL be signed in to that account and that account's password SHALL be cleared — a password set
through open sign-up is a claim on an address, and a Google sign-in is proof of it. The page
SHALL tell the person their account now signs in with Google.

An address listed in `OWNER_EMAIL` SHALL be exempt: its password is a deliberate recovery path
and SHALL survive.

#### Scenario: A password account meets its Google owner
- **WHEN** `alice@example.com` has a password account and then signs in with Google
- **THEN** she reaches that same account, and afterwards that password no longer signs in

#### Scenario: The owner signs in with Google
- **WHEN** an address listed in `OWNER_EMAIL` signs in with Google
- **THEN** it reaches the owner's account, `isOwner` is true, and afterwards that password still signs in

### Requirement: The page offers Google and nothing else

`/login` SHALL render Google's own control — rendered by Google's library, never drawn by this
repo — and no email, password, LinkedIn or Apple control. It SHALL NOT link to another way of
signing in.

The email routes SHALL remain served and unchanged, and the existing form SHALL remain reachable
at an address the page does not link to, so that the recovery path kept by decision is a path
somebody can walk.

#### Scenario: Opening the sign-in page
- **WHEN** `/login` is opened with a client id configured
- **THEN** Google's control is the only sign-in control, and no password field is rendered

#### Scenario: The fallback, reached deliberately
- **WHEN** `/login?password=1` is opened and an account with a password signs in through it
- **THEN** it succeeds exactly as it did before this change

#### Scenario: The owner's address still cannot be registered
- **WHEN** sign-up is attempted at `POST /auth/register` with an address listed in `OWNER_EMAIL`
- **THEN** the response is 409 with the same body a taken address receives

### Requirement: A misconfigured client leaves a usable page, not a broken one

When the client id is unset the page SHALL NOT render a control that cannot work, and SHALL show
the email form in its place. The route SHALL refuse rather than accept an unverifiable token.

#### Scenario: No client id configured in the browser
- **WHEN** `/login` is opened with `VITE_GOOGLE_CLIENT_ID` unset
- **THEN** no Google control is rendered and the email form is shown instead

#### Scenario: No client id configured on the server
- **WHEN** `GOOGLE_CLIENT_ID` is unset and a token is posted
- **THEN** the response is 401 and the server log names the missing configuration
