import {
  REPORT_CRITERIA,
  type MonthlyReport,
  type ReportCriterion,
  type ReportInput,
  type ReportRosterEntry,
} from "@madrasty/core";
import type { Json } from "../database.types";
import type { TypedSupabaseClient } from "../client";
import { unwrap } from "../errors";

const REPORT_COLUMNS =
  "id, student_id, class_id, month, ratings, academic_note, behavior_note, status, sent_at";

function toRatings(value: Json): Partial<Record<ReportCriterion, number>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    REPORT_CRITERIA.flatMap((key) => {
      const rating = (value as Record<string, Json>)[key];
      return typeof rating === "number" ? [[key, rating]] : [];
    }),
  );
}

type ReportRow = {
  id: string;
  student_id: string;
  class_id: string;
  month: string;
  ratings: Json;
  academic_note: string;
  behavior_note: string;
  status: MonthlyReport["status"];
  sent_at: string | null;
};

function toReport(row: ReportRow): MonthlyReport {
  return {
    id: row.id,
    studentId: row.student_id,
    classId: row.class_id,
    month: row.month,
    ratings: toRatings(row.ratings),
    academicNote: row.academic_note,
    behaviorNote: row.behavior_note,
    status: row.status,
    sentAt: row.sent_at,
  };
}

/**
 * Monthly reports. Class teachers (and reports.send holders) write drafts; sending is one RPC
 * that locks the reports and notifies students and parents, who only ever see sent reports.
 */
export function createReportsService(client: TypedSupabaseClient) {
  return {
    /** Every student of the class with their report for `month` (`YYYY-MM-01`). */
    async getSheet(classId: string, month: string): Promise<ReportRosterEntry[]> {
      const [students, reports] = await Promise.all([
        client
          .from("student_enrollments")
          .select("student:profiles!student_enrollments_student_id_school_id_fkey(id, full_name)")
          .eq("class_id", classId)
          .then(unwrap),
        client
          .from("monthly_reports")
          .select(REPORT_COLUMNS)
          .eq("class_id", classId)
          .eq("month", month)
          .then(unwrap),
      ]);
      const byStudent = new Map(reports.map((r) => [r.student_id, toReport(r)]));
      return students
        .map(({ student }) => ({
          studentId: student.id,
          fullName: student.full_name,
          report: byStudent.get(student.id) ?? null,
        }))
        .sort((a, b) => a.fullName.localeCompare(b.fullName, "ar"));
    },

    /** Creates or edits the draft for one student and month. */
    async save(
      schoolId: string,
      classId: string,
      studentId: string,
      month: string,
      input: ReportInput,
    ): Promise<void> {
      unwrap(
        await client.from("monthly_reports").upsert(
          {
            school_id: schoolId,
            class_id: classId,
            student_id: studentId,
            month,
            ratings: input.ratings,
            academic_note: input.academicNote,
            behavior_note: input.behaviorNote,
          },
          { onConflict: "student_id,month" },
        ),
      );
    },

    /** Sends drafts to parents; returns how many were sent. */
    async send(ids: string[]): Promise<number> {
      if (ids.length === 0) return 0;
      return unwrap(await client.rpc("send_monthly_reports", { p_ids: ids }));
    },

    /** A student's sent reports (student / parent view), newest first. */
    async listForStudent(studentId: string): Promise<MonthlyReport[]> {
      const rows = unwrap(
        await client
          .from("monthly_reports")
          .select(REPORT_COLUMNS)
          .eq("student_id", studentId)
          .eq("status", "sent")
          .order("month", { ascending: false }),
      );
      return rows.map(toReport);
    },
  };
}

export type ReportsService = ReturnType<typeof createReportsService>;
