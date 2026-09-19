/**
 * Reading a country out of a location string nobody normalised.
 *
 * There is no country upstream. `BrowseQuery` has `location_text` and nothing else, and
 * `../h1_checker/.harness/backlogs/011` — stop serving jobs where nobody needs an H-1B —
 * is still open. So this reads the string a provider wrote, and the honest answer is
 * three-valued.
 *
 * The three states are the owner's own: their spreadsheet's 在美国 column holds 是 / 否 /
 * ?, filled by the same judgement against the same strings. Adopting two states here
 * would make this page disagree with the file they already trust, in exactly the cases
 * where neither of us knows.
 *
 * **US wins a tie**, matching their rule — 有美国地点记 是 — because a posting open in
 * London and New York is one the owner can take.
 *
 * Every pattern is anchored. `\bus\b` and not `us`, or `Campus Drive, Bengaluru` reads as
 * American; that is the same class of mistake as the board token that put Google
 * Operations Center in a list as Google.
 */

export type LocationRead = "us" | "unknown" | "elsewhere";

const US = [
  /\bunited\s+states\b/,
  /\bu\.?s\.?a\.?\b/,
  /\bus\b/,
  // A state abbreviation, only where a comma or slash makes it one — `, CA`, `/ NY`.
  /[,/]\s*(a[klrz]|c[aot]|de|fl|ga|hi|i[adln]|k[sy]|la|m[adeinost]|n[cdehjmvy]|o[hkr]|pa|ri|s[cd]|t[nx]|ut|v[at]|w[aivy])\b/,
  /\b(alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|ohio|oklahoma|oregon|pennsylvania|tennessee|texas|utah|vermont|virginia|washington|wisconsin|wyoming)\b/,
  /\bnew\s+(york|jersey|hampshire|mexico)\b/,
  /\bnorth\s+(carolina|dakota)\b/,
  /\bsouth\s+(carolina|dakota)\b/,
  /\brhode\s+island\b/,
  /\bwest\s+virginia\b/,
  // Cities that appear in this feed and are not ambiguous with a foreign one.
  /\b(san\s+jose|san\s+francisco|los\s+angeles|silicon\s+valley|mountain\s+view|palo\s+alto|menlo\s+park|sunnyvale|santa\s+clara|san\s+mateo|foster\s+city|redwood\s+city|bellevue|redmond|kirkland|seattle|denver|boulder|austin|dallas|houston|atlanta|chicago|boston|pittsburgh|philadelphia|malvern|bentonville|ann\s+arbor|st\.?\s+louis)\b/,
];

const ELSEWHERE = [
  /\b(uk|united\s+kingdom|england|scotland|wales|ireland|canada|india|germany|france|spain|italy|portugal|netherlands|belgium|poland|romania|bulgaria|czech|hungary|switzerland|austria|sweden|norway|denmark|finland|israel|singapore|australia|new\s+zealand|japan|china|hong\s+kong|taiwan|korea|vietnam|thailand|philippines|malaysia|indonesia|brazil|argentina|chile|colombia|peru|mexico|emirates|uae|qatar|saudi|egypt|nigeria|kenya|south\s+africa|turkey|ukraine|serbia|croatia|greece|iceland|luxembourg|estonia|lithuania|latvia)\b/,
  /\b(london|manchester|edinburgh|dublin|cork|toronto|vancouver|montreal|ottawa|waterloo|bengaluru|bangalore|hyderabad|pune|chennai|mumbai|gurgaon|gurugram|noida|kolkata|ahmedabad|berlin|munich|hamburg|frankfurt|paris|lyon|madrid|barcelona|valencia|milan|rome|lisbon|porto|amsterdam|rotterdam|brussels|warsaw|krakow|wroclaw|prague|budapest|bucharest|sofia|zurich|geneva|vienna|stockholm|gothenburg|oslo|copenhagen|helsinki|tel\s+aviv|haifa|herzliya|sydney|melbourne|brisbane|auckland|tokyo|osaka|shanghai|beijing|shenzhen|guangzhou|hangzhou|seoul|taipei|singapore|kuala\s+lumpur|jakarta|manila|bangkok|ho\s+chi\s+minh|hanoi|sao\s+paulo|são\s+paulo|buenos\s+aires|bogota|bogotá|santiago|lima|mexico\s+city|guadalajara|dubai|abu\s+dhabi|doha|riyadh|cairo|lagos|nairobi|johannesburg|cape\s+town|istanbul|kyiv|belgrade|zagreb|athens|reykjavik|tallinn|vilnius|riga)\b/,
];

export function readLocation(location: string | null | undefined): LocationRead {
  if (!location) return "unknown";
  const text = location.toLowerCase();
  if (!text.trim()) return "unknown";

  // US first: a posting open in two countries, one of them this one, is one the owner
  // can take. Their spreadsheet's rule, adopted rather than re-derived.
  if (US.some((p) => p.test(text))) return "us";
  if (ELSEWHERE.some((p) => p.test(text))) return "elsewhere";

  // `2 Locations`, `Multiple Locations`, `Remote`, a bare city nobody listed. Not a
  // failure to be fixed by guessing — the caller marks these and the reader decides.
  return "unknown";
}
