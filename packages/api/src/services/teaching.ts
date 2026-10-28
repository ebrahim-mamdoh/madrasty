import type { TeacherClass } from "@madrasty/core";
import type { TypedSupabaseClient } from "../client";
import { unwrap } from "../errors";

function countOf(rows: { count: number }[] | null | undefined): number {
  return rows?.[0]?.count ?? 0;
}

/** Data for the teacher workspace. RLS limits every query to what the teacher may see. */
export function createTeachingService(client: TypedSupabaseClient) {
  return {
    /**
     * Classes the teacher teaches (any subject) or is homeroom teacher of, in the current year,
     * with the subjects they teach in each.
     */
    async listMyClasses(teacherId: string): Promise<TeacherClass[]> {
      const year = unwrap(
        await client.from("academic_years").select("id").eq("is_current", true).maybeSingle(),
      );
      if (!year) return [];

      const classColumns = `id, name, academic_year_id,
        grade_level:grade_levels(name, sort_order),
        student_enrollments!student_enrollments_class_id_school_id_fkey(count)`;

      const [assignments, homerooms] = await Promise.all([
        client
          .from("class_subjects")
          .select(`subject:subjects(name), class:classes!inner(${classColumns})`)
          .eq("teacher_id", teacherId)
          .eq("class.academic_year_id", year.id)
          .then(unwrap),
        client
          .from("classes")
          .select(classColumns)
          .eq("homeroom_teacher_id", teacherId)
          .eq("academic_year_id", year.id)
          .then(unwrap),
      ]);

      type ClassRow = (typeof homerooms)[number];
      const byClass = new Map<string, TeacherClass & { sortKey: number }>();
      const entryFor = (row: ClassRow) => {
        let entry = byClass.get(row.id);
        if (!entry) {
          entry = {
            id: row.id,
            name: row.name,
            gradeLevelName: row.grade_level.name,
            studentsCount: countOf(row.student_enrollments),
            subjects: [],
            isHomeroom: false,
            sortKey: row.grade_level.sort_order,
          };
          byClass.set(row.id, entry);
        }
        return entry;
      };

      for (const assignment of assignments) {
        entryFor(assignment.class).subjects.push(assignment.subject.name);
      }
      for (const homeroom of homerooms) entryFor(homeroom).isHomeroom = true;

      return [...byClass.values()]
        .sort((a, b) => a.sortKey - b.sortKey || a.name.localeCompare(b.name, "ar"))
        .map(({ sortKey: _sortKey, ...teacherClass }) => ({
          ...teacherClass,
          subjects: teacherClass.subjects.sort((a, b) => a.localeCompare(b, "ar")),
        }));
    },
  };
}

export type TeachingService = ReturnType<typeof createTeachingService>;
