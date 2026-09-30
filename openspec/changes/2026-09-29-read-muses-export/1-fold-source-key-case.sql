-- Task 1.1 — bring the stored keys in line with the fixed normaliser.
--
-- `norm_url` folded only the Workday tenant and left the site segment, so `/Careers_GM/` and
-- `/careers_gm/` were two keys for one posting. The fix folds the whole key; this brings the
-- rows already stored under the old rule into line.
--
-- **Only keys that came from a URL.** A key containing `|` is `"公司名|职位名"`, built for rows
-- with no link — `norm_url` never sees it and never folds it. Folding those here is what
-- happened on the first attempt on 2026-09-29: the folder kept producing the original case, the
-- account had been lowercased, and the next import created a second copy of all twelve of them.
--
-- **Order matters, and it is not only this table.** Run this, then regenerate the folder and
-- push. Folding the key breaks three joins at once, all of which were found the hard way:
--   * `data/ids.json` maps key → the number in the `jobs/<company>-<id>/` directory name.
--     Stale keys mean new numbers, new empty directories, and an archive index that points at
--     nothing. Fold its URL-shaped keys too, keeping the original ids.
--   * `data/archive.js` maps key → the saved JD body. Unmatched keys meant 37 bodies were
--     overwritten with null in the account before the index was rebuilt.
--   * `data/overrides.js` is keyed the same way; it is retired as an input but the account
--     importer still reads it to seed.
--
-- Safe by construction otherwise: the new key is exactly `lower()` of the old one;
-- `application_status` and `application_events` reference `application_id`, not the key;
-- and no two rows differ only by case. Idempotent.

UPDATE applications
   SET source_key = lower(source_key)
 WHERE source_key <> lower(source_key)
   AND source_key NOT LIKE '%|%';
