/**
 * The only place the extension API's shared secret is read or sent.
 *
 * Kept apart from the route that uses it so there is exactly one file to check when
 * asking "where can this secret go". The route decides who may ask; this decides
 * what asking means.
 *
 *   STATS_API_BASE_URL  the extension's API origin, e.g. https://…up.railway.app
 *   STATS_TOKEN         must match the same variable on that server
 */

import type { UpstreamStats } from "../../routes/stats";

type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    // Fail loudly rather than send an empty token or a relative URL that would
    // resolve against this server and 404 in a way that looks like a locked door.
    throw new Error(`${name} is not set, so the stats service cannot be reached`);
  }
  return value;
}

export function createUpstreamStats(fetcher: Fetcher = fetch): UpstreamStats {
  return async (path: string): Promise<unknown> => {
    const base = required("STATS_API_BASE_URL").replace(/\/+$/, "");
    const token = required("STATS_TOKEN");

    const response = await fetcher(`${base}${path}`, {
      method: "GET",
      headers: {
        // A header, not a query parameter: query strings end up in access logs and
        // in browser history, and this value is a password.
        "X-Stats-Token": token,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      // Says the path and the status and nothing else. Errors get logged, and the
      // one thing that must never reach a log is the token.
      throw new Error(`Stats service answered ${response.status} for ${path}`);
    }

    return response.json();
  };
}
