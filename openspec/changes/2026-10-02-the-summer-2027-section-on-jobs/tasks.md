# Tasks — 2026-10-02-the-summer-2027-section-on-jobs

## 1. The section, end to end

- [x] 1.1 `pages/Jobs.tsx` (and, only if the file would grow past readability, one new
      `components/jobs/` file): the All roles / Summer 2027 internships switch carried in
      `?section=summer-2027`; in the section, the list from `useGetInternships`, the count from
      its `total`, no filter row, the existing detail pane on select, the one-line subtitle
      (Summer 2027 first, not only), the coverage and careers-site lines. Proof: new
      `pages/Jobs.test.tsx` with MSW — the section lists what `/api/internships` returned and
      shows its `total`; the filter row is absent; selecting a row opens the detail pane; with
      no `section` parameter the page renders and requests `/api/jobs` exactly as before. Result: 5 passed (RED first: 4 failed, the all-roles guard green); landing suite 93 passed; typecheck exit 0. Kept in `Jobs.tsx` (288 → 389 lines; under the 800 a split would need). `select` now navigates through the router like the switch does — `useSearch` reads the router's location, so `window.history` writes never reached it under test.
- [x] 1.2 Guard, unchanged file: `FilterRow.test.ts` still green, including the line that fails
      if an Internship preset returns. Proof: suite output. Result: 2 passed — "offers no option whose search returns roles of another kind", "offers no internship option at all, until the feed can express one"; `components/jobs/` unchanged since 158a4f0.

## 2. Close

- [x] 2.1 `replit.md`: one entry — the section reuses `/api/internships` rather than a picker
      preset, and why (the count problem; 2026-09-20 removal). Full landing suite + typecheck
      green; replit.md working loop. Result: replit.md "`/jobs` shows internships as a second list, not as a picker preset" added; landing 93 passed, api-server 228 passed / 2 files skipped (DB contract tests), typecheck exit 0.
