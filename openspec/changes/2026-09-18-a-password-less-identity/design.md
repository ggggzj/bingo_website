# Design — a-password-less-identity

## 1. The ticket names the risk, and grounding found it already handled — twice

The ticket says: *"`verifyPassword` is the risk, not the schema line… An absent hash must be a
refusal, and it must not be distinguishable from a wrong password in what the caller can
observe."* Exactly right, and worth checking rather than assuming. Both halves are already
true, by two independent mechanisms neither of which was written for this.

**`verifyPassword` refuses anything it cannot read** (`lib/auth/password.ts:70`):

```ts
const parts = stored.split("$");
if (parts.length !== 6 || parts[0] !== "scrypt") return false;
```

with a comment above it that states the intent for a different reason — *"a truncated row, a
hash written by some other scheme. Never throws: a caller that has to wrap this in a try/catch
will eventually forget, and the forgotten branch is the one that lets someone in."* An empty
string splits to one part, so it is refused by the first line.

**And an absent hash never reaches it** (`routes/auth.ts:144`):

```ts
const matched = await verifyPassword(parsed.data.password, user?.passwordHash ?? DECOY_HASH);
```

`??` catches `null` as readily as the missing user it was written for. So the call still costs
a full scrypt against the decoy, and the refusal is indistinguishable in time and in body from
a wrong password — which is the property the comment three lines above it exists to protect.

**So this change adds no defensive code, and should not.** Writing a new `if (!hash) return
false` beside two mechanisms that already do it would be a third thing to keep in step.

What is missing is that **nothing says either is deliberate for this case.** Both read as
handling for malformed data. A refactor that "simplifies" `?? DECOY_HASH` to `user.passwordHash`
after the type allows null, or tightens `verifyPassword` to throw on bad input, would pass every
test in the repo today. That is what the tests in group 3 are for.

## 2. Nullable in the type, not merely in the column

`toRecord` (`drizzle-store.ts:12`) declares its own row shape with `passwordHash: string`, so
the column changing is not enough — the seam would keep the comfortable lie. Making
`UserRecord.passwordHash` `string | null` is what turns the compiler into the reader of every
call site, which is the whole benefit of doing this before the rows arrive rather than after.

`createUser(email, passwordHash)` stays as it is, for callers that have a password. The
interface gains a separate way to create one without — rather than making the parameter
optional, which would let a caller forget the argument and silently create a password-less
identity. Being unable to sign in with a password must be something a caller asks for.

## 3. The schema push is a deploy step, and it has a name

`pnpm --filter @workspace/db run push` is what makes the column actually nullable in Postgres.
This change does **not** run it, for two reasons worth recording:

- **Dropping a NOT NULL is the safe direction.** Every existing row has a password, so the
  constraint can be relaxed without touching data and without downtime. Nothing needs a
  backfill and nothing breaks if the push lands after the code.
- **`.harness/backlogs/007` exists because a push does not say which database it is about to
  change**, and this push lands in the same week the two databases merge — precisely the
  situation that ticket was written for. The ticket itself says doing 007 first is defensible.
  Not a blocker: the code change is inert until something creates a password-less row, and
  nothing will until `011`.

So: land the code, push the schema deliberately, in that order, against the database the
person running it has confirmed.

## 4. What the tests have to pin, and what they must not

Pin:

- a password-less account is refused by `POST /auth/login` with the **same status and the same
  body** as a wrong password;
- `verifyPassword` answers `false`, and does not throw, for an empty stored value;
- a password-less user round-trips through both stores — created, found by email, found by
  live session — without anything reading the hash;
- an account **with** a password is unaffected.

Do not pin timing. "The refusal takes as long as a real check" is the property that matters and
a wall-clock assertion for it is a flaky test on shared CI.

**Corrected during the run, because the first draft of this paragraph was wrong.** It claimed
the first test "would break if someone removed `?? DECOY_HASH`". Probed: replacing the decoy
with `""` keeps every test green, because an empty string is refused too — just refused
*immediately*, before any hashing. So the tests pin the **behaviour** (a password-less account
is refused exactly like a wrong password, and letting one in fails loudly — verified by
breaking it) and do **not** pin the **timing**.

That gap is real and is not closed by a test. What closes it as far as it can be closed is the
comment at the call site, which now names the decoy specifically and says why `""` is not the
same thing — the reason sits where the edit would be made rather than in a test that would stay
green through it.
