import {
  AppError,
  type AcademicYear,
  type AcademicYearInput,
  type ClassSubject,
  type GradeLevel,
  type GradeLevelInput,
  type PersonOption,
  type SchoolClass,
  type SchoolClassInput,
  type Subject,
  type SubjectInput,
} from "@madrasty/core";
import type { TypedSupabaseClient } from "../client";
import { toAppError, unwrap } from "../errors";

/** PostgREST returns embedded `(count)` aggregates as `[{ count }]`. */
function countOf(rows: { count: number }[] | null | undefined): number {
  return rows?.[0]?.count ?? 0;
}

/** Turns a unique-name collision into a field error the form can show on the name input. */
async function guardNameConflict<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    const appError = toAppError(error);
    if (appError.code === "conflict" && appError.message === "errors.conflict") {
      throw new AppError("conflict", "errors.name_taken", { name: "errors.name_taken" });
    }
    throw appError;
  }
}

/**
 * Writes return the affected ids: RLS hides rows silently, so "0 rows" must surface as an
 * error instead of a fake success.
 */
function expectAffected(rows: { id: string }[]): void {
  if (rows.length === 0) throw new AppError("not_found");
}

export function createStructureService(client: TypedSupabaseClient) {
  return {
    // ---------------------------------------------------------------- years
    async listAcademicYears(): Promise<AcademicYear[]> {
      const rows = unwrap(
        await client
          .from("academic_years")
          .select("id, name, starts_on, ends_on, is_current, classes(count)")
          .order("starts_on", { ascending: false }),
      );
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        startsOn: row.starts_on,
        endsOn: row.ends_on,
        isCurrent: row.is_current,
        classesCount: countOf(row.classes),
      }));
    },

    createAcademicYear(schoolId: string, input: AcademicYearInput): Promise<string> {
      return guardNameConflict(async () => {
        const { id } = unwrap(
          await client
            .from("academic_years")
            .insert({
              school_id: schoolId,
              name: input.name,
              starts_on: input.startsOn,
              ends_on: input.endsOn,
            })
            .select("id")
            .single(),
        );
        return id;
      });
    },

    updateAcademicYear(id: string, input: AcademicYearInput): Promise<void> {
      return guardNameConflict(async () => {
        expectAffected(
          unwrap(
            await client
              .from("academic_years")
              .update({ name: input.name, starts_on: input.startsOn, ends_on: input.endsOn })
              .eq("id", id)
              .select("id"),
          ),
        );
      });
    },

    async deleteAcademicYear(id: string): Promise<void> {
      expectAffected(
        unwrap(await client.from("academic_years").delete().eq("id", id).select("id")),
      );
    },

    async setCurrentAcademicYear(id: string): Promise<void> {
      unwrap(await client.rpc("set_current_academic_year", { p_year_id: id }));
    },

    // --------------------------------------------------------- grade levels
    async listGradeLevels(): Promise<GradeLevel[]> {
      const rows = unwrap(
        await client
          .from("grade_levels")
          .select("id, name, sort_order, classes(count)")
          .order("sort_order")
          .order("name"),
      );
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        sortOrder: row.sort_order,
        classesCount: countOf(row.classes),
      }));
    },

    createGradeLevel(schoolId: string, input: GradeLevelInput): Promise<string> {
      return guardNameConflict(async () => {
        const last = unwrap(
          await client
            .from("grade_levels")
            .select("sort_order")
            .order("sort_order", { ascending: false })
            .limit(1),
        );
        const { id } = unwrap(
          await client
            .from("grade_levels")
            .insert({
              school_id: schoolId,
              name: input.name,
              sort_order: (last[0]?.sort_order ?? -1) + 1,
            })
            .select("id")
            .single(),
        );
        return id;
      });
    },

    updateGradeLevel(id: string, input: GradeLevelInput): Promise<void> {
      return guardNameConflict(async () => {
        expectAffected(
          unwrap(
            await client
              .from("grade_levels")
              .update({ name: input.name })
              .eq("id", id)
              .select("id"),
          ),
        );
      });
    },

    async deleteGradeLevel(id: string): Promise<void> {
      expectAffected(unwrap(await client.from("grade_levels").delete().eq("id", id).select("id")));
    },

    /** Persists a new order: position in the array becomes `sort_order`. */
    async reorderGradeLevels(orderedIds: string[]): Promise<void> {
      const results = await Promise.all(
        orderedIds.map((id, index) =>
          client.from("grade_levels").update({ sort_order: index }).eq("id", id),
        ),
      );
      for (const result of results) unwrap(result);
    },

    // ------------------------------------------------------------- subjects
    async listSubjects(): Promise<Subject[]> {
      const rows = unwrap(await client.from("subjects").select("id, name, code").order("name"));
      return rows.map((row) => ({ id: row.id, name: row.name, code: row.code }));
    },

    createSubject(schoolId: string, input: SubjectInput): Promise<string> {
      return guardNameConflict(async () => {
        const { id } = unwrap(
          await client
            .from("subjects")
            .insert({ school_id: schoolId, name: input.name, code: input.code || null })
            .select("id")
            .single(),
        );
        return id;
      });
    },

    updateSubject(id: string, input: SubjectInput): Promise<void> {
      return guardNameConflict(async () => {
        expectAffected(
          unwrap(
            await client
              .from("subjects")
              .update({ name: input.name, code: input.code || null })
              .eq("id", id)
              .select("id"),
          ),
        );
      });
    },

    async deleteSubject(id: string): Promise<void> {
      expectAffected(unwrap(await client.from("subjects").delete().eq("id", id).select("id")));
    },

    // -------------------------------------------------------------- classes
    async listClasses(academicYearId: string): Promise<SchoolClass[]> {
      const rows = unwrap(
        await client
          .from("classes")
          .select(
            `id, name, academic_year_id,
             grade_level:grade_levels(id, name, sort_order),
             homeroom:profiles(id, full_name),
             student_enrollments!student_enrollments_class_id_school_id_fkey(count),
             class_subjects(count)`,
          )
          .eq("academic_year_id", academicYearId),
      );

      return rows
        .map((row) => ({
          id: row.id,
          name: row.name,
          academicYearId: row.academic_year_id,
          gradeLevel: { id: row.grade_level.id, name: row.grade_level.name },
          homeroomTeacher: row.homeroom
            ? { id: row.homeroom.id, fullName: row.homeroom.full_name }
            : null,
          studentsCount: countOf(row.student_enrollments),
          subjectsCount: countOf(row.class_subjects),
          sortKey: row.grade_level.sort_order,
        }))
        .sort((a, b) => a.sortKey - b.sortKey || a.name.localeCompare(b.name, "ar"))
        .map(({ sortKey: _sortKey, ...schoolClass }) => schoolClass);
    },

    createClass(schoolId: string, input: SchoolClassInput): Promise<string> {
      return guardNameConflict(async () => {
        const { id } = unwrap(
          await client
            .from("classes")
            .insert({
              school_id: schoolId,
              academic_year_id: input.academicYearId,
              grade_level_id: input.gradeLevelId,
              name: input.name,
              homeroom_teacher_id: input.homeroomTeacherId || null,
            })
            .select("id")
            .single(),
        );
        return id;
      });
    },

    updateClass(id: string, input: SchoolClassInput): Promise<void> {
      return guardNameConflict(async () => {
        expectAffected(
          unwrap(
            await client
              .from("classes")
              .update({
                grade_level_id: input.gradeLevelId,
                name: input.name,
                homeroom_teacher_id: input.homeroomTeacherId || null,
              })
              .eq("id", id)
              .select("id"),
          ),
        );
      });
    },

    // ----------------------------------------------------- class subjects
    /** Subjects taught in a class and who teaches each one. */
    async listClassSubjects(classId: string): Promise<ClassSubject[]> {
      const rows = unwrap(
        await client
          .from("class_subjects")
          .select("id, subject:subjects(id, name), teacher:profiles(id, full_name)")
          .eq("class_id", classId),
      );
      return rows
        .map((row) => ({
          id: row.id,
          subject: { id: row.subject.id, name: row.subject.name },
          teacher: row.teacher ? { id: row.teacher.id, fullName: row.teacher.full_name } : null,
        }))
        .sort((a, b) => a.subject.name.localeCompare(b.subject.name, "ar"));
    },

    async addClassSubjects(schoolId: string, classId: string, subjectIds: string[]): Promise<void> {
      if (subjectIds.length === 0) return;
      unwrap(
        await client.from("class_subjects").upsert(
          subjectIds.map((subjectId) => ({
            school_id: schoolId,
            class_id: classId,
            subject_id: subjectId,
          })),
          // Adding a subject the class already has is a no-op, not an error.
          { onConflict: "class_id,subject_id", ignoreDuplicates: true },
        ),
      );
    },

    async setClassSubjectTeacher(classSubjectId: string, teacherId: string | null): Promise<void> {
      expectAffected(
        unwrap(
          await client
            .from("class_subjects")
            .update({ teacher_id: teacherId })
            .eq("id", classSubjectId)
            .select("id"),
        ),
      );
    },

    async removeClassSubject(classSubjectId: string): Promise<void> {
      expectAffected(
        unwrap(await client.from("class_subjects").delete().eq("id", classSubjectId).select("id")),
      );
    },

    /** The academic year a class belongs to (enrollments are per year). */
    async getClassYearId(classId: string): Promise<string> {
      const { academic_year_id } = unwrap(
        await client.from("classes").select("academic_year_id").eq("id", classId).single(),
      );
      return academic_year_id;
    },

    async deleteClass(id: string): Promise<void> {
      expectAffected(unwrap(await client.from("classes").delete().eq("id", id).select("id")));
    },

    // --------------------------------------------------------------- people
    /** Active teachers of the caller's school, for pickers. RLS limits this to the school. */
    async listTeacherOptions(): Promise<PersonOption[]> {
      const rows = unwrap(
        await client
          .from("profiles")
          .select("id, full_name")
          .eq("role", "teacher")
          .eq("is_active", true)
          .order("full_name"),
      );
      return rows.map((row) => ({ id: row.id, fullName: row.full_name }));
    },
  };
}

export type StructureService = ReturnType<typeof createStructureService>;
