/**
 * Every outbound URL the site points at, in one place.
 *
 * The store listing and the privacy policy are each referenced from more than one
 * component, and the privacy policy is served by the extension's API rather than by
 * this site — a detail that is easy to get wrong from memory when adding a link.
 */

export const CHROME_STORE_URL =
  "https://chromewebstore.google.com/detail/h1b-checker-for-linkedin/fjlefpeahmeahjbadnnogdnailahdafe";

/** Served by the extension's API (`GET /privacy`), not by this site. */
export const PRIVACY_POLICY_URL =
  "https://h1bchecker-production.up.railway.app/privacy";
