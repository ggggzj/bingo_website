---
title: Two boards now show the same 94 rows, and one of them is about to be wrong about status
status: open
origin: `openspec/changes/2026-09-25-the-applications-i-already-sent` — its proposal names this
  as open question 6 and puts it out of scope, because `~/Desktop/job_dashboard/dashboard.html`
  is in the owner's folder rather than in this repo.
---

**摘要:** 状态从今天起归账号管，但本地 `dashboard.html` 还在显示它自己那份（来自 `overrides.js`，
已经停止更新）。两个看板都开着、其中一个的状态是旧的——这是某个周二会一头撞上去的坑。

Since 2026-09-27 the owner's status, stage and note live in their account and are changed in the
browser. `overrides.js` was imported once as the seed and is no longer an input.

The folder's own board still renders a 状态 column from that file. It will be right today and
wrong the first time a status changes in the browser, with nothing on either screen saying which
one to believe.

Three ways out, cheapest first — the owner's call:

1. **A line at the top of `dashboard.html`**: 状态看账号，这里只看 JD 和归档. One sentence, no
   behaviour change.
2. **Drop the 状态 / 阶段 / 备注 columns from `dashboard.html`** and leave it as the JD and
   archive view it is uniquely good at.
3. **Have the board read the account** — a fetch with a credential on a laptop, which is
   `.harness/backlogs/025` and is deliberately not built.

Recommend 2, with 1 as the stopgap. The folder keeps every job it is still the only tool for:
抓 JD、归档、add_job.py。

Not urgent until the owner changes a status in the browser on a row they also look at locally.
