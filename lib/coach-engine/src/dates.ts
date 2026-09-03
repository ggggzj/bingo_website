/**
 * Calendar math on ISO "YYYY-MM-DD" strings, done in UTC so a plan built at
 * 23:59 local never lands on the wrong day. The engine never reads the
 * clock — callers pass "today" in.
 */
const MS_PER_DAY = 86_400_000;

export function toEpochDay(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / MS_PER_DAY;
}

export function fromEpochDay(day: number): string {
  return new Date(day * MS_PER_DAY).toISOString().slice(0, 10);
}

export function shiftDate(iso: string, days: number): string {
  return fromEpochDay(toEpochDay(iso) + days);
}

/** days from b to a — positive when a is later, like Python's (a - b).days */
export function daysBetween(a: string, b: string): number {
  return toEpochDay(a) - toEpochDay(b);
}
