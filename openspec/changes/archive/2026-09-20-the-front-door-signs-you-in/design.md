# Design — the-front-door-signs-you-in

## 1. What actually scrolls, and why that is the whole layout

The owner asked for a right half that is the sign-in and a left half you can scroll. That is
one decision with two consequences worth stating before any markup is written.

**The window must not scroll.** If it does, the right column scrolls away and "右边整个是
sign in" stops being true after the first flick. So the page is full-height, the right column
is fixed within it, and the **left column is the scroll container**.

Either a sticky right column inside a normal page, or a full-height grid with `overflow-y`
on the left cell. Both work; the second is the honest one, because the first still lets the
window scroll when content outruns it and then the stickiness is doing the work of a
constraint it never states. The implementation picks, and whichever it picks, the test asserts
the behaviour rather than the technique.

**Below `lg` there is one column and no sticky anything.** See §3.

## 2. The sign-in is extracted before it is reused, and the order matters

Three things inside those forty lines are load-bearing, and a second copy is how one goes
missing quietly:

- `?password=1` — the owner's way in when the Google client id is wrong. The file's own
  comment is careful that this is not a security boundary, and it is still the back door.
- The empty-client-id fallback — with no client id there is no working button, so the form
  stands in rather than the page becoming a dead end.
- The `passwordCleared` toast — somebody whose password just stopped working is told why.

So: extract first, prove the extraction faithful with the tests that already exist for
`/login`, and only then render it somewhere new. `Login.test.tsx` passing **unchanged** after
task group 1 is the evidence, which is why that group must not touch it.

**Both addresses sign you in for the middle of this change.** After group 2, `/` and `/login`
both work; group 4 closes `/login`. That window is deliberate, so no slice leaves the site
without a way in. A reviewer seeing two working sign-ins mid-change is seeing the plan.

## 3. The phone, where both requirements have to survive

At 320px two columns would be 160px each, so they stack. The roadmap's acceptance pulls both
ways: 手机上（320px）能用 and 没登录的人能看懂这是干嘛的、装插件的按钮在哪.

Login first and a visitor meets a bare Google button and no reason to press it. Introduction
first and they scroll an essay to find the button. The owner's answer takes neither: **one
line of what this is, the Google button, the extension button, then the introduction.**

Note what that costs. The left column's first paragraph and the phone's first line are the
same words doing two jobs, so the copy is written once for the narrow case and allowed to
breathe at `lg`, not written for the desktop and truncated.

**This is also where `/login` is worst today** and the trap this change exists partly to fix:
its left half is `hidden lg:flex`, so on a phone `/login` is a button with no explanation. The
merged page must not inherit that class.

## 4. Two redirects that point at each other

`/` sends a signed-in visitor to `/jobs`. Once `.harness/backlogs/021` lands, `/jobs` sends a
signed-out visitor to `/`. The answer that decides which way to go is **not synchronous** —
`useGetMe` has a loading state before it knows.

Redirect during loading and the two bounce. The repo already solved this twice and the guard
is one line each time:

- `Account.tsx:27` — `if (!isLoading && !isSignedIn) navigate("/login")`
- `Shell.tsx:42` — `if (isLoading) return;`

Both new redirects wait the same way. The test drives the **unresolved** state, not only the
settled ones, because a test that answers `/auth/me` immediately cannot fail this bug.

## 5. `/login` has four callers, not two

The ticket named two. There are four, and they are two different intentions:

| Site | Why it navigates |
|---|---|
| `Account.tsx:27`, `Shell.tsx:45` | a signed-out visitor reached a page that needs a session |
| `Account.tsx:77`, `Shell.tsx:100` | somebody deliberately logged out |

Under this change all four land on `/` after one redirect hop. That is right for both: the
guard sends you to the way in, and logging out puts you on the front page. Rewriting them to
point at `/` directly would save a hop and cost the single address that means "the way in",
which is the address the back door hangs off. Leave them.

## 6. What the header is for once the anchors go

`SECTIONS` exists so a long scrolling page can be jumped around. The left column is one short
piece read top to bottom, so the jumps are furniture. Deleting them also removes the reason
for the comment above them about three items not fitting a 320px bar.

What stays is the conditional door — Dashboard when signed in, Log in when not, never both.
That is still right, and `SiteHeader.test.tsx` pins it in four tests that must keep passing.

Measured 2026-09-20: **no test anywhere asserts any of the four anchor labels**, so this is a
deletion and not a test rewrite.
