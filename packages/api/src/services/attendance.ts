import {
  type AttendanceDay,
  type AttendanceRecord,
  type AttendanceSummaryRow,
  type SaveAttendanceInput,
} from "@madrasty/core";
import type { TypedSupabaseClient } from "../client";
import { unwrap } from "../errors";

/**
 * Daily attendance per class. RLS decides who may read (managers with attendance.view, the class's
 * teachers, the student, their parents) and write (attendance.record any past day, the class's
 * teachers today only); the DB refuses future dates (MD004) and students outside the class (MD003).
 * Marking a student absent notifies their parents (DB trigger).
 */
export function createAttendanceService(client: TypedSupabaseClient) {
  return {
    /** The class's students for `date`, with what was recorded so far. */
    async getDay(classId: string, date: string): Promise<AttendanceDay> {
      const [students, records] = await Promise.all([
        client
          .from("student_enrollments")
          .select("student:profiles!student_enrollments_student_id_school_id_fkey(id, full_name)")
          .eq("class_id", classId)
          .then(unwrap),
        client
          .from("attendance_records")
          .select("student_id, status, note, updated_at")
          .eq("class_id", classId)
          .eq("date", date)
          .then(unwrap),
      ]);

      const byStudent = new Map(records.map((record) => [record.student_id, record]));
      const entries = students
        .map(({ student }) => {
          const record = byStudent.get(student.id);
          return {
            studentId: student.id,
            fullName: student.full_name,
            status: record?.status ?? null,
            note: record?.note ?? "",
          };
        })
        .sort((a, b) => a.fullName.localeCompare(b.fullName, "ar"));

      const lastRecordedAt = records.reduce<string | null>(
        (latest, record) => (!latest || record.updated_at > latest ? record.updated_at : latest),
        null,
      );
      return { entries, lastRecordedAt };
    },

    /** Saves the whole sheet in one statement (all rows or none). */
    async saveDay(schoolId: string, input: SaveAttendanceInput): Promise<void> {
      unwrap(
        await client.from("attendance_records").upsert(
          input.entries.map((entry) => ({
            school_id: schoolId,
            class_id: input.classId,
            date: input.date,
            student_id: entry.studentId,
            status: entry.status,
            note: entry.note || null,
          })),
          { onConflict: "student_id,date" },
        ),
      );
    },

    /** Per-student counts for a class between two dates (inclusive). */
    async summary(classId: string, from: string, to: string): Promise<AttendanceSummaryRow[]> {
      const rows = unwrap(
        await client.rpc("attendance_summary", { p_class_id: classId, p_from: from, p_to: to }),
      );
      return rows.map((row) => ({
        studentId: row.student_id,
        fullName: row.full_name,
        present: row.present,
        absent: row.absent,
        late: row.late,
        excused: row.excused,
      }));
    },

    /** One student's history between two dates, newest first. */
    async listStudentRecords(studentId: string, from: string, to: string): Promise<AttendanceRecord[]> {
      const rows = unwrap(
        await client
          .from("attendance_records")
          .select("id, date, status, note, class:classes!attendance_records_class_fkey(name)")
          .eq("student_id", studentId)
          .gte("date", from)
          .lte("date", to)
          .order("date", { ascending: false }),
      );
      return rows.map((row) => ({
        id: row.id,
        date: row.date,
        status: row.status,
        note: row.note,
        className: row.class.name,
      }));
    },
  };
}

export type AttendanceService = ReturnType<typeof createAttendanceService>;
