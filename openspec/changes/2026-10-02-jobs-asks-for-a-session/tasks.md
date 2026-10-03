# Tasks — 2026-10-02-jobs-asks-for-a-session

## 1. The server refuses (tracer bullet: the wall exists end to end at the API)

- [ ] 1.1 `routes/jobs.ts` + `routes/index.ts`: `createJobsRouter(authStore, upstream)`; resolve the
      caller with `currentUser` before touching the upstream; no session → 401
      `{ error }`; a throw while reading the session → 500, logged. Rewrite the index.ts mount
      comment and the jobs.ts header ("identity-free") to say what is now true and why.
      Proof: `routes/jobs.test.ts` against the memory store — no cookie → 401 and the fake
      upstream saw zero calls; expired session → 401, zero calls; live session → today's page
      unchanged; session read throws → 500, zero calls; every existing allowlist test still
      green, now run with a signed-in caller.
- [ ] 1.2 `lib/api-spec/openapi.yaml`: add the 401 response to `GET /jobs`, run codegen in the
      same task. Proof: `pnpm run typecheck` clean; generated client not hand-edited.

## 2. The page sends a stranger home

- [ ] 2.1 `pages/Jobs.tsx`: wait for `useAuth`; signed out → `navigate("/")`; the jobs query is
      disabled until signed in. Proof: new `pages/Jobs.test.tsx` — signed out lands on `/` and
      MSW records no `/api/jobs` request; signed in renders the list as before.

## 3. The record says what is true

- [ ] 3.1 `replit.md`: rewrite "`/jobs` is public and identity-free, and its secret is a third
      one." — the wall, why the 2026-09-10 reason no longer binds (`018` built), what did not
      change (`POSTINGS_TOKEN` separate, allowlist, writes nothing). Same task, because a delta
      carries requirements and not the Purpose: rewrite the "Read-only and identity-free"
      paragraph of `openspec/specs/jobs-page/spec.md` to match. Proof: neither text nor the
      index.ts comment from 1.1 contradicts another (read side by side).
- [ ] 3.2 Full suite + typecheck green; replit.md working loop for the change.
