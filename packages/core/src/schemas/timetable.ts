import { z } from "zod";

/** Weekdays as JS Date#getDay numbers: 0 = Sunday … 6 = Saturday. */
export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const MAX_PERIODS = 20;

/** `HH:MM` (24h), the format of `<input type="time">`. */
const clockTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "validation.time");

export const periodSchema = z
  .object({
    number: z.coerce
      .number<string | number>()
      .int("validation.period_number")
      .min(1, "validation.period_number")
      .max(MAX_PERIODS, "validation.period_number"),
    startsAt: clockTime,
    endsAt: clockTime,
  })
  .refine((v) => v.endsAt > v.startsAt, {
    message: "validation.end_after_start_time",
    path: ["endsAt"],
  });

export type PeriodInput = z.output<typeof periodSchema>;
export type PeriodFormValues = z.input<typeof periodSchema>;

export const studyDaysSchema = z
  .array(z.number().int().min(0).max(6))
  .min(1, "validation.study_days");

export const timetableSlotSchema = z.object({
  classId: z.uuid(),
  weekday: z.number().int().min(0).max(6),
  periodId: z.uuid(),
});

export type TimetableSlot = z.infer<typeof timetableSlotSchema>;

/**
 * Orders study days the way the school's week runs: it starts right after the longest break.
 * Sun–Thu → [0,1,2,3,4]; Sat–Thu → [6,0,1,2,3,4]; Mon–Fri → [1,2,3,4,5].
 */
export function orderStudyDays(days: readonly number[]): number[] {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  if (sorted.length < 2) return sorted;
  let start = 0;
  let longestGap = -1;
  sorted.forEach((day, i) => {
    const next = sorted[(i + 1) % sorted.length]!;
    const gap = (next - day + 7) % 7;
    if (gap > longestGap) {
      longestGap = gap;
      start = (i + 1) % sorted.length;
    }
  });
  return [...sorted.slice(start), ...sorted.slice(0, start)];
}
