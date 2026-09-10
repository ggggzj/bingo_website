# .harness

Where work waits between sessions. `/pickup` reads these stores in order and hands the
first match to the skill that owns it — it never invents work, so an empty store
answering "nothing to pick up" is the correct answer, not a failure.

| Store | Holds | Owner skill |
|---|---|---|
| `backlogs/` | Tickets with `status: open` or `picked-up`, one per file | `pickup-backlogs` |
| `backlogs/archive/` | Closed tickets. Never scanned by `/pickup` | — |
| `session-todos/` | Residue from a finished session that still needs doing | `session-pickup-todos` |
| `plans/inprogress/` | A paused session's handoff notes, for resuming later | `takeover` |

Resolution is first-match-wins, top to bottom, with an explicit argument to `/pickup`
short-circuiting the scan entirely.

Bugs never enter these stores — they go straight to the bugfix flow (`CLAUDE.md`
Rule 3). Specs and task graphs live in `openspec/changes/<id>/`, driven by
`/implement <change-id>`. This repo has no local roadmap: product direction lives in
the extension repo's roadmap files, routed by the workspace `../CLAUDE.md`.
