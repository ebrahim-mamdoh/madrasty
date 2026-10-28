/**
 * Parses a Postgres `date` (`YYYY-MM-DD`) as a local calendar date.
 * `new Date("2026-09-01")` is UTC midnight, which shows as Aug 31 west of UTC.
 */
export function localDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}
