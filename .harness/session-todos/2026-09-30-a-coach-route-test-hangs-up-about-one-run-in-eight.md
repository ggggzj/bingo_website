---
title: `coach.test.ts > config > first read creates defaults` fails ~1 run in 8 with "socket hang up"
status: open
origin: Found 2026-09-30 while implementing `2026-09-29-the-front-door-shows-the-jobs`. Not
  caused by it — `src/routes/coach.test.ts` is untouched by that branch. Recorded under
  CLAUDE.md Rule 5 rather than chased, because it is nobody's current task.
---

## Measured

Running `pnpm --filter @workspace/api-server run test` repeatedly on
`front-door-shows-the-jobs/20260930-1104`:

| Runs | Result |
|---|---|
| 8 consecutive | 7 green, **1 red** |
| Earlier in the same session | 2 more reds, both inside a chained command |

The failure is always the same one and always the same shape:

```
 × first read creates defaults 10ms
 FAIL  src/routes/coach.test.ts > coach routes > config > first read creates defaults
Error: socket hang up
```

`socket hang up` is the client end of a supertest request whose server closed first — a
transport failure, not an assertion. Nothing in the test's own subject (coach config defaults)
is involved, which is why it reads as noise rather than as a bug in the coach.

## Why it is worth a ticket rather than a shrug

A suite that is red one run in eight teaches people to re-run it, and a re-run habit is how a
real failure gets waved through. It also makes any future bisect unreliable: a green run proves
less than it should.

## Where to start

- It is the **first** test in that file to open a connection. A server not yet listening, or one
  torn down by a previous file's `afterEach`, would produce exactly this.
- `src/routes/coach.test.ts` builds its app per test; check whether anything shares a port or a
  keep-alive agent across tests, and whether supertest is given the app or a listening server.
- Reproduce with `--sequence.shuffle` and with `--pool=forks` to see whether it is ordering or
  worker reuse. If it only fails under parallel files, the fix is isolation rather than retries.
- **Do not fix it with a retry.** That converts a real flake into an invisible one.

Not urgent and not blocking: the change that found it is green on every other run, and the
failure has never once been an assertion.
