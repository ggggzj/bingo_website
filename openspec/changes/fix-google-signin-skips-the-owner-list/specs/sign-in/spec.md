## ADDED Requirements

### Requirement: An address Google proved reaches the owner's list

Recorded as ADDED rather than MODIFIED because `openspec/specs/sign-in/` does not exist yet —
the change that creates it, `2026-09-18-one-way-in-and-it-is-google`, is still active. The
wrong behaviour is named inline on each scenario, so the contract still reads Current →
Expected. This requirement extends that change's "Signing in with Google needs no password and
no mail" and contradicts nothing in it.

Signing in with Google SHALL record the proved address where the product reads it — the
owner's list — and SHALL do so without sending any message.

#### Scenario: Somebody signs in with Google on this site

- **WHEN** Google vouches for an address and the sign-in succeeds
- **THEN** that address is on the owner's list, marked as proven at the moment of the sign-in
- **AND** no message is sent, as this capability already requires
- (Current Behaviour before the fix: the sign-in reached `users` and stopped. From the
  2026-09-21 database cutover onwards, that made every person arriving through this page
  invisible on the dashboard, which counts `registrations`. Pinned by
  `artifacts/api-server/src/routes/auth.test.ts`, "puts the address Google proved on the
  owner's list".)

#### Scenario: The same person signs in again

- **WHEN** an address that is already on the list signs in again
- **THEN** it is recorded once, not twice, and the earlier record of when it was first proven
  is left where it is
- (Pinned by "records the address once, however many times they sign in". The list is read as
  a count of people, so a second row for one address would make the dashboard disagree with
  itself.)

#### Scenario: Regression guard — a refused token puts nobody on the list

- **WHEN** Google will not vouch for the token
- **THEN** the sign-in is refused, no identity is created, no session is opened, and nobody is
  added to the list
- (Pinned by "a refused token puts nobody on the list" alongside the existing "a refused token
  creates nothing and leaves no session". Together they say the recording happens after the
  verifier, never before.)

#### Scenario: Regression guard — a password meeting its Google owner still loses it

- **WHEN** an address that already holds a password signs in with Google, and it is not the
  owner's
- **THEN** the password is cleared exactly as "Proof beats a claim when one address arrives
  through both doors" requires, and the owner's own password is still exempt
- (Unchanged by this fix. Pinned by the existing "a password account meeting its Google owner
  loses its password" and "the owner keeps their password", green before and after without
  amendment.)
