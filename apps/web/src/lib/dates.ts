/**
 * Parses a Postgres `date` (`YYYY-MM-DD`) as a local calendar date.
 * `new Date("2026-09-01")` is UTC midnight, which shows as Aug 31 west of UTC.
 */
export function localDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

/** Today's calendar date (`YYYY-MM-DD`) in an IANA time zone — the school's "today", not the browser's. */
export function todayIn(timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat("en-CA").format(new Date());
  }
}

/** First and last day (`YYYY-MM-DD`) of a `YYYY-MM` month. */
export function monthRange(month: string): { from: string; to: string } {
  const [year = 1970, m = 1] = month.split("-").map(Number);
  const lastDay = new Date(year, m, 0).getDate();
  const mm = String(m).padStart(2, "0");
  return { from: `${year}-${mm}-01`, to: `${year}-${mm}-${String(lastDay).padStart(2, "0")}` };
}

/** ISO timestamp → `YYYY-MM-DDTHH:MM` in the browser's zone (the value of `<input type="datetime-local">`). */
export function toDateTimeInput(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** `<input type="datetime-local">` value (browser zone) → ISO timestamp. */
export function fromDateTimeInput(value: string): string {
  return new Date(value).toISOString();
}
