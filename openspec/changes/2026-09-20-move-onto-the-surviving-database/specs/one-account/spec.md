# one-account

One address is one identity across both surfaces, and the rows this site keyed to its own user
ids are keyed to the surviving ones.

## ADDED Requirements

### Requirement: A moved row belongs to the address it belonged to, not to the id it carried

Every row moved from this site's database SHALL be re-keyed through a stated mapping from this
site's `user_id` to the surviving database's, and SHALL NOT retain its original `user_id`.

The result SHALL be verified by resolving each moved row's new `user_id` to an email address on
the surviving side and comparing it to the address that row belonged to before the move.

Verification by id SHALL NOT be accepted as verification. The two databases hold the same two
addresses under **swapped** ids, so a row that kept its id satisfies every constraint and
belongs to the wrong person.

#### Scenario: A row whose id means a different person on the other side
- **WHEN** a `coach_config` row keyed to this site's user 1 is moved
- **THEN** it is keyed to the surviving user whose address is `christineguo610@gmail.com`, and
  not to the surviving user 1

#### Scenario: Checking the move
- **WHEN** the move is verified
- **THEN** each moved row's address on the surviving side equals its address before the move

### Requirement: Sessions are not carried

Session rows SHALL NOT be moved. A session is a credential bound to an origin and its only
guaranteed property is that it expires; both databases hold their own.

Signing in again after the cutover SHALL be expected rather than treated as a fault.

#### Scenario: After the cutover
- **WHEN** the owner opens the site after the database is repointed
- **THEN** they are asked to sign in, and their existing password is accepted

### Requirement: This repo cannot reconcile a schema it does not own

After the move, a whole-schema reconciliation from this repo SHALL be impossible rather than
discouraged. This repo's schema describes six tables in a database holding twenty-seven, so a
reconciliation would read the other application's tables as unknown.

Applying schema changes SHALL be by generated SQL, reviewed, and run against the database
through the operator's own connection.

#### Scenario: Somebody runs the old command
- **WHEN** `pnpm --filter @workspace/db run push` is invoked
- **THEN** it fails because no such script exists, and the failure names what to run instead

### Requirement: The move deletes nothing

No row SHALL be deleted, truncated or updated in this site's database by this change. Rolling
back SHALL require pointing `DATABASE_URL` at it again and nothing else.

#### Scenario: Rolling back
- **WHEN** `DATABASE_URL` is pointed back at this site's database after a cutover
- **THEN** every row it held before the move is still there

### Requirement: The same credential is not the same session

Where a person is told that one address works on both surfaces, it SHALL also be stated that
signing in on one does not sign them in on the other.

#### Scenario: Signing in here
- **WHEN** somebody signs in on the website
- **THEN** the extension still asks them to sign in, and the site has said so in advance
