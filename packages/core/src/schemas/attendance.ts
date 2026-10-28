import { z } from "zod";

export const ATTENDANCE_STATUSES = ["present", "absent", "late", "excused"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const attendanceEntrySchema = z.object({
  studentId: z.uuid(),
  status: z.enum(ATTENDANCE_STATUSES),
  note: z.string().trim().max(200, "validation.note_max"),
});

export type AttendanceEntryInput = z.infer<typeof attendanceEntrySchema>;

/** One class, one day: every student's status (the roster is saved as a whole). */
export const saveAttendanceSchema = z.object({
  classId: z.uuid(),
  date: z.iso.date("validation.date"),
  entries: z.array(attendanceEntrySchema).min(1),
});

export type SaveAttendanceInput = z.infer<typeof saveAttendanceSchema>;

export type AttendanceCounts = Record<AttendanceStatus, number>;

/** Present + late over every recorded day, as a whole percentage (null before any record). */
export function attendanceRate(counts: AttendanceCounts): number | null {
  const total = counts.present + counts.absent + counts.late + counts.excused;
  if (total === 0) return null;
  return Math.round(((counts.present + counts.late) / total) * 100);
}
