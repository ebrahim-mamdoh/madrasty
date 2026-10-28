import { z } from "zod";

export const REPORT_CRITERIA = ["participation", "behavior", "homework", "discipline"] as const;
export type ReportCriterion = (typeof REPORT_CRITERIA)[number];

export const REPORT_STATUSES = ["draft", "sent"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

/** Unrated criteria are simply left out (the DB accepts 1–5 for the known keys). */
export const reportSchema = z.object({
  ratings: z.partialRecord(z.enum(REPORT_CRITERIA), z.number().int().min(1).max(5)),
  academicNote: z.string().trim().max(2000, "validation.text_max"),
  behaviorNote: z.string().trim().max(2000, "validation.text_max"),
});

export type ReportInput = z.infer<typeof reportSchema>;

/** `YYYY-MM` → the stored month (`YYYY-MM-01`). */
export function monthStart(month: string): string {
  return `${month.slice(0, 7)}-01`;
}
