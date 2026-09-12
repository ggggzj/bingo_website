/**
 * The only place the job feed's shared secret is read or sent.
 *
 * Kept apart from the route that uses it so there is exactly one file to check when
 * asking "where can this secret go". The route decides what may be asked; this
 * decides what asking means.
 *
 *   JOBS_API_BASE_URL  the extension's API origin, e.g. https://…up.railway.app
 *   POSTINGS_TOKEN     must match the same variable on that server
 *
 * POSTINGS_TOKEN is deliberately not STATS_TOKEN. That one opens the owner's own
 * usage numbers; a third, FEED_TOKEN, reads any account's feed by email. Three doors
 * with three blast radii, so rotating the website's access can never lock the owner
 * out of their dashboard, and a leak of this key exposes job listings rather than
 * accounts.
 */

type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

/** Fetches one upstream path. A seam, so the route's tests run the real gate
 * against a fake service and the only code holding the secret stays this small. */
export type UpstreamJobs = (path: string) => Promise<unknown>;

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    // Fail loudly rather than send an empty token or a relative URL that would
    // resolve against this server and 404 in a way that looks like a locked door.
    throw new Error(`${name} is not set, so the job feed cannot be reached`);
  }
  return value;
}

export function createUpstreamJobs(fetcher: Fetcher = fetch): UpstreamJobs {
  return async (path: string): Promise<unknown> => {
    const base = required("JOBS_API_BASE_URL").replace(/\/+$/, "");
    const token = required("POSTINGS_TOKEN");

    const response = await fetcher(`${base}${path}`, {
      method: "GET",
      headers: {
        // A header, not a query parameter: query strings end up in access logs and
        // in browser history, and this value is a password.
        "X-Postings-Token": token,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      // Says the path and the status and nothing else. Errors get logged, and the
      // one thing that must never reach a log is the token.
      throw new Error(`Job feed answered ${response.status} for ${path}`);
    }

    return response.json();
  };
}
