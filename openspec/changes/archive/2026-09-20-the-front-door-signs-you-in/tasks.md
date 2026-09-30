# Tasks — the-front-door-signs-you-in

Four slices. Each leaves the site with a working way in, which is why the order is what it is:
the sign-in exists as a component before anything new renders it, `/` gains it before `/login`
gives it up, and the header is trimmed only once nothing needs its anchors.

**One file, one group.** `Login.tsx` is written in group 1 and never again. `Home.tsx` only in
group 2, `SiteHeader.tsx` only in group 3, `App.tsx` only in group 4.

Baseline before starting: `pnpm --filter @workspace/landing run test` is **41 passing in 10
files** (measured 2026-09-20). Every group below adds to that number and subtracts from it
only where a task says so.

## 1. The sign-in becomes one component

- [ ] 1.1 Create `artifacts/landing/src/components/auth/SignInPanel.tsx` by moving the right
      half of `Login.tsx` into it: the Google control, the failure line, the `passwordCleared`
      toast, the `?password=1` form and the empty-client-id fallback. It takes where to go
      after a successful sign-in as a prop rather than hard-coding `/jobs`, because group 4
      needs the same panel on a page with a different answer.
- [ ] 1.2 `Login.tsx` renders it and changes in no other way. **`Login.test.tsx` is not edited
      in this group** — its five tests passing untouched is the whole evidence that the
      extraction was faithful, and a test edited in the same breath proves nothing.
- [ ] 1.3 New `artifacts/landing/src/components/auth/SignInPanel.test.tsx` pins the three
      things a copy loses: `?password=1` reaches the password form, an empty client id shows
      the form instead of a dead end, and a cleared password produces the notice.

## 2. The front page

- [ ] 2.1 Rewrite `artifacts/landing/src/pages/Home.tsx` as the merged page. Above `lg`: two
      columns, the right one carrying `SignInPanel` and staying in view, the left one
      scrolling and carrying the five sections' content re-laid-out for half width. Below
      `lg`: one column, ordered what-this-is, Google control, extension link, then the
      introduction. The left half must **not** inherit `hidden lg:flex` from `Login.tsx` — on
      a phone that class is what makes the current page a button with no explanation.
- [ ] 2.2 Extend `artifacts/landing/src/pages/Home.test.tsx`: the Google control is on `/`;
      the extension link is present; at 320px the control and the extension link both precede
      the body of the introduction. **The two existing mailing-list tests must still pass** —
      `013` removed that section on 2026-09-15 and a rewrite is exactly how it comes back.
- [ ] 2.3 Check every claim the moved copy makes against `../h1_checker` before it lands. The
      badge strings are the extension's own, the counts are row counts. Content moves and is
      re-laid-out; it is not rewritten into something the extension does not ship.

## 3. The header stops pointing at sections

- [ ] 3.1 Delete `SECTIONS` from `artifacts/landing/src/components/SiteHeader.tsx`, its
      desktop and mobile rendering, and the comment above it about three items not fitting a
      320px bar — it describes a bar that no longer has them. The conditional door stays.
- [ ] 3.2 Extend `SiteHeader.test.tsx`: none of the four labels renders, desktop or mobile.
      Its four existing tests must keep passing.

## 4. The two redirects, and the loop they could make

- [ ] 4.1 In `artifacts/landing/src/App.tsx`: `/` sends a visitor holding a session to
      `/jobs`; `/login` sends everyone to `/` unless the query carries `password=1`, which
      still renders `Login`. Both wait for the answer to settle first, the way `Account.tsx:27`
      and `Shell.tsx:42` already do.
- [ ] 4.2 New `artifacts/landing/src/App.test.tsx`: a signed-in visitor at `/` lands on
      `/jobs`; a signed-out one stays and sees the control; `/login` lands on `/`;
      `/login?password=1` renders the form. **And one test that leaves `/auth/me` unresolved
      and asserts no navigation happened** — without it this suite cannot fail the bug this
      group exists to prevent.
- [ ] 4.3 Leave the four `navigate("/login")` callers alone (`Account.tsx:27` and `:77`,
      `Shell.tsx:45` and `:100`). They take one redirect hop and land right. Pointing them at
      `/` would save the hop and cost the single address that means "the way in".

## 5. Say what changed

- [ ] 5.1 Append to `replit.md` "Architecture decisions": the front door merged, what was on
      the table (two pages, one page with the introduction deleted, one page with a scrolling
      left column) and why the third won. **Another session was editing `replit.md` on
      2026-09-20** — re-read it before writing rather than appending to a stale copy.
- [ ] 5.2 Run the full suite and record the number. Then `openspec/specs/sign-in/` does not
      exist yet: the `sign-in` spec lives only inside
      `2026-09-18-one-way-in-and-it-is-google`, unarchived because of its own owner-run task.
      Whoever archives this change reconciles both, or that one syncs first. Do not sync this
      delta into a spec directory that has no base.
