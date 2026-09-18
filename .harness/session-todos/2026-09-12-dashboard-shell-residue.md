# Residue — dashboard-shell (2026-09-12)

Implementation is complete and committed on `implement/2026-09-12-dashboard-shell`.
What is left is one decision the owner has not been asked, and one thing to do before
this ships.

## 1. The practice entry lost its live progress — deliberately, but unasked

The old `/account` practice entry showed today's state on the card itself: *"Today: 2 of
5 graded · 1 solved but not grilled"*. That was a requirement — `coach-page` spec, the
console requirement, "The practice entry SHALL show live state… rather than a bare
link."

The shell's rail says **Practice** and nothing else. That requirement was removed, not
migrated, in `openspec/changes/2026-09-12-dashboard-shell/specs/coach-page/spec.md`, and
the new `dashboard-shell` spec does not replace it.

The case for leaving it out: the rail is always on screen and the practice view itself
shows the same numbers one click away, so the entry no longer has to carry them. The case
against: the owner asked for that live state specifically when the console was built, and
nobody asked whether they still wanted it.

**Ask before the change is archived.** If the answer is "keep it", it is a small addition
to `Rail.tsx` plus a scenario in `dashboard-shell`'s spec — but it means the rail reads
the plan query, which is the first time the rail would depend on a view's data. Worth
saying out loud rather than discovering later.

## 2. `COACH_EMAILS` is still set in the deployment

The code no longer reads it and `replit.md` no longer lists it, but the variable will
still be sitting in the Railway/Vercel environment. Remove it there when this ships —
leaving it is harmless today and misleading in six months.

## 3. Unchanged and not caused by this change

`pnpm run build` still fails in `artifacts/mockup-sandbox`, whose `vite.config.ts` throws
unless `PORT` is set. `pnpm run build:web` and the api-server build both pass. Same as
recorded in `replit.md`.
