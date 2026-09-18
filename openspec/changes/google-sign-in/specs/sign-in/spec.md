# sign-in Specification

## Purpose

How somebody proves which address is theirs on this site.

Two doors, and they prove different things. Google proves control of an address; the email form
does not, because sign-up here is open and unverified. Everything below follows from that
asymmetry — most of all what happens when one address arrives through both.

## Requirements

### Requirement: Signing in with Google needs no password and no mail

`/login` SHALL offer a Google control. A Google address with no account here SHALL get one and a
session; the same address returning SHALL reach the same account. No password SHALL be required
or stored for such an account, and no message SHALL be sent.

#### Scenario: A new Google address
- **WHEN** a verified Google address that has never signed in here presents a valid ID token
- **THEN** an account exists for that address, with no password, and the response carries a session cookie

#### Scenario: The same address again
- **WHEN** that address presents a valid ID token a second time
- **THEN** it reaches the account created the first time, and no second account exists

### Requirement: The server decides who somebody is, never the page

The server SHALL verify the ID token's signature against Google's currently published keys,
and SHALL refuse the request unless `iss` is `https://accounts.google.com`, `aud` equals this
deployment's configured client id, `exp` is in the future, and `email_verified` is true. The
address SHALL be read from the verified claims and never from the request body.

#### Scenario: A tampered token
- **WHEN** a token whose payload has been edited after signing is presented
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
SHALL be signed in to that existing account, and that account's password SHALL be cleared — a
password set through open sign-up is a claim on an address, and a Google sign-in is proof of it.
The page SHALL tell the person their account now signs in with Google.

An address listed in `OWNER_EMAIL` SHALL be exempt: its password is a deliberate recovery path
and SHALL survive.

#### Scenario: A password account meets its Google owner
- **WHEN** `alice@example.com` has a password account and then signs in with Google
- **THEN** she reaches that same account, and afterwards that password no longer signs in

#### Scenario: The owner signs in with Google
- **WHEN** an address listed in `OWNER_EMAIL` signs in with Google
- **THEN** it reaches the owner's account, `isOwner` is true, and afterwards that password still signs in

### Requirement: A password-less account cannot be signed into with a password

`POST /auth/login` SHALL refuse an account that has no password, with the same answer and the
same cost as any other refusal, so that whether an account has a password is not readable from
the outside.

#### Scenario: Guessing at a Google-only account
- **WHEN** any password is posted for an address whose account has no password
- **THEN** the response is 401 with the same body as a wrong password, and a password hash was still computed

### Requirement: The email form stays, both tabs

`/login` SHALL continue to offer email sign-in and email sign-up beside the Google control.
`POST /auth/register` SHALL continue to refuse an address listed in `OWNER_EMAIL` with the same
answer a taken address gets.

#### Scenario: Password sign-in still works
- **WHEN** an account with a password signs in through the form
- **THEN** it succeeds exactly as before this change

#### Scenario: The owner's address cannot be registered
- **WHEN** sign-up is attempted with an address listed in `OWNER_EMAIL`
- **THEN** the response is 409 with the same body a taken address receives

### Requirement: A misconfigured client fails loudly, not silently

When the Google client id is unset the site SHALL NOT render a sign-in control that cannot
work, and the route SHALL refuse rather than accept an unverifiable token.

#### Scenario: No client id configured
- **WHEN** `GOOGLE_CLIENT_ID` is unset and a token is posted
- **THEN** the response is 401 and the server log names the missing configuration
