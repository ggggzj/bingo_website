# Company-frequency research — for owner review

Collected: 2026-09-09 · Primary source: LeetCode company tags via
[snehasishroy/leetcode-companywise-interview-questions](https://github.com/snehasishroy/leetcode-companywise-interview-questions)
(snapshot 2026-07-12; per-company `six-months.csv` + `all.csv`, LC Frequency%).

## Method

Per company, per bank problem: `score = max(six_months_freq, 0.6 × all_time_freq) / 100`,
rounded to 2 decimals, floored at 0.05. Problems the company never tagged get **no entry**
(an honest zero in demand scoring) — nothing is invented. Confidence: HIGH ≥100 tagged &
≥20 recent rows · MEDIUM ≥30 tagged · LOW below that.

## Coverage over the 150-problem bank

| company | tagged (all LC) | recent rows | matched in bank | confidence | verdict |
|---|---|---|---|---|---|
| google | 2325 | 783 | 150 | HIGH | replace heuristic |
| amazon | 1988 | 716 | 149 | HIGH | replace heuristic |
| meta | 1381 | 366 | 146 | HIGH | replace heuristic |
| microsoft | 1386 | 421 | 146 | HIGH | replace heuristic |
| apple | 303 | 77 | 105 | HIGH | replace heuristic |
| bloomberg | 1213 | 378 | 142 | HIGH | replace heuristic |
| tiktok | 349 | 41 | 101 | HIGH | replace heuristic |
| openai | 17 | 5 | 4 | LOW | replace heuristic (sparse but real) |
| databricks | 31 | 10 | 8 | MEDIUM | ADD |
| stripe | 12 | 1 | 2 | LOW | ADD (sparse) |
| airbnb | 64 | 12 | 19 | MEDIUM | ADD |
| doordash | 77 | 6 | 27 | MEDIUM | ADD |
| snowflake | 102 | 29 | 34 | HIGH | ADD |
| uber | 362 | 68 | 82 | HIGH | ADD |
| coinbase | 12 | 0 | 3 | LOW | ADD (sparse) |
| anthropic | 4 | 0 | 0 | LOW | **OMIT** — see below |
| scale | 1 | 0 | 1 | LOW | **OMIT** — see below |

## AI labs: recommended OMIT from LC frequencies

- LeetCode tag data is near-nonexistent: anthropic 4 tagged (0 in bank), scale-ai 1, xai and
  perplexity have no tag at all.
- Qualitative sources agree these companies deliberately avoid standard LC-style rounds:
  Anthropic describes its screens as "pure programming problem solving which doesn't benefit
  from memorizing standard algorithms" ([interviewing.io](https://interviewing.io/anthropic-interview-questions),
  [PracHub](https://prachub.com/companies/anthropic/categories/coding-and-algorithms)).
- Assigning per-problem LC frequencies would therefore be invented data. The honest vehicle
  for AI-lab prep is the `track-split` ticket (practical/ML-flavored practice), not this bank.

## Spot-check samples (top matched, six-month-weighted)

**databricks**: LC 981 Time Based Key-Value Store (0.75) · LC 198 House Robber (0.62) · LC 213 House Robber II (0.45) · LC 567 Permutation in String (0.3) · LC 1 Two Sum (0.23)
**snowflake**: LC 210 Course Schedule II (0.88) · LC 202 Happy Number (0.88) · LC 42 Trapping Rain Water (0.75) · LC 347 Top K Frequent Elements (0.62) · LC 211 Design Add and Search Words Data Structure (0.62)
**uber**: LC 269 Alien Dictionary (0.88) · LC 230 Kth Smallest Element in a BST (0.75) · LC 79 Word Search (0.75) · LC 200 Number of Islands (0.75) · LC 981 Time Based Key-Value Store (0.62)
**airbnb**: LC 217 Contains Duplicate (0.45) · LC 1 Two Sum (0.45) · LC 42 Trapping Rain Water (0.45) · LC 20 Valid Parentheses (0.45) · LC 2 Add Two Numbers (0.45)
**doordash**: LC 286 Walls and Gates (1.0) · LC 329 Longest Increasing Path in a Matrix (0.75) · LC 124 Binary Tree Maximum Path Sum (0.53) · LC 875 Koko Eating Bananas (0.45) · LC 1 Two Sum (0.3)
**openai**: LC 994 Rotting Oranges (1.0) · LC 271 Encode and Decode Strings (0.53) · LC 981 Time Based Key-Value Store (0.45) · LC 42 Trapping Rain Water (0.3)

## Decision asked of the owner

1. Approve merging the 15 companies marked replace/ADD (LOW-confidence ones included —
   sparse-but-real beats invented)?
2. Confirm omitting anthropic / xai / scale / perplexity from LC frequencies, deferring
   AI-lab prep to `track-split`?
3. Any companies to add or drop from the roster?

_Approval recorded below when given._
