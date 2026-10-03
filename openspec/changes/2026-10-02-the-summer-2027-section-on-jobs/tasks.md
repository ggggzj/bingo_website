# Tasks — 2026-10-02-the-summer-2027-section-on-jobs

## 1. The section, end to end

- [ ] 1.1 `pages/Jobs.tsx` (and, only if the file would grow past readability, one new
      `components/jobs/` file): the All roles / Summer 2027 internships switch carried in
      `?section=summer-2027`; in the section, the list from `useGetInternships`, the count from
      its `total`, no filter row, the existing detail pane on select, the one-line subtitle
      (Summer 2027 first, not only), the coverage and careers-site lines. Proof: new
      `pages/Jobs.test.tsx` with MSW — the section lists what `/api/internships` returned and
      shows its `total`; the filter row is absent; selecting a row opens the detail pane; with
      no `section` parameter the page renders and requests `/api/jobs` exactly as before.
- [ ] 1.2 Guard, unchanged file: `FilterRow.test.ts` still green, including the line that fails
      if an Internship preset returns. Proof: suite output.

## 2. Close

- [ ] 2.1 `replit.md`: one entry — the section reuses `/api/internships` rather than a picker
      preset, and why (the count problem; 2026-09-20 removal). Full landing suite + typecheck
      green; replit.md working loop.
