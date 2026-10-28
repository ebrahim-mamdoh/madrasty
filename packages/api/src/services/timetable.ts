import {
  AppError,
  type Period,
  type PeriodInput,
  type StudentSubject,
  type TimetableEntry,
  type TimetableSlot,
} from "@madrasty/core";
import type { TypedSupabaseClient } from "../client";
import { toAppError, unwrap } from "../errors";

const ENTRY_COLUMNS = `id, weekday, period_id, class_subject_id,
  class_subject:class_subjects!inner(teacher_id,
    subject:subjects(id, name),
    class:classes!inner(id, name, academic_year_id))`;

/** Postgres `time` comes back as `HH:MM:SS`; the app works in `HH:MM`. */
const toClock = (time: string) => time.slice(0, 5);

function numberTaken(error: unknown): AppError {
  const appError = toAppError(error);
  return appError.code === "conflict" && appError.message === "errors.conflict"
    ? new AppError("conflict", "errors.period_number_taken", {
        number: "errors.period_number_taken",
      })
    : appError;
}

/**
 * Periods, study days and weekly timetables. Everyone in the school may read them;
 * RLS requires structure.manage for every write, and the DB refuses teacher clashes (MD001)
 * and overlapping periods (MD002).
 */
export function createTimetableService(client: TypedSupabaseClient) {
  /** Teacher names through `class_teachers`, which students and parents may call too. */
  async function teacherNames(classIds: string[]): Promise<Map<string, string>> {
    const lists = await Promise.all(
      [...new Set(classIds)].map((id) =>
        client.rpc("class_teachers", { p_class_id: id }).then(unwrap),
      ),
    );
    return new Map(lists.flat().map((t) => [t.id, t.full_name]));
  }

  async function listEntries(
    filter: (query: ReturnType<typeof baseQuery>) => ReturnType<typeof baseQuery>,
  ): Promise<TimetableEntry[]> {
    const rows = unwrap(await filter(baseQuery()));
    const names = await teacherNames(rows.map((row) => row.class_subject.class.id));
    return rows.map((row) => {
      const teacherId = row.class_subject.teacher_id;
      return {
        id: row.id,
        weekday: row.weekday,
        periodId: row.period_id,
        classSubjectId: row.class_subject_id,
        class: { id: row.class_subject.class.id, name: row.class_subject.class.name },
        subject: row.class_subject.subject,
        teacher: teacherId ? { id: teacherId, fullName: names.get(teacherId) ?? "" } : null,
      };
    });
  }

  function baseQuery() {
    return client.from("timetable_entries").select(ENTRY_COLUMNS);
  }

  async function currentYearId(): Promise<string | null> {
    const year = unwrap(
      await client.from("academic_years").select("id").eq("is_current", true).maybeSingle(),
    );
    return year?.id ?? null;
  }

  return {
    async listPeriods(): Promise<Period[]> {
      const rows = unwrap(
        await client.from("periods").select("id, number, starts_at, ends_at").order("number"),
      );
      return rows.map((row) => ({
        id: row.id,
        number: row.number,
        startsAt: toClock(row.starts_at),
        endsAt: toClock(row.ends_at),
      }));
    },

    async createPeriod(schoolId: string, input: PeriodInput): Promise<void> {
      try {
        unwrap(
          await client.from("periods").insert({
            school_id: schoolId,
            number: input.number,
            starts_at: input.startsAt,
            ends_at: input.endsAt,
          }),
        );
      } catch (error) {
        throw numberTaken(error);
      }
    },

    async updatePeriod(id: string, input: PeriodInput): Promise<void> {
      try {
        const rows = unwrap(
          await client
            .from("periods")
            .update({ number: input.number, starts_at: input.startsAt, ends_at: input.endsAt })
            .eq("id", id)
            .select("id"),
        );
        if (rows.length === 0) throw new AppError("not_found");
      } catch (error) {
        throw numberTaken(error);
      }
    },

    /** Refused with errors.in_use while the period is still scheduled. */
    async deletePeriod(id: string): Promise<void> {
      const rows = unwrap(await client.from("periods").delete().eq("id", id).select("id"));
      if (rows.length === 0) throw new AppError("not_found");
    },

    async setStudyDays(days: number[]): Promise<void> {
      unwrap(await client.rpc("set_school_study_days", { p_days: days }));
    },

    listClassEntries(classId: string): Promise<TimetableEntry[]> {
      return listEntries((query) => query.eq("class_id", classId));
    },

    /** The teacher's week in the current academic year, across all their classes. */
    async listTeacherEntries(teacherId: string): Promise<TimetableEntry[]> {
      const yearId = await currentYearId();
      if (!yearId) return [];
      return listEntries((query) =>
        query
          .eq("class_subject.teacher_id", teacherId)
          .eq("class_subject.class.academic_year_id", yearId),
      );
    },

    /** Puts `classSubjectId` in the slot, replacing whatever was there. */
    async setSlot(schoolId: string, slot: TimetableSlot, classSubjectId: string): Promise<void> {
      unwrap(
        await client.from("timetable_entries").upsert(
          {
            school_id: schoolId,
            class_id: slot.classId,
            weekday: slot.weekday,
            period_id: slot.periodId,
            class_subject_id: classSubjectId,
          },
          { onConflict: "class_id,weekday,period_id" },
        ),
      );
    },

    async clearSlot(slot: TimetableSlot): Promise<void> {
      unwrap(
        await client
          .from("timetable_entries")
          .delete()
          .eq("class_id", slot.classId)
          .eq("weekday", slot.weekday)
          .eq("period_id", slot.periodId),
      );
    },

    /** The student's class in the current academic year (null when not placed). */
    async getStudentClass(studentId: string): Promise<{ id: string; name: string } | null> {
      const yearId = await currentYearId();
      if (!yearId) return null;
      const row = unwrap(
        await client
          .from("student_enrollments")
          .select("class:classes!student_enrollments_class_id_school_id_fkey(id, name)")
          .eq("student_id", studentId)
          .eq("academic_year_id", yearId)
          .maybeSingle(),
      );
      return row?.class ?? null;
    },

    /** Subjects of a class with their teachers (for the student's "My subjects"). */
    async listClassSubjectsWithTeachers(classId: string): Promise<StudentSubject[]> {
      const [rows, names] = await Promise.all([
        client
          .from("class_subjects")
          .select("id, teacher_id, subject:subjects(name, code)")
          .eq("class_id", classId)
          .then(unwrap),
        teacherNames([classId]),
      ]);
      return rows
        .map((row) => ({
          id: row.id,
          subjectName: row.subject.name,
          subjectCode: row.subject.code,
          teacherName: row.teacher_id ? (names.get(row.teacher_id) ?? null) : null,
        }))
        .sort((a, b) => a.subjectName.localeCompare(b.subjectName, "ar"));
    },
  };
}

export type TimetableService = ReturnType<typeof createTimetableService>;
