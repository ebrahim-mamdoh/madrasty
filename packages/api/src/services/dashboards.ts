import type {
  AdminDashboard,
  ExamStatus,
  TeacherDashboard,
  TeacherMonitoringRow,
} from "@madrasty/core";
import type { TypedSupabaseClient } from "../client";
import { unwrap } from "../errors";

type Raw = Record<string, unknown>;
const num = (value: unknown) => Number(value ?? 0);
const list = (value: unknown): Raw[] => (Array.isArray(value) ? (value as Raw[]) : []);
const clock = (value: unknown) => String(value ?? "").slice(0, 5);

/** Home pages and monitoring: each is one RPC so a dashboard costs a single round trip. */
export function createDashboardsService(client: TypedSupabaseClient) {
  return {
    async admin(): Promise<AdminDashboard> {
      const raw = unwrap(await client.rpc("admin_dashboard")) as Raw;
      const attendance = (raw.attendance ?? {}) as Raw;
      return {
        students: num(raw.students),
        teachers: num(raw.teachers),
        classes: num(raw.classes),
        attendance: {
          present: num(attendance.present),
          absent: num(attendance.absent),
          late: num(attendance.late),
          excused: num(attendance.excused),
          classesRecorded: num(attendance.classes_recorded),
        },
        isStudyDay: raw.is_study_day === true,
        examsPending: num(raw.exams_pending),
        examsUpcoming: num(raw.exams_upcoming),
        homeworkDue: num(raw.homework_due),
        reportsSent: num(raw.reports_sent),
      };
    },

    async teacher(): Promise<TeacherDashboard> {
      const raw = unwrap(await client.rpc("teacher_dashboard")) as Raw;
      return {
        lessonsToday: list(raw.lessons_today).map((l) => ({
          period: num(l.period),
          startsAt: clock(l.starts_at),
          endsAt: clock(l.ends_at),
          className: String(l.class ?? ""),
          subjectName: String(l.subject ?? ""),
        })),
        attendancePending: list(raw.attendance_pending).map((c) => ({
          classId: String(c.class_id),
          className: String(c.class ?? ""),
        })),
        toGrade: num(raw.to_grade),
        upcomingExams: list(raw.upcoming_exams).map((e) => ({
          id: String(e.id),
          title: String(e.title ?? ""),
          startsAt: String(e.starts_at ?? ""),
          status: e.status as ExamStatus,
          className: String(e.class ?? ""),
        })),
        examsToPublish: num(raw.exams_to_publish),
      };
    },

    async monitoring(): Promise<TeacherMonitoringRow[]> {
      const rows = unwrap(await client.rpc("teacher_monitoring"));
      return rows.map((row) => ({
        teacherId: row.teacher_id,
        fullName: row.full_name,
        classes: row.classes,
        attendanceDays: row.attendance_days,
        lastAttendanceAt: row.last_attendance_at,
        ungraded: row.ungraded,
        examsUnpublished: row.exams_unpublished,
        reportsPending: row.reports_pending,
      }));
    },
  };
}

export type DashboardsService = ReturnType<typeof createDashboardsService>;
