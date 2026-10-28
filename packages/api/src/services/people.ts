import {
  AppError,
  pageRange,
  toPaginated,
  type ManagedPersonRole,
  type PageParams,
  type Paginated,
  type PersonListItem,
  type PersonOption,
  type PersonRef,
  type UpdatePersonInput,
} from "@madrasty/core";
import type { TypedSupabaseClient } from "../client";
import { unwrap } from "../errors";

export type PeopleListParams = PageParams & {
  search?: string;
  /** Students only: restrict to one class (of `academicYearId`). */
  classId?: string;
  /** Students only: which year's class to show; usually the current year. */
  academicYearId?: string;
};

type LinkedPerson = { id: string; full_name: string } | null;

/** Escapes LIKE wildcards so user input is matched literally. */
function likePattern(value: string): string {
  return `%${value.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

function toLinks(rows: { person: LinkedPerson }[] | null | undefined) {
  return (rows ?? [])
    .map((row) => row.person)
    .filter((person): person is NonNullable<LinkedPerson> => person !== null)
    .map((person) => ({ id: person.id, fullName: person.full_name }));
}

const BASE_COLUMNS = "id, full_name, email, phone, is_active, created_at";

export function createPeopleService(client: TypedSupabaseClient) {
  return {
    /** One page of a school's teachers / students / parents. RLS scopes it to the caller's school. */
    async list(
      role: ManagedPersonRole,
      params: PeopleListParams,
    ): Promise<Paginated<PersonListItem>> {
      const { from, to } = pageRange(params);
      const search = params.search?.trim();

      if (role === "student") {
        const enrollmentJoin = params.classId ? "!inner" : "";
        let query = client
          .from("profiles")
          .select(
            `${BASE_COLUMNS},
             enrollments:student_enrollments!student_enrollments_student_id_school_id_fkey${enrollmentJoin}(
               academic_year_id,
               class:classes!student_enrollments_class_id_school_id_fkey(id, name)
             ),
             parents:parent_students!parent_students_student_id_school_id_fkey(
               person:profiles!parent_students_parent_id_school_id_fkey(id, full_name)
             )`,
            { count: "exact" },
          )
          .eq("role", "student");

        if (params.academicYearId) {
          query = query.eq("enrollments.academic_year_id", params.academicYearId);
        }
        if (params.classId) query = query.eq("enrollments.class_id", params.classId);
        if (search) query = query.ilike("full_name", likePattern(search));

        const { data, count, error } = await query.order("full_name").range(from, to);
        const rows = unwrap({ data, error });
        return toPaginated(
          rows.map((row) => ({
            id: row.id,
            fullName: row.full_name,
            email: row.email,
            phone: row.phone,
            isActive: row.is_active,
            createdAt: row.created_at,
            currentClass: row.enrollments[0]?.class ?? null,
            links: toLinks(row.parents),
          })),
          count ?? 0,
          params,
        );
      }

      if (role === "parent") {
        let query = client
          .from("profiles")
          .select(
            `${BASE_COLUMNS},
             children:parent_students!parent_students_parent_id_school_id_fkey(
               person:profiles!parent_students_student_id_school_id_fkey(id, full_name)
             )`,
            { count: "exact" },
          )
          .eq("role", "parent");
        if (search) query = query.ilike("full_name", likePattern(search));

        const { data, count, error } = await query.order("full_name").range(from, to);
        const rows = unwrap({ data, error });
        return toPaginated(
          rows.map((row) => ({
            id: row.id,
            fullName: row.full_name,
            email: row.email,
            phone: row.phone,
            isActive: row.is_active,
            createdAt: row.created_at,
            links: toLinks(row.children),
          })),
          count ?? 0,
          params,
        );
      }

      let query = client.from("profiles").select(BASE_COLUMNS, { count: "exact" }).eq("role", role);
      if (search) query = query.ilike("full_name", likePattern(search));

      const { data, count, error } = await query.order("full_name").range(from, to);
      const rows = unwrap({ data, error });
      return toPaginated(
        rows.map((row) => ({
          id: row.id,
          fullName: row.full_name,
          email: row.email,
          phone: row.phone,
          isActive: row.is_active,
          createdAt: row.created_at,
        })),
        count ?? 0,
        params,
      );
    },

    /** Someone the caller can see (null otherwise). Server actions use it to authorize targets. */
    async getRef(id: string): Promise<PersonRef | null> {
      const { data, error } = await client
        .from("profiles")
        .select("id, school_id, role, full_name, is_active")
        .eq("id", id)
        .maybeSingle();
      const row = unwrap({ data, error });
      return row
        ? {
            id: row.id,
            schoolId: row.school_id,
            role: row.role,
            fullName: row.full_name,
            isActive: row.is_active,
          }
        : null;
    },

    async update(id: string, input: UpdatePersonInput): Promise<void> {
      const rows = unwrap(
        await client
          .from("profiles")
          .update({ full_name: input.fullName, phone: input.phone || null })
          .eq("id", id)
          .select("id"),
      );
      if (rows.length === 0) throw new AppError("not_found");
    },

    /** Places a student in a class for a year (or removes the placement when `classId` is null). */
    async setStudentClass(
      schoolId: string,
      studentId: string,
      academicYearId: string,
      classId: string | null,
    ): Promise<void> {
      if (!classId) {
        unwrap(
          await client
            .from("student_enrollments")
            .delete()
            .eq("student_id", studentId)
            .eq("academic_year_id", academicYearId),
        );
        return;
      }
      unwrap(
        await client.from("student_enrollments").upsert(
          {
            school_id: schoolId,
            student_id: studentId,
            class_id: classId,
            academic_year_id: academicYearId,
          },
          { onConflict: "student_id,academic_year_id" },
        ),
      );
    },

    /** Makes a parent's linked children exactly `studentIds` (adds and removes links as needed). */
    async setParentChildren(
      schoolId: string,
      parentId: string,
      studentIds: string[],
    ): Promise<void> {
      const current = unwrap(
        await client.from("parent_students").select("student_id").eq("parent_id", parentId),
      ).map((row) => row.student_id);

      const wanted = new Set(studentIds);
      const toRemove = current.filter((id) => !wanted.has(id));
      const toAdd = studentIds.filter((id) => !current.includes(id));

      if (toRemove.length > 0) {
        unwrap(
          await client
            .from("parent_students")
            .delete()
            .eq("parent_id", parentId)
            .in("student_id", toRemove),
        );
      }
      if (toAdd.length > 0) {
        unwrap(
          await client.from("parent_students").insert(
            toAdd.map((studentId) => ({
              school_id: schoolId,
              parent_id: parentId,
              student_id: studentId,
            })),
          ),
        );
      }
    },

    async listChildIds(parentId: string): Promise<string[]> {
      return unwrap(
        await client.from("parent_students").select("student_id").eq("parent_id", parentId),
      ).map((row) => row.student_id);
    },

    /** Students for pickers, with their current class as a hint. */
    async listStudentOptions(academicYearId?: string): Promise<PersonOption[]> {
      let query = client
        .from("profiles")
        .select(
          `id, full_name,
           enrollments:student_enrollments!student_enrollments_student_id_school_id_fkey(
             academic_year_id,
             class:classes!student_enrollments_class_id_school_id_fkey(name)
           )`,
        )
        .eq("role", "student")
        .eq("is_active", true);
      if (academicYearId) query = query.eq("enrollments.academic_year_id", academicYearId);

      const rows = unwrap(await query.order("full_name"));
      return rows.map((row) => ({
        id: row.id,
        fullName: row.full_name,
        detail: row.enrollments[0]?.class?.name,
      }));
    },
  };
}

export type PeopleService = ReturnType<typeof createPeopleService>;
