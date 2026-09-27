import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

/**
 * Reading `~/Desktop/job_dashboard`: the folder the owner applies from.
 *
 * **These files are JavaScript, not JSON**, and that is not an accident to work around —
 * they are `<script>` tags the folder's offline `dashboard.html` loads, so they carry a
 * comment header, trailing commas and unquoted keys. The honest way to parse JavaScript is
 * to run it, so each file is evaluated in a `node:vm` context whose only global is an empty
 * `window`, and the value it assigned is read back out. A regex over this would be a second
 * parser that disagrees with the first one the day the owner's script changes a quote style.
 *
 * What runs is a file on the owner's own machine, written by their own scripts. The context
 * is bare — no `require`, no `process`, no filesystem — so a data file cannot reach anything,
 * and the timeout bounds a file that somehow never returns.
 *
 * **No key normalisation lives here, deliberately.** All three files are already written by
 * `import_simplify.py` with the same key, so matching is exact string equality; a second
 * normalisation in TypeScript would be a second source of truth for what "the same posting"
 * means. What this module does instead is *report* a key that matches nothing — see
 * `unmatchedOverrideKeys`.
 */

/** The hand-written half: the one part of that folder nothing can regenerate. */
export type FolderOverride = {
  status: string | null;
  /** Free text: "OA" / "HR面试" / "简历被拒" / "拒信 · 不提供 sponsorship". */
  stage: string | null;
  /** The folder calls this `notes`; one row, not a list. */
  note: string | null;
};

export type FolderApplication = {
  sourceKey: string;
  company: string;
  role: string;
  location: string | null;
  locationsAll: string | null;
  region: string | null;
  url: string | null;
  ats: string | null;
  /** `applied` or `saved`, as Simplify exported it. The owner's own answer is `override`. */
  importedStatus: string;
  appliedDate: string | null;
  savedDate: string | null;
  jobType: string | null;
  csvNotes: string | null;
  dupCount: number;
  /** Relative to the folder root, e.g. `jobs/google-93/jd.md`. */
  jdPath: string | null;
  override: FolderOverride | null;
};

export type Folder = {
  /** The date the folder's own import last ran, from `applications.js`. */
  updatedAt: string | null;
  source: string | null;
  applications: FolderApplication[];
  /**
   * Keys in `overrides.js` / `archive.js` that match no application.
   *
   * Not an error and not silence: the caller decides. An unmatched override key is the
   * signature of key drift, and drift does not surface as a conflict — it surfaces as a row
   * whose hand-written history has quietly detached from it.
   */
  unmatchedOverrideKeys: string[];
  unmatchedArchiveKeys: string[];
};

type Unknown = Record<string, unknown>;

/** Evaluate one of the folder's data files and return what it assigned to `window`. */
function readWindowValue(file: string, property: string): unknown {
  if (!fs.existsSync(file)) return undefined;
  const code = fs.readFileSync(file, "utf8");
  const window: Unknown = {};
  const context = vm.createContext({ window });
  try {
    vm.runInContext(code, context, { filename: file, timeout: 5_000 });
  } catch (cause) {
    throw new Error(`Could not read ${path.basename(file)}: ${String(cause)}`, { cause });
  }
  return window[property];
}

/**
 * The CSV writes `""` for a date that has not happened and for a posting with no link, so an
 * empty string here means absent. Everything else is kept exactly as the folder wrote it,
 * including `美国（未指定城市）` — that is the folder's own words about its own data.
 */
function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function requiredText(value: unknown, field: string, key: string): string {
  const read = text(value);
  if (read === null) throw new Error(`Application ${key} has no ${field}`);
  return read;
}

function readOverride(raw: unknown): FolderOverride {
  const row = (raw ?? {}) as Unknown;
  return {
    status: text(row["status"]),
    stage: text(row["stage"]),
    note: text(row["notes"]),
  };
}

export function readFolder(root: string): Folder {
  const applicationsFile = path.join(root, "data", "applications.js");
  /**
   * "Not there" and "there but not what I expected" are different problems with different
   * fixes — a wrong path against a malformed file — and one message for both sends the reader
   * to look inside a file that does not exist.
   */
  if (!fs.existsSync(applicationsFile)) {
    throw new Error(
      `No job folder at ${root} — expected ${path.join("data", "applications.js")} inside it`,
    );
  }
  const data = readWindowValue(applicationsFile, "JOB_DATA") as Unknown | undefined;
  if (!data || !Array.isArray(data["applications"])) {
    throw new Error(`No window.JOB_DATA.applications in ${applicationsFile}`);
  }

  const overrides = (readWindowValue(path.join(root, "data", "overrides.js"), "JOB_OVERRIDES") ??
    {}) as Unknown;
  const archive = (readWindowValue(path.join(root, "data", "archive.js"), "JOB_ARCHIVE") ??
    {}) as Unknown;

  const seen = new Set<string>();
  const applications = (data["applications"] as unknown[]).map((entry) => {
    const row = entry as Unknown;
    const sourceKey = requiredText(row["key"], "key", "<unkeyed>");
    seen.add(sourceKey);
    const override = Object.prototype.hasOwnProperty.call(overrides, sourceKey)
      ? readOverride(overrides[sourceKey])
      : null;
    const dupCount = typeof row["dupCount"] === "number" ? row["dupCount"] : 1;
    return {
      sourceKey,
      company: requiredText(row["company"], "company", sourceKey),
      role: requiredText(row["role"], "role", sourceKey),
      location: text(row["location"]),
      locationsAll: text(row["locationsAll"]),
      region: text(row["region"]),
      url: text(row["url"]),
      ats: text(row["ats"]),
      importedStatus: requiredText(row["status"], "status", sourceKey),
      appliedDate: text(row["appliedDate"]),
      savedDate: text(row["savedDate"]),
      jobType: text(row["jobType"]),
      csvNotes: text(row["csvNotes"]),
      dupCount,
      jdPath: text(archive[sourceKey]),
      override,
    } satisfies FolderApplication;
  });

  return {
    updatedAt: text(data["updatedAt"]),
    source: text(data["source"]),
    applications,
    unmatchedOverrideKeys: Object.keys(overrides).filter((key) => !seen.has(key)),
    unmatchedArchiveKeys: Object.keys(archive).filter((key) => !seen.has(key)),
  };
}

/**
 * The archived JD body, or null when the archive names a file that is no longer there.
 *
 * Null rather than a throw because a missing body is a normal state — `archive_jds.py` leaves
 * an explanation card for pages it cannot read — while a path that climbs out of the folder is
 * not normal, and is refused. The paths come from a generated file rather than from a request,
 * so this guard is about a script gone wrong, not about an attacker.
 */
export function readJdBody(root: string, jdPath: string): string | null {
  const resolvedRoot = path.resolve(root);
  const file = path.resolve(resolvedRoot, jdPath);
  if (file !== resolvedRoot && !file.startsWith(resolvedRoot + path.sep)) {
    throw new Error(`Refusing to read ${jdPath}: outside the folder`);
  }
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, "utf8");
}
